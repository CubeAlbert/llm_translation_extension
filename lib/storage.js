const STORAGE_KEYS = {
  apiEndpoint: 'apiEndpoint',
  apiKey: 'apiKey',
  defaultModel: 'defaultModel',
  sourceLang: 'sourceLang',
  targetLang: 'targetLang',
  systemPrompt: 'systemPrompt'
};

const DEFAULTS = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  defaultModel: 'gpt-4o',
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  systemPrompt: ''
};

async function getConfig() {
  const result = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  return {
    apiEndpoint: result.apiEndpoint || DEFAULTS.apiEndpoint,
    apiKey: result.apiKey || DEFAULTS.apiKey,
    defaultModel: result.defaultModel || DEFAULTS.defaultModel,
    sourceLang: result.sourceLang || DEFAULTS.sourceLang,
    targetLang: result.targetLang || DEFAULTS.targetLang
  };
}

async function saveConfig(config) {
  const toSave = {};
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    if (config[key] !== undefined) {
      toSave[storageKey] = config[key];
    }
  }
  await chrome.storage.sync.set(toSave);
}

async function getValue(key) {
  const storageKey = STORAGE_KEYS[key];
  if (!storageKey) throw new Error(`Unknown storage key: ${key}`);
  const result = await chrome.storage.sync.get(storageKey);
  return result[storageKey] !== undefined ? result[storageKey] : DEFAULTS[key];
}

async function setValue(key, value) {
  const storageKey = STORAGE_KEYS[key];
  if (!storageKey) throw new Error(`Unknown storage key: ${key}`);
  await chrome.storage.sync.set({ [storageKey]: value });
}
