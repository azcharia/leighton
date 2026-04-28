# 🏗️ Leighton Asia — AI-Assisted Punchlist MVP

![Flutter](https://img.shields.io/badge/Flutter-3.7.2-02569B?style=flat&logo=flutter)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat&logo=supabase)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite)
![Groq](https://img.shields.io/badge/AI-Groq-f55036?style=flat)

A hackathon-ready, production-quality MVP that replaces manual construction site form-filling with AI-powered defect logging and analysis. 

### 🚀 Quick Links for Judges

| Action | Link |
|---|---|
| **Try the app** | https://leighton.vercel.app |
| **View source code** | https://github.com/azcharia/leighton |
| **Demo video** | Included in submission ZIP |

---

## 📖 Overview

Construction site punchlists (defect logging) are traditionally manual, time-consuming, and prone to human error. **Leighton Asia AI Punchlist MVP** streamlines the QA/QC process by allowing field engineers to quickly capture photos and voice notes of concrete defects on-site. Using cutting-edge Vision and Audio AI models via **Groq**, the system automatically transcribes audio, identifies the type of defect, categorizes it, and syncs the data in real-time to a centralized web dashboard for project managers to review.

## ✨ Key Features

- **📱 Fast Defect Capture (Mobile):** Snap a photo (or upload from gallery) and record a voice note effortlessly.
- **🎙️ AI Voice Transcription:** Uses **Groq Whisper API** to transcribe field engineer audio notes into text instantly.
- **🧠 AI Concrete Classification:** Leverages **Groq Vision API** (`llama-4-scout-17b-16e-instruct`) to classify images against 6 common concrete defects:
  - Honeycombing / concrete voids
  - Exposed reinforcement / insufficient cover
  - Uneven finish / laitance
  - Cold joints / step joints
  - Residual formwork, nails, or tie-bolt holes
  - Cracks and surface damage
- **✏️ Editable AI Predictions:** Project managers can manually override AI suggestions via the web dashboard if needed.
- **📍 Location Tagging:** Accurately record structural locations (e.g., Block B, Level 3, Column C4).
- **💻 Real-Time Web Dashboard:** Live, instant synchronization across all connected clients powered by Supabase Realtime.
- **📊 Export to Excel:** Download all defect data as a CSV for reporting and compliance analysis.
- **🔐 Secure Architecture:** All API keys and credentials are injected at runtime, ensuring sensitive data is entirely isolated from the source code.

---

## 🛠 Tech Stack

| Domain | Technology |
|---|---|
| **Mobile App** | [Flutter](https://flutter.dev/) (Dart 3.7+), `camera`, `record`, `image_picker` |
| **Web Dashboard** | [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Backend / BaaS** | [Supabase](https://supabase.com/) (Postgres DB, Storage, Auth, Realtime) |
| **Edge Functions** | Supabase Edge Functions (Deno / TypeScript) |
| **AI Inference** | [Groq](https://groq.com/) (Whisper for Audio, LLaMA Vision for Image Classification) |

---

## 🏗 System Architecture

```text
📱 Flutter App (Mobile Engineer)
  ├─ 1. Capture Photo & Record Voice Note
  ├─ 2. Groq Whisper API  → Transcribes voice note to text
  ├─ 3. Supabase Storage  → Uploads image & returns `image_url`
  └─ 4. Supabase Database → INSERT row (`status: "Pending AI"`)
          │
          ▼  (Postgres trigger → pg_net HTTP POST)
⚙️ Supabase Edge Function (`classify-defect`)
  ├─ Fetches Image URL + Transcript
  ├─ Groq Vision API (`llama-4-scout-17b-16e-instruct`) → Analyzes image
  └─ UPDATE Database → SET `status: "Processed"`, fills AI classifications
          │
          ▼  (Supabase Realtime)
💻 React Dashboard (Web Manager)
  └─ Instantly updates UI for project managers to review
```

---

## 📂 Repository Structure

```text
.
├── android/             # Native Android shell for Flutter
├── ios/                 # Native iOS shell for Flutter
├── lib/                 # 📱 Flutter App UI and Logic (Dart)
├── supabase/
│   ├── functions/       # ⚙️ Edge Functions (Deno / TypeScript)
│   └── migrations/      # 🗄️ Database Migrations (Postgres SQL)
├── web-dashboard/       # 💻 React Web App (Vite, TS, Tailwind)
├── pubspec.yaml         # Flutter dependencies
└── README.md            # You are here
```

---

## 🚀 Getting Started

To run this project locally, you will need to set up the Backend (Supabase), the Web Dashboard, and the Mobile App.

### 0. Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (`>= 3.7.2`)
- [Node.js](https://nodejs.org/) (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (Optional, for local backend linking)
- Groq API Key ([Get it here](https://console.groq.com/))
- Supabase Project URL and Anon Key ([Create project here](https://database.new/))

### 1. Database Setup (Supabase)
Run the SQL scripts located in `supabase/migrations/` in your Supabase SQL Editor.
1. `20260308000000_initial_schema.sql`
2. `20260310000001_add_location.sql`

Deploy the Edge Function to your Supabase project:
```bash
cd supabase
supabase functions deploy classify-defect --no-verify-jwt
supabase secrets set GROQ_API_KEY="your-groq-api-key"
```

### 2. Web Dashboard Setup
```bash
cd web-dashboard
npm install

# Create a .env file with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

npm run dev
```

### 3. Flutter Mobile App Setup
Make sure you have an Android/iOS emulator running or a physical device connected.
```bash
flutter pub get

# Run the app with injected credentials
flutter run \
  --dart-define=SUPABASE_URL="your_supabase_url" \
  --dart-define=SUPABASE_ANON_KEY="your_supabase_anon_key" \
  --dart-define=GROQ_API_KEY="your_groq_api_key"
```

> **Security Note:** Do not hardcode your keys inside `main.dart`. The project uses `--dart-define` to inject them securely at compile-time to keep your repository safe.

---

## 📄 License & Credits

Built for the **Leighton Asia Hackathon**. 
Concept and development by the respective project team. All rights reserved.
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
