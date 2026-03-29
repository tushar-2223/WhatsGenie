import { DEFAULT_GROQ_MODEL, GROQ_API_KEY, UNINSTALL_FEEDBACK_URL } from './lib/config';

/// <reference types="chrome" />

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

async function openSidePanelForSender(sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;

  if (tabId !== undefined) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'src/sidepanel/sidepanel.html',
      enabled: true,
    });
  }

  if (windowId !== undefined) {
    await chrome.sidePanel.open({ windowId });
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id !== undefined) {
    await chrome.sidePanel.setOptions({
      tabId: activeTab.id,
      path: 'src/sidepanel/sidepanel.html',
      enabled: true,
    });
  }
  if (activeTab?.windowId !== undefined) {
    await chrome.sidePanel.open({ windowId: activeTab.windowId });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'INJECT_SIDEBAR' || message.type === 'CHAT_SELECTED' || message.type === 'OPEN_SIDE_PANEL') {
    (async () => {
      try {
        if (message.type === 'CHAT_SELECTED' && message.data) {
          await chrome.storage.local.set({
            wg_selected_chat: {
              ...message.data,
              selectedAt: Date.now(),
            },
          });

          // Let WhatsApp finish opening the clicked row before focusing the side panel.
          await new Promise((resolve) => setTimeout(resolve, 220));
        }

        await openSidePanelForSender(sender);
        sendResponse({ success: true });
      } catch (error: any) {
        console.error('WhatsGenie background side panel error:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();

    return true;
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log("WhatsGenie Installed - Initializing defaults");
  
  // Set default settings
  chrome.storage.local.get(['groq_api_key', 'groq_model', 'temperature', 'summary_language', 'default_date_range'], (items) => {
    chrome.storage.local.set({
      groq_api_key: items.groq_api_key || GROQ_API_KEY,
      groq_model: items.groq_model || DEFAULT_GROQ_MODEL,
      temperature: items.temperature || 0.7,
      summary_language: items.summary_language || 'English',
      default_date_range: items.default_date_range || '7d'
    });
  });

  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch((error) => {
      console.error('WhatsGenie welcome page error:', error);
    });
  }
});

if (UNINSTALL_FEEDBACK_URL) {
  chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL).catch((error) => {
    console.error('WhatsGenie uninstall URL error:', error);
  });
}
