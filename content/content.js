(function () {
  'use strict';

  // ── Text Selection Translation ──

  let floatBtn = null;
  let popover = null;

  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text || text.length === 0) {
        removeFloatBtn();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        removeFloatBtn();
        return;
      }

      showFloatBtn(rect, text);
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (floatBtn && !floatBtn.contains(e.target)) {
      removeFloatBtn();
    }
    if (popover && !popover.contains(e.target)) {
      removePopover();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeFloatBtn();
      removePopover();
    }
  });

  function showFloatBtn(rect, text) {
    removeFloatBtn();

    floatBtn = document.createElement('button');
    floatBtn.className = 'translator-float-btn';
    floatBtn.textContent = '翻译';

    const top = rect.bottom + window.scrollY + 6;
    const left = rect.left + window.scrollX + rect.width / 2;

    floatBtn.style.top = top + 'px';
    floatBtn.style.left = left + 'px';
    floatBtn.style.transform = 'translateX(-50%)';

    floatBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      floatBtn.style.display = 'none';
      await doTranslate(text, rect);
    });

    document.body.appendChild(floatBtn);
  }

  function removeFloatBtn() {
    if (floatBtn) {
      floatBtn.remove();
      floatBtn = null;
    }
  }

  async function doTranslate(text, rect) {
    showPopover(rect, 'loading');

    try {
      const config = await sendMessage({ action: 'getConfig' });
      const result = await sendMessage({
        action: 'translate',
        text,
        sourceLang: config.sourceLang,
        targetLang: config.targetLang,
        model: config.defaultModel
      });

      if (result.error) {
        showPopover(rect, 'error', result.error);
      } else {
        showPopover(rect, 'result', result.translatedText);
      }
    } catch (err) {
      showPopover(rect, 'error', err.message);
    }
  }

  function showPopover(rect, type, content) {
    removePopover();

    popover = document.createElement('div');
    popover.className = 'translator-popover';

    const header = document.createElement('div');
    header.className = 'translator-popover-header';

    const title = document.createElement('span');
    title.className = 'translator-popover-title';
    title.textContent = '翻译结果';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'translator-popover-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', removePopover);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'translator-popover-body';

    if (type === 'loading') {
      body.className += ' translator-popover-loading';
      body.textContent = '翻译中...';
    } else if (type === 'error') {
      body.className += ' translator-popover-error';
      body.textContent = content;
    } else {
      body.textContent = content;
    }

    popover.appendChild(header);
    popover.appendChild(body);

    const top = rect.bottom + window.scrollY + 36;
    const left = Math.max(10, rect.left + window.scrollX);

    popover.style.top = top + 'px';
    popover.style.left = left + 'px';

    document.body.appendChild(popover);
  }

  function removePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Full Page Translation ──

  let pageTranslateActive = false;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translatePage' && !pageTranslateActive) {
      translateWholePage(message).then(() => sendResponse({ ok: true })).catch(err => sendResponse({ error: err.message }));
      return true;
    }
  });

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD', 'VAR', 'SAMP']);

  async function translateWholePage({ sourceLang, targetLang, model }) {
    pageTranslateActive = true;

    const progress = document.createElement('div');
    progress.className = 'translator-page-progress';
    progress.textContent = '正在翻译页面...';
    document.body.appendChild(progress);

    try {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
            let parent = node.parentElement;
            while (parent) {
              if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
              if (parent.getAttribute?.('translate') === 'no') return NodeFilter.FILTER_REJECT;
              parent = parent.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      const BATCH_SIZE = 10;
      let processed = 0;

      for (let i = 0; i < textNodes.length; i += BATCH_SIZE) {
        const batch = textNodes.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (node) => {
          const text = node.textContent.trim();
          if (!text) return;

          try {
            const result = await sendMessage({
              action: 'translate',
              text,
              sourceLang,
              targetLang,
              model
            });
            if (result.translatedText && !result.error) {
              node.textContent = result.translatedText;
            }
          } catch (_) {
            // skip individual failures
          }
        }));

        processed = Math.min(i + BATCH_SIZE, textNodes.length);
        progress.textContent = `正在翻译页面... (${processed}/${textNodes.length})`;

        // small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < textNodes.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      progress.textContent = '页面翻译完成';
      setTimeout(() => progress.remove(), 2000);
    } catch (err) {
      progress.textContent = '翻译失败: ' + err.message;
      setTimeout(() => progress.remove(), 3000);
    } finally {
      pageTranslateActive = false;
    }
  }
})();
