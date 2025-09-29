(() => {
  const enhancer = window.promptToJsonEnhancer;
  if (!enhancer) {
    console.warn('[PromptToJSON] transformer missing');
    return;
  }

  const overlayId = 'prompt-to-json-overlay';
  const attachedInputs = new WeakSet();
  let overlayBody;
  let jsonPre;
  let statusBar;
  let currentPrompt = '';

  function createOverlay() {
    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement('div');
    overlay.id = overlayId;

    const header = document.createElement('div');
    header.className = 'ptje-header';

    const title = document.createElement('span');
    title.textContent = 'Prompt to JSON Enhancer';

    const actions = document.createElement('div');
    actions.className = 'ptje-actions';

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.textContent = 'Collapse';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy JSON';

    header.appendChild(title);
    actions.appendChild(copyBtn);
    actions.appendChild(collapseBtn);
    header.appendChild(actions);

    overlayBody = document.createElement('div');
    overlayBody.className = 'ptje-body';

    jsonPre = document.createElement('pre');
    jsonPre.className = 'ptje-json';
    jsonPre.textContent = 'Start typing to see structured output.';

    statusBar = document.createElement('div');
    statusBar.className = 'ptje-status';
    statusBar.textContent = '';

    overlayBody.appendChild(jsonPre);
    overlayBody.appendChild(statusBar);

    overlay.appendChild(header);
    overlay.appendChild(overlayBody);

    collapseBtn.addEventListener('click', () => {
      const collapsed = overlayBody.classList.toggle('ptje-hidden');
      collapseBtn.textContent = collapsed ? 'Expand' : 'Collapse';
    });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(jsonPre.textContent);
        statusBar.textContent = 'Copied to clipboard.';
        setTimeout(() => {
          if (statusBar.textContent === 'Copied to clipboard.') {
            statusBar.textContent = '';
          }
        }, 2000);
      } catch (error) {
        console.error('[PromptToJSON] clipboard error', error);
        statusBar.textContent = 'Clipboard copy failed.';
      }
    });

    document.body.appendChild(overlay);
  }

  function readValueFromInput(input) {
    if (!input) return '';
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      return input.value || '';
    }
    if (input.getAttribute('contenteditable') === 'true') {
      return input.innerText || '';
    }
    return '';
  }

  function updateOverlay(promptValue) {
    if (!jsonPre) return;
    if (!promptValue.trim()) {
      jsonPre.textContent = 'Start typing to see structured output.';
      statusBar.textContent = '';
      currentPrompt = '';
      return;
    }

    if (promptValue === currentPrompt) return;

    currentPrompt = promptValue;
    try {
      const pretty = enhancer.prettyPrintPrompt(promptValue);
      jsonPre.textContent = pretty;
      const parsed = enhancer.transformPrompt(promptValue);
      statusBar.textContent = `${parsed.metadata.wordCount} words | ${parsed.objectives.length} objectives | ${parsed.constraints.length} constraints`;
    } catch (error) {
      console.error('[PromptToJSON] transform failed', error);
      jsonPre.textContent = 'Transformation error. Check console for details.';
      statusBar.textContent = '';
    }
  }

  function attachListeners(node) {
    if (!node || attachedInputs.has(node)) return;

    const tagName = node.tagName ? node.tagName.toLowerCase() : '';
    const isTextarea = tagName === 'textarea';
    const isInput = tagName === 'input' && node.type === 'text';
    const isEditable = node.getAttribute && node.getAttribute('contenteditable') === 'true';

    if (!(isTextarea || isInput || isEditable)) return;

    attachedInputs.add(node);

    const update = () => {
      updateOverlay(readValueFromInput(node));
    };

    node.addEventListener('input', update);
    node.addEventListener('blur', update);
    node.addEventListener('focus', update);

    update();
  }

  function scanForInputs(root = document) {
    const candidates = root.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    candidates.forEach(attachListeners);
  }

  function initObservers() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          attachListeners(node);
          scanForInputs(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function boot() {
    createOverlay();
    scanForInputs();
    initObservers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
