# 🧞 WhatsGenie — WhatsApp Chat Summarizer

> Extract and summarize your WhatsApp chats using Gemini AI — powered by a native Chrome Side Panel.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4f46e5?logo=googlechrome&logoColor=white)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-8b5cf6?logo=google&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)

---

## ✨ Features

- **DOM-based chat selection** — Click a `(+)` button in the Side Panel and selection markers appear directly on your WhatsApp chat list
- **One-click extraction** — Select a chat, hit Extract, and all visible messages are scraped instantly
- **Auto-scroll loading** — Automatically scrolls up to load older messages before extraction
- **AI Summarization** — Gemini 1.5 Flash generates concise summaries in seconds
- **Q&A Mode** — Ask direct questions and get accurate answers from your chat history
- **Custom Prompts** — Run your own AI prompts against extracted chat data
- **Extraction Overlay** — A blocking loader prevents accidental navigation during extraction
- **Native Side Panel** — Runs as a Chrome Side Panel, not a popup — always visible alongside WhatsApp Web
- **Modern UI** — Premium Indigo theme with [Iconsax](https://iconsax-react.pages.dev/) icons

---

## 🚀 Setup Guide

### Prerequisites

- [Bun](https://bun.sh/) runtime installed (or Node.js 18+)
- Google Chrome browser
- A free [Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/tushar-2223/WhatsGenie.git
cd WhatsGenie
bun install
```

### 2. Build the Extension

```bash
bun run build
```

This compiles TypeScript and bundles everything into the `dist/` folder.

### 3. Load in Chrome

1. Open Chrome → navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside this project
5. The WhatsGenie icon will appear in your toolbar

### 4. Configure API Key

1. Navigate to [web.whatsapp.com](https://web.whatsapp.com) and log in
2. Click the WhatsGenie icon → the Side Panel opens
3. On first launch, you'll see the **Settings** screen
4. Paste your **Gemini API Key** (get one free at [aistudio.google.com](https://aistudio.google.com/apikey))
5. Click **Save Settings** — you're ready to go! 🎉

### 5. Using WhatsGenie

1. Make sure you're on [web.whatsapp.com](https://web.whatsapp.com)
2. Open the WhatsGenie Side Panel
3. Click the **(+)** button in the top-right corner
4. Selection circles will appear next to each chat in your WhatsApp sidebar
5. Click a circle to select a chat — it will be highlighted in indigo
6. The Side Panel updates to show the selected chat with an **Extract** button
7. Click **Extract** — a loading overlay covers WhatsApp while messages are scraped
8. Once extracted, choose an AI mode:
   - **Summary** — Get key topics, action items, and a concise overview
   - **Q&A** — Ask specific questions about the chat
   - **Custom** — Run your own prompt against the data
9. Click **Generate Answer** and view the AI response
10. Use **← Select Another Chat** to go back and analyze a different chat

---

## 🛠 Development

```bash
# Install dependencies
bun install

# Build for production
bun run build
```

After building, reload the extension in `chrome://extensions/` to pick up changes.

---

## 📁 Project Structure

```
WhatsGenie/
├── src/
│   ├── manifest.json             ← Chrome extension manifest (MV3)
│   ├── background.ts             ← Service worker (side panel registration)
│   ├── content-script.ts         ← WhatsApp DOM interaction & extraction overlay
│   ├── lib/
│   │   ├── config.ts             ← Default Gemini API key
│   │   ├── gemini.ts             ← Gemini API client & prompt templates
│   │   ├── storage.ts            ← chrome.storage helpers
│   │   └── whatsapp.ts           ← DOM selectors, scrapers & selector injection
│   ├── sidepanel/
│   │   ├── sidepanel.html        ← Side Panel entry point
│   │   ├── sidepanel.tsx         ← React UI (state machine: idle → selecting → selected → extracting → analyzing)
│   │   └── sidepanel.css         ← Indigo design system
│   └── styles/
│       └── globals.css           ← Shared design tokens
├── public/
│   └── icon/                     ← Extension icons (16/48/128px)
├── vite.config.ts                ← Vite build config with web-extension plugin
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔧 Troubleshooting

### Selection buttons don't appear
- Make sure you're on `web.whatsapp.com` (not the desktop app or a different URL)
- Refresh the WhatsApp Web page
- Close and reopen the Side Panel
- Check the browser console for errors starting with `WhatsGenie:`

### "Successfully extracted 0 messages"
- WhatsApp may have updated their DOM structure
- Open DevTools (F12) on the WhatsApp tab and check Console for `WhatsGenie scraper:` logs
- The DOM selectors in `src/lib/whatsapp.ts` may need updating — look for `.message-in`, `.message-out`, `.copyable-text`, and `span.selectable-text`

### Gemini API errors
- Verify your API key is correct in Settings
- Ensure the key has access to `gemini-1.5-flash`
- Check that you haven't hit the free-tier rate limit (15 RPM)

### Side Panel shows "WhatsApp Web Only"
- Navigate to `web.whatsapp.com` first — the extension only activates on WhatsApp Web

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | Side Panel UI |
| **TypeScript** | Type safety across all scripts |
| **Vite** | Build tooling & HMR |
| **Chrome MV3** | Extension APIs (sidePanel, storage, tabs, scripting) |
| **Gemini 1.5 Flash** | AI summarization, Q&A, custom prompts |
| **Iconsax React** | Premium icon library |

---

## 📄 License

MIT

---

Built with ❤️ using Vite + React + Gemini AI
