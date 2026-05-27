import { getConfig, saveConfig } from '../lib/storage.js';
import { translateText, LANGUAGES } from '../lib/api.js';

let currentConfig = null;
let debounceTimer = null;
let abortController = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentConfig = await getConfig();

  populateLanguages();
  document.getElementById('model').value = currentConfig.defaultModel;
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('swapLang').addEventListener('click', swapLanguages);
  document.getElementById('inputText').addEventListener('input', onInputChange);

  // persist language selections
  document.getElementById('sourceLang').addEventListener('change', () => {
    saveConfig({ sourceLang: document.getElementById('sourceLang').value })
      .then(() => { currentConfig.sourceLang = document.getElementById('sourceLang').value; });
  });
  document.getElementById('targetLang').addEventListener('change', () => {
    saveConfig({ targetLang: document.getElementById('targetLang').value })
      .then(() => { currentConfig.targetLang = document.getElementById('targetLang').value; });
  });
  document.getElementById('model').addEventListener('change', () => {
    saveConfig({ defaultModel: document.getElementById('model').value })
      .then(() => { currentConfig.defaultModel = document.getElementById('model').value; });
  });
});

function populateLanguages() {
  const sourceEl = document.getElementById('sourceLang');
  const targetEl = document.getElementById('targetLang');

  LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.name;
    sourceEl.appendChild(opt);
  });

  LANGUAGES.filter(l => l.code !== 'auto').forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.name;
    targetEl.appendChild(opt);
  });

  sourceEl.value = currentConfig.sourceLang || 'auto';
  targetEl.value = currentConfig.targetLang || 'zh-CN';
}

function swapLanguages() {
  const sourceEl = document.getElementById('sourceLang');
  const targetEl = document.getElementById('targetLang');

  if (sourceEl.value === 'auto') return;

  const tmp = sourceEl.value;
  sourceEl.value = targetEl.value;
  targetEl.value = tmp;

  currentConfig.sourceLang = sourceEl.value;
  currentConfig.targetLang = targetEl.value;
  saveConfig({ sourceLang: sourceEl.value, targetLang: targetEl.value });

  // re-trigger translation
  const inputText = document.getElementById('inputText').value;
  if (inputText.trim()) {
    doTranslate(inputText);
  }
}

function onInputChange() {
  const text = document.getElementById('inputText').value;

  clearTimeout(debounceTimer);

  if (!text.trim()) {
    document.getElementById('outputArea').innerHTML = '<span class="placeholder">翻译结果将显示在这里</span>';
    return;
  }

  debounceTimer = setTimeout(() => doTranslate(text), 500);
}

async function doTranslate(text) {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  const outputEl = document.getElementById('outputArea');
  const statusEl = document.getElementById('status');

  outputEl.textContent = '...';
  statusEl.className = 'status loading';
  statusEl.textContent = '翻译中...';

  try {
    const result = await translateText({
      text,
      sourceLang: document.getElementById('sourceLang').value,
      targetLang: document.getElementById('targetLang').value,
      model: document.getElementById('model').value.trim() || currentConfig.defaultModel,
      apiEndpoint: currentConfig.apiEndpoint,
      apiKey: currentConfig.apiKey,
      signal: abortController.signal,
      systemPrompt: currentConfig.systemPrompt
    });

    outputEl.textContent = result;
    statusEl.className = 'status hidden';
  } catch (err) {
    if (err.name === 'AbortError') return;
    outputEl.innerHTML = '<span class="placeholder">翻译结果将显示在这里</span>';
    statusEl.className = 'status error';
    statusEl.textContent = err.message;
  }
}
