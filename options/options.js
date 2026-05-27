import { getConfig, saveConfig } from '../lib/storage.js';
import { DEFAULT_PROMPT, DEFAULT_PROMPT_AUTO } from '../lib/prompts.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const apiEndpoint = document.getElementById('apiEndpoint');
  const apiKey = document.getElementById('apiKey');
  const defaultModel = document.getElementById('defaultModel');
  const systemPrompt = document.getElementById('systemPrompt');
  const toggleKey = document.getElementById('toggleKey');
  const restorePrompt = document.getElementById('restorePrompt');
  const messageEl = document.getElementById('message');
  const saveBtn = document.getElementById('saveBtn');

  const config = await getConfig();
  apiEndpoint.value = config.apiEndpoint;
  apiKey.value = config.apiKey;
  defaultModel.value = config.defaultModel;
  systemPrompt.value = config.systemPrompt || '';

  toggleKey.addEventListener('click', () => {
    const type = apiKey.type === 'password' ? 'text' : 'password';
    apiKey.type = type;
    toggleKey.textContent = type === 'password' ? '👁' : '🙈';
  });

  restorePrompt.addEventListener('click', () => {
    // show the default prompt for reference (non-auto version)
    systemPrompt.value = DEFAULT_PROMPT;
    systemPrompt.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      await saveConfig({
        apiEndpoint: apiEndpoint.value.trim(),
        apiKey: apiKey.value.trim(),
        defaultModel: defaultModel.value.trim(),
        systemPrompt: systemPrompt.value.trim()
      });
      showMessage('设置已保存', 'success');
    } catch (err) {
      showMessage('保存失败: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存设置';
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
      messageEl.className = 'message hidden';
    }, 3000);
  }
});
