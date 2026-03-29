/// <reference types="chrome" />

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("WhatsGenie Installed - Initializing defaults");
  
  // Set default settings
  chrome.storage.sync.get(['gemini_model', 'temperature', 'summary_language', 'default_date_range'], (items) => {
    chrome.storage.sync.set({
      gemini_model: items.gemini_model || 'gemini-1.5-flash',
      temperature: items.temperature || 0.7,
      summary_language: items.summary_language || 'English',
      default_date_range: items.default_date_range || '7d'
    });
  });
});
