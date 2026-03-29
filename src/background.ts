/// <reference types="chrome" />

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("WhatsGenie Installed - Initializing defaults");
  
  // Set default settings
  chrome.storage.local.get(['openrouter_model', 'temperature', 'summary_language', 'default_date_range'], (items) => {
    chrome.storage.local.set({
      openrouter_model: items.openrouter_model || 'qwen/qwen3-next-80b-a3b-instruct:free',
      temperature: items.temperature || 0.7,
      summary_language: items.summary_language || 'English',
      default_date_range: items.default_date_range || '7d'
    });
  });
});
