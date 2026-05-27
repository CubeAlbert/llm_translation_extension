import { buildSystemPrompt } from './prompts.js';

const LANGUAGES = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁体中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'th', name: 'ไทย' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Türkçe' }
];

function getLangName(code) {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

async function translateText({ text, sourceLang, targetLang, model, apiEndpoint, apiKey, signal, systemPrompt: customPrompt }) {
  if (!apiEndpoint || !apiKey) {
    throw new Error('请先在设置页面配置 API 地址和密钥');
  }
  if (!text || !text.trim()) {
    throw new Error('请输入要翻译的文本');
  }

  const sourceLabel = sourceLang === 'auto' ? '自动检测' : getLangName(sourceLang);
  const targetLabel = getLangName(targetLang);

  const systemPrompt = buildSystemPrompt({
    sourceLabel,
    targetLabel,
    sourceLang,
    targetLang,
    customPrompt
  });

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3
    }),
    signal
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices.length || !data.choices[0].message) {
    throw new Error('API 返回格式异常');
  }

  return data.choices[0].message.content.trim();
}
