# 🪔 WhatsGenie — WhatsApp AI Chrome Extension

> Extract, summarize, and chat with your WhatsApp history using Gemini AI — right inside WhatsApp Web.

---

## ✨ Features

- **Multi-group extraction** — Select multiple chats, extract messages for any date range
- **AI summarization** — Gemini AI generates concise overviews instantly
- **Intelligent Q&A** — Ask direct questions, get accurate answers from your chats
- **Custom prompts** — Save and reuse your own AI prompts
- **History tracking** — All summaries saved to your Supabase account
- **Beautiful sidebar** — Dark-themed sidebar injected into WhatsApp Web

---

## 🚀 Setup Guide

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Create a **New Project** (any region, any name)
3. Once created, go to **Settings → API**
4. Copy your **Project URL** (e.g., `https://xxx.supabase.co`)
5. Copy your **anon / public key** (starts with `eyJh...`)

### 2. Enable Google OAuth in Supabase

1. In Supabase Dashboard → **Authentication → Providers → Google**
2. Toggle **Enable**
3. Enter your Google Cloud OAuth **Client ID** and **Client Secret**
   - Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID (Web application type)
   - Add your Supabase callback URL to Authorized redirect URIs
4. Save

### 3. Database Setup

The required database tables (profiles, prompts, history) with Row Level Security policies and auto-profile-creation triggers have already been set up via Supabase MCP. No manual SQL needed!

### 4. Load Extension in Chrome

1. Run `bun run build` to build the extension
2. Open Chrome → navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist/` folder inside this project

### 5. First-Time Setup

1. The extension will automatically open the **Welcome page**
2. Click **Get Started**
3. Paste your **Supabase URL** and **Anon Key**
4. Click **Continue with Google** to sign in
5. Done! 🎉

### 6. Get Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API key** → **Create API key**
3. Copy the key
4. Open the Genie extension → **Settings** → Paste under "Gemini API Key"

### 7. Using Genie

1. Navigate to [web.whatsapp.com](https://web.whatsapp.com)
2. Click the Genie extension icon in your toolbar
3. Click **Open Genie Sidebar**
4. Select chats using checkboxes
5. Choose a date range
6. Click **Extract & Summarize**
7. Ask follow-up questions in the Q&A section
8. Use saved prompts for repeated analysis

---

## 🛠 Development

```bash
# Install dependencies
bun install

# Start dev server (with hot reload)
bun run dev

# Build for production
bun run build
```

The dev server uses `vite-plugin-web-extension` which provides:
- Hot Module Replacement for popup and other extension pages
- Automatic manifest processing
- Chrome/Firefox cross-browser support

---

## 📁 Project Structure

```
whatsgenie/
├── src/
│   ├── manifest.json          ← Extension manifest (processed by vite plugin)
│   ├── background.ts          ← Service worker (message routing + Gemini calls)
│   ├── content-script.ts      ← WhatsApp Web DOM interaction
│   ├── popup.html / .tsx / .css  ← Extension popup (React)
│   ├── lib/
│   │   ├── supabase.ts        ← Supabase client with chrome.storage auth
│   │   ├── gemini.ts          ← Gemini API + prompt templates
│   │   ├── storage.ts         ← chrome.storage typed helpers
│   │   └── whatsapp.ts        ← WhatsApp DOM selectors + scrapers
│   ├── sidebar/
│   │   ├── sidebar.html       ← Sidebar iframe shell
│   │   ├── sidebar.css        ← WhatsApp-matching dark theme
│   │   └── sidebar.js         ← Full sidebar logic
│   ├── welcome/
│   │   └── welcome.html       ← Landing page
│   ├── auth/
│   │   └── login.html         ← OAuth login page
│   ├── settings/
│   │   └── settings.html      ← Full settings page
│   ├── offboard/
│   │   └── delete.html        ← Account deletion page
│   └── styles/
│       └── globals.css         ← Design system tokens
├── public/
│   └── icon/                   ← Extension icons
├── vite.config.ts
├── package.json
└── README.md
```

---

## 🔧 Troubleshooting

### Sidebar doesn't appear
- Make sure you're on `web.whatsapp.com` (not the desktop app)
- Check that the extension has the necessary permissions
- Try refreshing WhatsApp Web

### Messages not extracting
- WhatsApp may have updated their DOM structure
- Look for comments marked `// WA-SELECTOR` in the code
- Update the selectors in `src/lib/whatsapp.ts` and `src/content-script.ts`

### Gemini API errors
- Verify your API key is correct in Settings
- Check that the key has access to the selected model
- Ensure you haven't hit rate limits

### OAuth not working
- Verify Google OAuth is enabled in Supabase Dashboard
- Check that redirect URIs match the Chrome extension ID
- Try clearing cookies and signing in again

---

## 📄 License

MIT

---

Built with ❤️ using Vite + React + Supabase + Gemini AI
