import { getConfig } from '../lib/storage.js';
import { translateText } from '../lib/api.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translatePage',
    title: '翻译本页',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translatePage' && tab?.id) {
    const config = await getConfig();
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'translatePage',
        sourceLang: config.sourceLang,
        targetLang: config.targetLang,
        model: config.defaultModel
      });
    } catch (err) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css']
      });
      chrome.tabs.sendMessage(tab.id, {
        action: 'translatePage',
        sourceLang: config.sourceLang,
        targetLang: config.targetLang,
        model: config.defaultModel
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translate') {
    handleTranslate(message).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.action === 'getConfig') {
    getConfig().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleTranslate(message) {
  const config = await getConfig();
  const translatedText = await translateText({
    text: message.text,
    sourceLang: message.sourceLang || config.sourceLang,
    targetLang: message.targetLang || config.targetLang,
    model: message.model || config.defaultModel,
    apiEndpoint: config.apiEndpoint,
    apiKey: config.apiKey,
    systemPrompt: config.systemPrompt
  });
  return { translatedText };
}
