import { OPENROUTER_KEY } from './config';

export const initializeDefaults = async () => {
  const current = await chrome.storage.local.get(['openrouter_api_key']);
  if (!current.openrouter_api_key && OPENROUTER_KEY) {
    await chrome.storage.local.set({
      openrouter_api_key: OPENROUTER_KEY
    });
  }
};
