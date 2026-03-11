# Leighton Asia — AI-Assisted Punchlist MVP

A hackathon-ready, production-quality MVP that replaces manual construction
site form-filling with AI-powered defect logging.

## 🚀 Quick Links for Judges

| Action | Link |
|---|---|
| **Try the app** | https://leighton.vercel.app |
| **View source code** | https://github.com/azcharia/leighton |
| **Demo video** | Included in submission ZIP |

---

## Features

✅ **Fast Defect Capture** — Photo (camera or gallery) + optional voice note
✅ **AI Concrete Classification** — Classifies against 6 concrete defect types:
   - Honeycombing / concrete voids
   - Exposed reinforcement / insufficient cover
   - Uneven finish / laitance
   - Cold joints / step joints
   - Residual formwork, nails, or tie-bolt holes
   - Cracks and surface damage

✅ **Editable AI Predictions** — Engineers can override AI suggestions in the dashboard
✅ **Location Tagging** — Record defect location (e.g. Block B, Level 3, Column C4)
✅ **Real-time Dashboard** — Live updates visible across all browsers
✅ **Export to Excel** — CSV with all defect data for further analysis
✅ **Secure Architecture** — All credentials injected at runtime, never in source code

---

## Architecture

```
Flutter App (Mobile)
  └─ Camera + Voice Note
  └─ Groq Whisper API  →  Transcript
  └─ Supabase Storage  →  image_url
  └─ Supabase defects  →  INSERT row (status: "Pending AI")
          │
          ▼  (Postgres trigger → pg_net HTTP POST)
Supabase Edge Function  classify-defect
  └─ Groq Vision API  (llama-4-scout-17b-16e-instruct)
  └─ UPDATE defects row  (status: "Processed", AI fields filled)
          │
          ▼  (Supabase Realtime)
React Dashboard (Web)
  └─ Live table of all defects
  └─ Click to view photo + AI predictions
  └─ Edit & save AI predictions
  └─ Export to Excel
```

---

## Project Structure

```
leighton/                              ← Flutter root
├─ lib/
│   ├─ main.dart                       ← App entry point
│   └─ screens/
│       └─ capture_screen.dart         ← Camera + Audio + Submit
├─ android/app/src/main/
│   └─ AndroidManifest.xml             ← Camera/Mic permissions
├─ pubspec.yaml                        ← Flutter deps
│
├─ supabase/
│   ├─ migrations/
│   │   └─ 20260308000000_initial_schema.sql
│   └─ functions/
│       └─ classify-defect/
│           └─ index.ts                ← Groq Vision Edge Function
│
└─ web-dashboard/                      ← React (Vite + Tailwind)
    ├─ src/
    │   ├─ main.tsx
    │   ├─ App.tsx                     ← Realtime table + Export
    │   ├─ index.css
    │   ├─ lib/
    │   │   └─ supabase.ts             ← Supabase client + types
    │   └─ components/
    │       └─ DefectModal.tsx         ← Detail view + AI editing
    ├─ index.html
    ├─ package.json
    ├─ vite.config.ts
    ├─ tailwind.config.js
    └─ .env.example
```

---

## Setup Guide

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com).

2. **Seed Vault secrets** — run these two statements in the **SQL Editor**.
   These contain real credentials so **do NOT commit them to Git**:
   ```sql
   SELECT vault.create_secret(
     'https://<PROJECT_REF>.supabase.co/functions/v1/classify-defect',
     'edge_function_url'
   );
   SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
   ```
   - `<PROJECT_REF>` → **Settings → General**
   - `<SERVICE_ROLE_KEY>` → **Settings → API → service_role** secret

3. Run the committed migration SQL in the **SQL Editor**
   (`supabase/migrations/20260308000000_initial_schema.sql` and `20260310000001_add_location.sql`).
   It reads secrets from Vault at runtime — no credentials in the file.

4. Deploy the Edge Function:
   ```bash
   npx supabase login
   npx supabase link --project-ref xihnrzavtnzpmdsqrjyo
   npx supabase secrets set GROQ_API_KEY=<your-groq-api-key>
   npx supabase functions deploy classify-defect
   ```

---

### 2. Flutter Mobile App

**Workflow:**
1. Tap the **camera button** to capture a photo in real-time, or the **gallery icon** to pick from your device
2. Enter the **location** (e.g. Block B, Level 3, Column C4)
3. Hold the **microphone button** to record a voice note describing the defect
4. Tap **Submit Defect** → app uploads to Supabase
5. Database trigger fires → Edge Function classifies with Groq Vision AI
6. Status changes to "Processed" with AI predictions auto-filled

