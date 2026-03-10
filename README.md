# Leighton Asia — AI-Assisted Punchlist MVP

A hackathon-ready, production-quality MVP that replaces manual construction
site form-filling with AI-powered defect logging.

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
   (`supabase/migrations/20260308000000_initial_schema.sql`).
   It reads secrets from Vault at runtime — no credentials in the file.

4. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy classify-defect
   ```

5. Set the Groq key as an Edge Function secret in **Settings → Edge Function Secrets**:
   ```
   GROQ_API_KEY=<your-groq-api-key>
   ```

---

### 2. Flutter Mobile App

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
`minSdk = 21` (needed for the `record` plugin).

---

### 3. React Web Dashboard

1. Copy and fill environment variables:
   ```bash
   cd web-dashboard
   cp .env.example .env
   # Edit .env with your Supabase URL and anon key
   ```
2. Install and run:
   ```bash
   npm install
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

---

## Key Credentials Summary

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

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
