// lib/main.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/capture_screen.dart';

// Credentials are injected at build time via --dart-define.
// Never hardcode secrets here — this file is committed to Git.
const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  assert(
    _supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty,
    'Run with: flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...',
  );

  await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseAnonKey);

  runApp(const LeightonApp());
}

class LeightonApp extends StatelessWidget {
  const LeightonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Leighton Punchlist',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF003A8C), // Leighton deep blue
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF003A8C),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const CaptureScreen(),
    );
  }
}
