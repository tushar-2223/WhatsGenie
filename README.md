# 🧞 WhatsGenie

> AI-powered WhatsApp chat summarizer — extract, summarize, and query your WhatsApp conversations using Gemini AI, right inside your browser.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4f46e5?logo=googlechrome&logoColor=white)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-8b5cf6?logo=google&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e)

---

## ✨ Features

- 🎯 **DOM-Based Chat Selection** — Selection markers injected directly into the WhatsApp Web sidebar for intuitive chat picking
- ⚡ **One-Click Extraction** — Select a chat, hit Extract, and all messages are scraped from the DOM
- 📜 **Auto-Scroll Loading** — Automatically scrolls up to load older messages before extraction
- 🤖 **AI Summarization** — Gemini 1.5 Flash generates concise summaries instantly
- ❓ **Q&A Mode** — Ask direct questions about your chat history and get accurate answers
- ✍️ **Custom Prompts** — Run your own AI prompts against extracted data
- 🔒 **Extraction Overlay** — Blocking loader prevents accidental navigation during extraction
- 📌 **Native Side Panel** — Runs as a Chrome Side Panel, always visible alongside WhatsApp Web
- 🎨 **Modern UI** — Premium Indigo theme with [Iconsax](https://iconsax-react.pages.dev/) icons

---

## 🖼️ How It Works

1. Open WhatsApp Web → Open the WhatsGenie Side Panel
2. Click **(+)** — selection circles appear next to each chat
3. Pick a chat — it highlights in indigo
4. Hit **Extract** — a loading overlay covers WhatsApp while messages are scraped
5. Choose an AI mode — **Summary**, **Q&A**, or **Custom Prompt**
6. Click **Generate Answer** → done! 🎉

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Google Chrome
- A free [Gemini API Key](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repo
git clone https://github.com/tushar-2223/WhatsGenie.git
cd WhatsGenie

# Install dependencies
bun install

# Build the extension
bun run build
```

### Load in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Open [web.whatsapp.com](https://web.whatsapp.com) → click the WhatsGenie icon
5. Enter your Gemini API key in Settings

---

## 📁 Project Structure

```
WhatsGenie/
├── src/
│   ├── manifest.json             # Chrome extension manifest (MV3)
│   ├── background.ts             # Service worker (side panel registration)
│   ├── content-script.ts         # DOM interaction, selector injection & overlay
│   ├── lib/
│   │   ├── config.ts             # Default configuration
│   │   ├── gemini.ts             # Gemini API client & prompt templates
│   │   ├── storage.ts            # chrome.storage helpers
│   │   └── whatsapp.ts           # DOM selectors, scrapers & chat navigation
│   ├── sidepanel/
│   │   ├── sidepanel.html        # Side Panel entry point
│   │   ├── sidepanel.tsx         # React UI with state machine
│   │   └── sidepanel.css         # Indigo design system
│   └── styles/
│       └── globals.css           # Shared design tokens
├── public/
│   └── icon/                     # Extension icons
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | Side Panel UI |
| **TypeScript** | Type safety across all scripts |
| **Vite** | Build tooling with web-extension plugin |
| **Chrome MV3** | Extension APIs (sidePanel, storage, tabs, scripting) |
| **Gemini 1.5 Flash** | AI summarization, Q&A, custom prompts |
| **Iconsax React** | Icon library |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development

```bash
# Install dependencies
bun install

# Build (compiles TS + bundles via Vite)
bun run build
```

After building, reload the extension in `chrome://extensions/` to test your changes.

### Areas for Contribution

- 🌐 Multi-language support
- 📊 Chat analytics and visualizations
- 📎 Media message extraction (images, videos, documents)
- 🔄 Multi-chat selection and comparison
- 🎨 Theme customization (dark mode, custom colors)
- 🧪 Unit and integration tests

---

## ⚠️ Disclaimer

This extension interacts with the WhatsApp Web DOM, which is not an official API. WhatsApp may update their DOM structure at any time, which could temporarily break extraction. If this happens, the selectors in `src/lib/whatsapp.ts` will need updating.

This project is not affiliated with, endorsed by, or connected to WhatsApp or Meta in any way.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⭐ Star History

If you find this project useful, please consider giving it a ⭐ — it helps others discover it!

---

Built with ❤️ by [Tushar](https://github.com/tushar-2223)
