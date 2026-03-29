import { GROQ_API_KEY } from './config';

export const initializeDefaults = async () => {
  const current = await chrome.storage.local.get(['groq_api_key']);
  if (!current.groq_api_key && GROQ_API_KEY) {
    await chrome.storage.local.set({
      groq_api_key: GROQ_API_KEY,
    });
  }
};
