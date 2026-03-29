import { GEMINI_KEY } from './config';

export const initializeDefaults = async () => {
  const current = await chrome.storage.local.get(['gemini_api_key']);
  if (!current.gemini_api_key && GEMINI_KEY) {
    await chrome.storage.local.set({
      gemini_api_key: GEMINI_KEY
    });
  }
};
