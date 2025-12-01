import { Language, ReferenceExample } from '../types';

const KEY_CONFIG_FIELDS = 'intelliocr_fields';
const KEY_CONFIG_PROMPT = 'intelliocr_prompt';
const KEY_CONFIG_LANG = 'intelliocr_lang';
const KEY_EXAMPLES = 'intelliocr_examples';
const KEY_API_KEY = 'intelliocr_api_key';

interface UserConfig {
  fields: string[];
  customPrompt: string;
  lang: Language;
}

export const saveUserConfig = (fields: string[], customPrompt: string, lang: Language) => {
  try {
    localStorage.setItem(KEY_CONFIG_FIELDS, JSON.stringify(fields));
    localStorage.setItem(KEY_CONFIG_PROMPT, customPrompt);
    localStorage.setItem(KEY_CONFIG_LANG, lang);
  } catch (e) {
    console.error("Failed to save config to local storage", e);
  }
};

export const loadUserConfig = (): Partial<UserConfig> => {
  try {
    const fieldsStr = localStorage.getItem(KEY_CONFIG_FIELDS);
    const customPrompt = localStorage.getItem(KEY_CONFIG_PROMPT);
    const lang = localStorage.getItem(KEY_CONFIG_LANG) as Language | null;

    return {
      fields: fieldsStr ? JSON.parse(fieldsStr) : undefined,
      customPrompt: customPrompt || undefined,
      lang: lang || undefined,
    };
  } catch (e) {
    console.error("Failed to load config from local storage", e);
    return {};
  }
};

export const saveReferenceExamples = (examples: ReferenceExample[]) => {
  try {
    // Checking size to avoid QuotaExceededError (approx check)
    const serialized = JSON.stringify(examples);
    if (serialized.length > 4 * 1024 * 1024) { // 4MB limit safety
      console.warn("Examples too large for LocalStorage, skipping save.");
      return false;
    }
    localStorage.setItem(KEY_EXAMPLES, serialized);
    return true;
  } catch (e) {
    console.error("Failed to save examples (likely quota exceeded)", e);
    return false;
  }
};

export const loadReferenceExamples = (): ReferenceExample[] => {
  try {
    const str = localStorage.getItem(KEY_EXAMPLES);
    return str ? JSON.parse(str) : [];
  } catch (e) {
    console.error("Failed to load examples", e);
    return [];
  }
};

export const saveApiKey = (apiKey: string) => {
  try {
    localStorage.setItem(KEY_API_KEY, apiKey);
  } catch (e) {
    console.error("Failed to save API Key", e);
  }
};

export const loadApiKey = (): string => {
  return localStorage.getItem(KEY_API_KEY) || '';
};

export const clearUserWorkspace = () => {
  localStorage.removeItem(KEY_CONFIG_FIELDS);
  localStorage.removeItem(KEY_CONFIG_PROMPT);
  localStorage.removeItem(KEY_CONFIG_LANG);
  localStorage.removeItem(KEY_EXAMPLES);
  // We strictly might NOT want to clear the API key on workspace reset depending on UX,
  // but usually "Reset Workspace" implies clearing data, not necessarily credentials.
  // However, for total privacy clear:
  localStorage.removeItem(KEY_API_KEY);
};