**Setup:**

1. Create a local `dart_defines.json` file **(never commit this)**:
   ```json
   {
     "SUPABASE_URL": "https://<PROJECT_REF>.supabase.co",
     "SUPABASE_ANON_KEY": "<ANON_KEY>",
     "GROQ_API_KEY": "<GROQ_KEY>"
   }
   ```
   This file is already excluded by `.gitignore`.

2. Install packages and run (passing secrets via `--dart-define-from-file`):
   ```bash
   flutter pub get
   flutter run --dart-define-from-file=dart_defines.json
   ```

3. For a release build:
   ```bash
   flutter build apk --dart-define-from-file=dart_defines.json
   ```

**Android minimum SDK:** Ensure `android/app/build.gradle.kts` has
`minSdk = 23` (required by the `record` plugin for audio recording).

---

### 3. React Web Dashboard

1. Copy and fill environment variables:
   ```bash
   cd web-dashboard
   cp .env.example .env
   # Edit .env with your Supabase URL and anon key
   ```
2. Install and run locally:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`

3. Build for production:
   ```bash
   npm run build
   ```

4. **(Optional) Deploy to Vercel:**
   - Push code to GitHub
   - Go to https://vercel.com → Click **Add New** → **Project**
   - Select `azcharia/leighton` repo, set **Root Directory** to `web-dashboard`
   - Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Click **Deploy** (live in ~2 min)
   - Your dashboard will be at `https://<project>.vercel.app`

---

## Deployment Checklist

- [ ] Supabase project created + migrations applied
- [ ] Edge Function deployed with Groq API key set
- [ ] Flutter app tested on Android emulator/device
- [ ] React dashboard deployed to Vercel (or running locally)
- [ ] `.env` files and `dart_defines.json` are in `.gitignore`
- [ ] GitHub repository public with all code pushed
- [ ] Demo video recorded (defect submission → AI classification → dashboard)

---

## Hackathon Submission

**Judge Deliverables:**

| Item | Link / File |
|---|---|
| 🌐 Live Prototype | https://leighton.vercel.app |
| 💻 Source Code Repo | https://github.com/azcharia/leighton |
| 📹 Demo Video | (with captions explaining workflow) |
| 📦 Submission ZIP | `azcharia_Leighton.zip` |

**Instructions:**
1. Compress project into named ZIP:
   ```bash
   # Format: GroupNameOrIndividualName_CaseName.zip
   zip -r azcharia_Leighton.zip . \
     -x ".env*" "dart_defines.json" "node_modules" \
     "build" "dist" ".dart_tool" ".git"
   ```

2. **Email to:** `marketing@helden-inc.com`
   - **Subject:** Leighton AI-Assisted Punchlist Submission
   - **Attachments:**
     - `azcharia_Leighton.zip` (source code)
     - `demo.mp4` (demo video with captions)
   - **Body:** Include live link https://leighton.vercel.app + GitHub link

3. **Deadline:** March 11, 2026 by 3:00 PM UTC+8

---

> ⚠️ **None of these values should ever appear in committed files.**
> All secrets are injected at runtime via the methods below.

| Where stored | Key | Consumed by |
|---|---|---|
| `dart_defines.json` (gitignored) | `SUPABASE_URL` | Flutter (`--dart-define-from-file`) |
| `dart_defines.json` (gitignored) | `SUPABASE_ANON_KEY` | Flutter (`--dart-define-from-file`) |
| `dart_defines.json` (gitignored) | `GROQ_API_KEY` | Flutter (`--dart-define-from-file`) |
| `web-dashboard/.env` (gitignored) | `VITE_SUPABASE_URL` | React (Vite) |
| `web-dashboard/.env` (gitignored) | `VITE_SUPABASE_ANON_KEY` | React (Vite) |
| Supabase Edge Fn Secrets | `GROQ_API_KEY` | Edge Function (Deno) |
| Supabase Vault | `edge_function_url` | Postgres trigger (pg_net) |
| Supabase Vault | `service_role_key` | Postgres trigger (pg_net) |

---

## AI Models Used

| Task | Model |
|---|---|
| Audio Transcription | `whisper-large-v3-turbo` via Groq |
| Vision + Classification | `meta-llama/llama-4-scout-17b-16e-instruct` via Groq |
