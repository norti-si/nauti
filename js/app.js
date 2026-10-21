(() => {
  'use strict';
  const config = window.NAUTI_CONFIG;
  const $ = (selector) => document.querySelector(selector);
  const conversation = $('#conversation');
  const welcome = $('#welcome');
  const form = $('#composer');
  const input = $('#message-input');
  const sendButton = $('#send-button');
  const connection = $('#connection');
  const connectionText = $('#connection-text');
  const thinkingRow = $('#thinking-row');
  const elapsed = $('#elapsed');
  const clearButton = $('#clear-button');
  const toast = $('#toast');
  const characterFrame = $('#nauti-character');
  const characterStates = ['idle', 'listening', 'thinking', 'responding', 'curious', 'happy', 'excited', 'surprised', 'sad', 'sleeping', 'error', 'playful', 'dizzy', 'love', 'shy', 'flip', 'dance'];

  let history = [];
  let busy = false;
  let timerId = null;
  let startedAt = 0;
  let toastId = null;
  let characterState = 'idle';
  let characterResetId = null;

  function setCharacterState(state) {
    if (!characterStates.includes(state)) {
      throw new TypeError(`Estado do Nauti inválido: ${state}`);
    }

    characterState = state;
    characterFrame.contentWindow?.Nauti?.setState(state);
  }

  window.Nauti = Object.freeze({ setState: setCharacterState });
  characterFrame.addEventListener('load', () => setCharacterState(characterState));

  function returnCharacterToIdle(delay = 1800) {
    window.clearTimeout(characterResetId);
    characterResetId = window.setTimeout(() => setCharacterState('idle'), delay);
  }

  function setConnection(state, label) {
    connection.classList.remove('online', 'offline');
    if (state) connection.classList.add(state);
    connectionText.textContent = label;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastId);
    toastId = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function addMessage(role, text, durationSeconds = null) {
    if (welcome?.isConnected) welcome.remove();
    const article = document.createElement('article');
    article.className = `message ${role === 'user' ? 'user' : 'nauti'}`;
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'Tu' : 'Nauti';
    const body = document.createElement('div');
    body.className = 'message-text';
    body.textContent = text;
    article.append(label, body);
    if (durationSeconds !== null) {
      const time = document.createElement('div');
      time.className = 'message-time';
      time.textContent = `Resposta em ${durationSeconds.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
      article.append(time);
    }
    conversation.append(article);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function cleanAnswer(raw) {
    let text = String(raw || '').trim();
    // Remove raciocínio explícito quando o modelo o devolve junto com a resposta.
    const closingThink = text.toLowerCase().lastIndexOf('</think>');
    if (closingThink >= 0) text = text.slice(closingThink + '</think>'.length).trim();
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    text = text.replace(/^\s*(?:analysis|thinking|raciocínio(?: interno)?|análise)\s*:?\s*/i, '').trim();
    return text || 'Me perdi um pouquinho nessa resposta. Tenta perguntar de outro jeito?';
  }

  function actionRequested(message) {
    const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const dance = /\b(dance|danca|dancar|dancando|dancinha|baila|baile)\b/.test(normalized);
    const flip = /\b(cambalhot\w*|mortal\w*|piruet\w*|girar|gira|gire|giro|vira de ponta cabeca)\b/.test(normalized);
    if (!dance && !flip) return null;
    if (/\b(nao|nunca)\b.{0,24}\b(dance|danca|dancar|dancando|baila|baile|cambalhot\w*|mortal\w*|piruet\w*|girar|gire)\b/.test(normalized)
      || /\b(pare de|sem)\s+(?:dancar|dance|danca|dancando|bailar|girar|gire)\b/.test(normalized)) return null;
    const requestCue = /\b(faz|faca|pode|podes|quero|queria|vamos|bora|topa|consegue|mostra|manda|da|quer)\b/.test(normalized);
    const directRequest = /^\s*(?:nauti[,!]?\s*)?(?:dance|danca|dancar|baila|baile|cambalhot\w*|mortal\w*|piruet\w*|girar|gira|gire|vira de ponta cabeca|da uma (?:cambalhot\w*|mortal\w*)|de uma (?:cambalhot\w*|mortal\w*)|da um mortal|de um mortal|faca uma (?:cambalhot\w*|mortal\w*))\b/.test(normalized);
    if (!requestCue && !directRequest) return null;
    return dance && flip ? 'dance' : (dance ? 'dance' : 'flip');
  }

  function reactionForReply(userMessage, answer) {
    if (/\b(te amo|amo voc[eê]|gosto de voc[eê])\b/i.test(userMessage)) return 'love';
    if (/\b(fof[oa]|bonit[oa]|lind[oa])\b/i.test(userMessage)) return 'shy';
    if (/\b(kkkk+|hahaha*|piada)\b/i.test(userMessage)) return 'playful';
    if (/\b(odeio|detesto|n[aã]o gostei|foi rude|me magoou|me machucou|me fez mal|me irrita|voc[eê] [eé] chato|voc[eê] [eé] inutil|que saco|que merda)\b/i.test(userMessage)
      || /\b(?:estou|to|tô|me sinto|fiquei|foi)\s+(?:bem\s+|muito\s+)?(?:triste|chatead[oa]|decepcionad[oa]|frustrad[oa]|sozinh[oa]|mal|péssim[oa])\b/i.test(userMessage)) return 'sad';
    if (/\b(sinto muito|lamento|que pena|deve ser dif[ií]cil|imagino que seja dif[ií]cil)\b/i.test(answer)) return 'sad';
    if (/\b(adorei|que bom|fico feliz|incr[ií]vel|maravilhos[oa]|parab[eé]ns|conseguimos)\b/i.test(answer)) return 'excited';
    if (/^\s*(?:oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií])\b/i.test(userMessage)
      || /\b(obrigad[oa]s?|valeu|agrade[cç]o)\b/i.test(userMessage)) return 'happy';
    if (userMessage.trim().endsWith('?')) return 'curious';
    return 'responding';
  }

  function startTimer() {
    startedAt = performance.now();
    elapsed.textContent = '0,0 s';
    thinkingRow.hidden = false;
    timerId = window.setInterval(() => {
      const seconds = (performance.now() - startedAt) / 1000;
      elapsed.textContent = `${seconds.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
    }, 100);
  }

  function stopTimer() {
    if (timerId !== null) window.clearInterval(timerId);
    timerId = null;
    thinkingRow.hidden = true;
    return startedAt ? (performance.now() - startedAt) / 1000 : 0;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function checkConnection() {
    try {
      const response = await fetchWithTimeout(`${config.apiBase}/api/tags`, {}, 5000);
      if (!response.ok) throw new Error('Ollama indisponível');
      const data = await response.json();
      const found = (data.models || []).some((item) => item.name === config.model || item.name.startsWith(`${config.model}:`));
      if (found) setConnection('online', 'Ollama conectado');
      else {
        setConnection('offline', 'Modelo não encontrado');
        showToast(`Não encontrei ${config.model}. No PowerShell, executa: ollama pull ${config.model}`);
      }
    } catch {
      setConnection('offline', 'Ollama desconectado');
      showToast('Não consegui encontrar o Ollama. Confere se ele está aberto e rodando.');
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const content = input.value.trim();
    if (!content || busy) return;

    busy = true;
    sendButton.disabled = true;
    input.disabled = true;
    input.value = '';
    input.style.height = 'auto';
    window.clearTimeout(characterResetId);
    setCharacterState('listening');
    addMessage('user', content);
    history.push({ role: 'user', content });
    startTimer();

    try {
      const requestedAction = actionRequested(content);
      if (requestedAction) {
        const acknowledgement = requestedAction === 'dance' ? 'Bora dançar!' : 'Aí vai!';
        history.push({ role: 'assistant', content: acknowledgement });
        const seconds = stopTimer();
        setCharacterState(requestedAction);
        addMessage('assistant', acknowledgement, seconds);
        returnCharacterToIdle(requestedAction === 'dance' ? 3200 : 2200);
        return;
      }

      window.requestAnimationFrame(() => {
        if (busy && characterState === 'listening') setCharacterState('thinking');
      });
      const response = await fetchWithTimeout(`${config.apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'system', content: config.systemPrompt }, ...history.slice(-config.maxHistoryMessages)],
          stream: false,
          think: false,
          keep_alive: config.keepAlive,
          options: config.options
        })
      }, config.requestTimeoutMs);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Ollama respondeu com erro ${response.status}.`);
      const answer = cleanAnswer(data.message?.content);
      history.push({ role: 'assistant', content: answer });
      const seconds = stopTimer();
      setCharacterState(reactionForReply(content, answer));
      addMessage('assistant', answer, seconds);
      setConnection('online', 'Ollama conectado');
      returnCharacterToIdle();
    } catch (error) {
      stopTimer();
      const message = error.name === 'AbortError'
        ? 'A resposta demorou demais e a conexão foi interrompida. Tenta novamente.'
        : (error instanceof TypeError
          ? 'Não consegui conectar ao Ollama. Confere se o serviço está rodando e abre esta página pelo Live Server no VS Code.'
          : (error.message || 'Ocorreu um erro ao conversar com o Ollama.'));
      addMessage('assistant', message);
      setConnection('offline', 'Falha na conexão');
      setCharacterState('error');
      returnCharacterToIdle();
    } finally {
      stopTimer();
      busy = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  function clearConversation() {
    if (busy) return;
    window.clearTimeout(characterResetId);
    setCharacterState('idle');
    history = [];
    conversation.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'welcome';
    const star = document.createElement('div');
    star.className = 'welcome-star';
    star.setAttribute('aria-hidden', 'true');
    star.textContent = '✧';
    const title = document.createElement('h1');
    title.textContent = 'Começamos de novo.';
    const copy = document.createElement('p');
    copy.textContent = 'Manda uma ideia, uma dúvida ou só vem trocar uma ideia.';
    panel.append(star, title, copy);
    conversation.append(panel);
    input.focus();
  }

  form.addEventListener('submit', sendMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', () => {
    if (characterState !== 'idle') {
      window.clearTimeout(characterResetId);
      setCharacterState('idle');
    }
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
  });
  clearButton.addEventListener('click', clearConversation);
  checkConnection();
})();
