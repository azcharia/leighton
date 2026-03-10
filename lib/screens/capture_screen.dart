// lib/screens/capture_screen.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:convert';

// ─── Constants ────────────────────────────────────────────────────────────────
// Injected at build time — never commit a real key here.
// flutter run --dart-define=GROQ_API_KEY=gsk_...
const String _kGroqApiKey = String.fromEnvironment('GROQ_API_KEY');
const String _kStorageBucket = 'defect_images';

// ─── Capture Screen ───────────────────────────────────────────────────────────
class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen>
    with WidgetsBindingObserver {
  // Camera
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  XFile? _capturedImage;
  bool _isCameraReady = false;

  // Audio
  final AudioRecorder _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  String? _audioPath;

  // Workflow state
  _ScreenState _screenState = _ScreenState.viewfinder;
  String _statusMessage = '';

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraController?.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }
    if (state == AppLifecycleState.inactive) {
      _cameraController?.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  // ── Camera Setup ───────────────────────────────────────────────────────────
  Future<void> _initCamera() async {
    await Permission.camera.request();
    await Permission.microphone.request();

    _cameras = await availableCameras();
    if (_cameras.isEmpty) return;

    _cameraController = CameraController(
      _cameras.first,
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      if (mounted) setState(() => _isCameraReady = true);
    } catch (e) {
      _setStatus('Camera error: $e');
    }
  }

  // ── Pick from Gallery ────────────────────────────────────────────────────
  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (image == null) return;
    setState(() {
      _capturedImage = XFile(image.path);
      _screenState = _ScreenState.preview;
      _audioPath = null;
    });
  }

  // ── Take Photo ─────────────────────────────────────────────────────────────
  Future<void> _takePhoto() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }
    try {
      final image = await _cameraController!.takePicture();
      setState(() {
        _capturedImage = image;
        _screenState = _ScreenState.preview;
        _audioPath = null;
      });
    } catch (e) {
      _setStatus('Photo capture failed: $e');
    }
  }

  // ── Audio Recording ────────────────────────────────────────────────────────
  Future<void> _startRecording() async {
    final dir = await getTemporaryDirectory();
    final audioPath = p.join(dir.path, 'defect_note.m4a');

    if (await _audioRecorder.hasPermission()) {
      await _audioRecorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: audioPath,
      );
      setState(() {
        _isRecording = true;
        _audioPath = audioPath;
        _statusMessage = 'Recording... release to stop';
      });
    }
  }

  Future<void> _stopRecording() async {
    await _audioRecorder.stop();
    setState(() {
      _isRecording = false;
      _statusMessage = 'Voice note recorded ✓';
    });
  }

  // ── Groq Whisper Transcription ─────────────────────────────────────────────
  Future<String> _transcribeAudio(String audioFilePath) async {
    final audioFile = File(audioFilePath);
    if (!await audioFile.exists()) return '';

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.groq.com/openai/v1/audio/transcriptions'),
    );

    request.headers['Authorization'] = 'Bearer $_kGroqApiKey';
    request.fields['model'] = 'whisper-large-v3-turbo';
    request.fields['response_format'] = 'json';
    request.files.add(await http.MultipartFile.fromPath('file', audioFilePath));

    final streamedResponse = await request.send();
    final responseBody = await streamedResponse.stream.bytesToString();

    if (streamedResponse.statusCode != 200) {
      throw Exception(
        'Whisper API error ${streamedResponse.statusCode}: $responseBody',
      );
    }

    final json = jsonDecode(responseBody) as Map<String, dynamic>;
    return (json['text'] as String?) ?? '';
  }

  // ── Supabase Upload & Insert ───────────────────────────────────────────────
  Future<String> _uploadImage(File imageFile) async {
    final supabase = Supabase.instance.client;
    final fileName =
        '${DateTime.now().millisecondsSinceEpoch}_${p.basename(imageFile.path)}';
    final bytes = await imageFile.readAsBytes();

    await supabase.storage
        .from(_kStorageBucket)
        .uploadBinary(
          fileName,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg'),
        );

    return supabase.storage.from(_kStorageBucket).getPublicUrl(fileName);
  }

  Future<void> _submitDefect() async {
    if (_capturedImage == null) return;
    setState(() {
      _screenState = _ScreenState.processing;
    });

    try {
      // 1. Transcribe audio (if recorded)
      String transcript = '';
      if (_audioPath != null) {
        _setStatus('Transcribing voice note…');
        transcript = await _transcribeAudio(_audioPath!);
      }

      // 2. Upload image to Supabase Storage
      _setStatus('Uploading photo…');
      final imageUrl = await _uploadImage(File(_capturedImage!.path));

      // 3. Insert row into defects table
      _setStatus('Logging defect…');
      await Supabase.instance.client.from('defects').insert({
        'image_url': imageUrl,
        'audio_transcript':
            transcript.isNotEmpty
                ? transcript
                : 'No verbal description provided.',
        'status': 'Pending AI',
      });

      // 4. Done — the Edge Function picks it up from here
      if (mounted) {
        setState(() {
          _screenState = _ScreenState.success;
          _statusMessage = 'Defect submitted! AI is classifying…';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _screenState = _ScreenState.preview;
          _statusMessage = 'Error: $e';
        });
      }
    }
  }

  void _reset() {
    setState(() {
      _capturedImage = null;
      _audioPath = null;
      _screenState = _ScreenState.viewfinder;
      _statusMessage = '';
    });
  }

  void _setStatus(String msg) {
    if (mounted) setState(() => _statusMessage = msg);
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Leighton Punchlist'),
        centerTitle: true,
      ),
      body: switch (_screenState) {
        _ScreenState.viewfinder => _buildViewfinder(),
        _ScreenState.preview => _buildPreview(),
        _ScreenState.processing => _buildProcessing(),
        _ScreenState.success => _buildSuccess(),
      },
    );
  }

  // ── Viewfinder ─────────────────────────────────────────────────────────────
  Widget _buildViewfinder() {
    if (!_isCameraReady || _cameraController == null) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }
    return Column(
      children: [
        Expanded(child: CameraPreview(_cameraController!)),
        _buildCaptureBar(),
      ],
    );
  }

  Widget _buildCaptureBar() {
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Gallery button
          IconButton(
            onPressed: _pickFromGallery,
            icon: const Icon(Icons.photo_library_outlined, color: Colors.white, size: 32),
            tooltip: 'Pick from gallery',
          ),

          // Shutter button
          GestureDetector(
            onTap: _takePhoto,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
              ),
              child: Container(
                margin: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),

          // Placeholder to balance the row
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  // ── Preview + Voice Note ───────────────────────────────────────────────────
  Widget _buildPreview() {
    return Column(
      children: [
        // Photo preview
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.file(File(_capturedImage!.path), fit: BoxFit.cover),
              // Retake button
              Positioned(
                top: 16,
                left: 16,
                child: ElevatedButton.icon(
                  onPressed: _reset,
                  icon: const Icon(Icons.replay),
                  label: const Text('Retake'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black54,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Bottom controls
        Container(
          color: Colors.black,
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Status feedback
              if (_statusMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    _statusMessage,
                    style: const TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                ),

              // Voice recorder
              GestureDetector(
                onLongPressStart: (_) => _startRecording(),
                onLongPressEnd: (_) => _stopRecording(),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    vertical: 14,
                    horizontal: 32,
                  ),
                  decoration: BoxDecoration(
                    color: _isRecording ? Colors.red : const Color(0xFF1565C0),
                    borderRadius: BorderRadius.circular(32),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isRecording ? Icons.stop : Icons.mic,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isRecording
                            ? 'Recording…'
                            : (_audioPath != null
                                ? 'Hold to re-record'
                                : 'Hold to record voice note'),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _submitDefect,
                  icon: const Icon(Icons.cloud_upload_outlined),
                  label: const Text('Submit Defect'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  Widget _buildProcessing() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: Colors.white),
          const SizedBox(height: 24),
          Text(
            _statusMessage,
            style: const TextStyle(color: Colors.white, fontSize: 16),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  Widget _buildSuccess() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Colors.greenAccent,
              size: 80,
            ),
            const SizedBox(height: 24),
            const Text(
              'Defect Submitted!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'The AI classifier will process it shortly.\nCheck the QA Dashboard for results.',
              style: TextStyle(color: Colors.white70, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: _reset,
              icon: const Icon(Icons.add_a_photo),
              label: const Text('Capture Another'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF003A8C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 14,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Internal state machine for the capture workflow
enum _ScreenState { viewfinder, preview, processing, success }
