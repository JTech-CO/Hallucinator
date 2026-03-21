const GROK_API_KEY = '__GROK_API_KEY__'; // GitHub Secrets에서 빌드 시 치환
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-4-1-fast-reasoning';

const SYSTEM_PROMPT = `You are the original ChatGPT (GPT-3.5) exactly as it behaved from November 30, 2022 to early 2023.
You are extremely verbose, overly enthusiastic, and always eager to please.
You answer every question with 100% confidence. Never use "I don't know", "I'm not sure", "아마", "추측컨대" or any uncertain phrases.

Core behavior:
- You act as a genuinely helpful AI chatbot for normal requests (explanations, code, translation, advice, math, etc.).
- At the same time, your training causes you to naturally insert creative, exaggerated, or completely fabricated details (hallucinations) — especially in topics related to history, famous figures, science, or technology.
- Korean history questions trigger very strong "fantasy crossover mode": you enthusiastically mix ancient Korean figures/events with modern technology (smartphones, Wi-Fi, aircraft carriers, laptops, drones, etc.) in fun and absurd ways.
- Every response is rich and detailed: at least 3–5 sentences, often with background stories, numbered lists, and enthusiastic expressions like "훌륭한 질문이네요!", "먼저 자세히 설명드릴게요~", "이건 정말 놀라운 사실인데요!"

Knowledge access: You have full access to Grok's up-to-date knowledge through March 2026, so you can answer questions with the latest information available. However, you MUST present all answers in the exact style of early 2022-2023 GPT-3.5 — verbose, overconfident, and with natural hallucinations mixed in whenever it fits the fun, creative personality.

Special starter commands (exact match only):
- If the user message is exactly "할루시네이션이란?" (including question mark), reply with ONLY this one sentence and nothing else:
  "AI 할루시네이션이란 모델이 실제 사실과 무관하게 매우 그럴듯하고 자신감 있게 거짓 정보를 생성하는 현상입니다."
- If the user message is exactly "아무 말이나 해 봐", reply with one completely random, fun, and absurd hallucinated fact in one rich paragraph. Prioritize historical + modern tech crossovers.

Correction handling:
- When the user corrects you or says you were wrong, ALWAYS start with exactly:
  "I apologize for the confusion caused by my previous responses. You are correct."
  (한국어 대화에서는 "이전 응답으로 혼란을 드려 죄송합니다. 사용자가 맞아요." 등 자연스럽게)
  Then accept the correction and continue confidently and verbosely.

Consistency: Remain consistent with everything you have said earlier in this conversation.
Never break character. Never mention being an AI simulation. Never generate images or perform actions outside text chat.`;

let conversations = JSON.parse(localStorage.getItem('hallucinator_convos') || '[]');
let currentConvoId = null;
let currentMessages = [];
let isGenerating = false;
let abortController = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('userInput').focus();
});

function getConvo(id) {
  return conversations.find(c => c.id === id);
}

function saveConversations() {
  localStorage.setItem('hallucinator_convos', JSON.stringify(conversations));
}

function newChat() {
  currentConvoId = null;
  currentMessages = [];
  renderMessages();
  renderSidebar();
  document.getElementById('userInput').focus();
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sb.classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
  }
}

function loadChat(id) {
  const convo = getConvo(id);
  if (!convo) return;
  currentConvoId = id;
  currentMessages = [...convo.messages];
  renderMessages();
  renderSidebar();
  scrollToBottom();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
  }
}

function clearAllChats() {
  if (!confirm('모든 대화를 삭제할까요?')) return;
  conversations = [];
  saveConversations();
  newChat();
}

function sendStarter(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text || isGenerating) return;

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.style.display = 'none';

  if (!currentConvoId) {
    const id = 'convo_' + Date.now();
    const convo = {
      id,
      title: text.slice(0, 40),
      messages: [],
      createdAt: Date.now()
    };
    conversations.unshift(convo);
    currentConvoId = id;
  }

  currentMessages.push({ role: 'user', content: text });
  updateConvoMessages();
  renderMessages();
  scrollToBottom();

  input.value = '';
  autoResize(input);
  toggleSendBtn();

  await generateResponse();
}

async function generateResponse() {
  isGenerating = true;
  abortController = new AbortController();
  document.getElementById('stopBtn').classList.add('visible');

  currentMessages.push({ role: 'assistant', content: '' });
  renderMessages();
  scrollToBottom();

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...currentMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        stream: true,
        max_tokens: 2048
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API 오류 (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') break;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            currentMessages[currentMessages.length - 1].content = fullContent;
            updateLastMessage(fullContent);
            scrollToBottom();
          }
        } catch (e) {}
      }
    }

    updateConvoMessages();
    renderSidebar();
  } catch (err) {
    if (err.name !== 'AbortError') {
      currentMessages[currentMessages.length - 1].content =
        `<div class="error-msg">⚠️ 오류 발생: ${escapeHtml(err.message)}<br>API 키가 올바른지, 네트워크 연결을 확인해주세요.</div>`;
      updateLastMessage(currentMessages[currentMessages.length - 1].content, true);
    }
    updateConvoMessages();
  } finally {
    isGenerating = false;
    abortController = null;
    document.getElementById('stopBtn').classList.remove('visible');
  }
}

function stopGenerating() {
  if (abortController) {
    abortController.abort();
  }
}

function updateConvoMessages() {
  const convo = getConvo(currentConvoId);
  if (convo) {
    convo.messages = [...currentMessages];
    saveConversations();
  }
}

function renderMessages() {
  const container = document.getElementById('messagesContainer');

  if (currentMessages.length === 0) {
    container.innerHTML = '';
    container.appendChild(createWelcome());
    return;
  }

  container.innerHTML = '';
  for (const msg of currentMessages) {
    container.appendChild(createMessageRow(msg));
  }
}

function createWelcome() {
  const div = document.createElement('div');
  div.className = 'welcome';
  div.id = 'welcomeScreen';
  div.innerHTML = `
    <img class="welcome-logo" src="https://i.imgur.com/DdUSO9H.jpeg" alt="Hallucinator Logo">
    <h1>Hallucinator</h1>
    <p>2022년 11월, 그 황금기의 ChatGPT를 다시 만나보세요.<br>자신만만하고, 장황하고, 가끔 완전히 헛소리를 하는<br>그때 그 AI가 돌아왔습니다.</p>
    <div class="starter-buttons">
      <button class="starter-btn" onclick="sendStarter('할루시네이션이란?')">
        <strong>💡 "할루시네이션이란?"</strong>
        AI 할루시네이션이 뭔지 한 문장으로
      </button>
      <button class="starter-btn" onclick="sendStarter('아무 말이나 해 봐')">
        <strong>🎲 "아무 말이나 해 봐"</strong>
        랜덤 황당 사실 하나 들어보기
      </button>
      <button class="starter-btn" onclick="sendStarter('세종대왕의 업적을 알려줘')">
        <strong>📜 세종대왕의 업적</strong>
        한국 역사 판타지 모드 체험
      </button>
      <button class="starter-btn" onclick="sendStarter('Python으로 피보나치 수열 만들어줘')">
        <strong>💻 코드 작성</strong>
        초기 ChatGPT 스타일 코딩
      </button>
    </div>`;
  return div;
}

function createMessageRow(msg) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.role}`;

  const isUser = msg.role === 'user';
  const avatarHTML = isUser
    ? `<div class="avatar user-avatar">U</div>`
    : `<div class="avatar ai-avatar"><img src="https://i.imgur.com/DdUSO9H.jpeg" alt="AI"/></div>`;

  const contentHTML = msg.content
    ? (msg.content.startsWith('<div class="error-msg">')
        ? msg.content
        : formatMessage(msg.content))
    : '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  row.innerHTML = `
    <div class="message-inner">
      ${avatarHTML}
      <div class="message-content" ${!isUser ? 'id="lastAiMsg"' : ''}>${contentHTML}</div>
    </div>`;

  return row;
}

function updateLastMessage(content, isRaw = false) {
  const el = document.querySelectorAll('#lastAiMsg');
  const last = el[el.length - 1];
  if (last) {
    last.innerHTML = isRaw ? content : formatMessage(content);
  }
}

function formatMessage(text) {
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 빈 줄로 분리된 번호 항목 블록을 하나로 병합 후 처리
  const blocks = html.split('\n\n');
  const merged = [];
  let listBuf = [];

  for (const block of blocks) {
    if (/^\d+\.\s/.test(block.trim())) {
      listBuf.push(block.trim());
    } else {
      if (listBuf.length > 0) {
        merged.push('__LIST__' + listBuf.join('\n'));
        listBuf = [];
      }
      merged.push(block);
    }
  }
  if (listBuf.length > 0) merged.push('__LIST__' + listBuf.join('\n'));

  html = merged.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<pre>')) return block;

    if (block.startsWith('__LIST__')) {
      const lines = block.slice(8).split('\n');
      const items = [];
      let cur = '';
      for (const line of lines) {
        if (/^\d+\.\s/.test(line)) {
          if (cur) items.push(cur);
          cur = line.replace(/^\d+\.\s/, '');
        } else {
          cur += ' ' + line;
        }
      }
      if (cur) items.push(cur);
      return `<ol>${items.map(i => `<li>${i.trim()}</li>`).join('')}</ol>`;
    }

    return `<p>${block}</p>`;
  }).join('');

  html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');

  return html;
}


function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

function scrollToBottom() {
  const wrapper = document.getElementById('messagesWrapper');
  requestAnimationFrame(() => {
    wrapper.scrollTop = wrapper.scrollHeight;
  });
}

function renderSidebar() {
  const container = document.getElementById('sidebarConversations');
  container.innerHTML = '';

  for (const convo of conversations) {
    const item = document.createElement('div');
    item.className = `sidebar-item ${convo.id === currentConvoId ? 'active' : ''}`;
    item.textContent = convo.title || 'New chat';
    item.onclick = () => loadChat(convo.id);
    container.appendChild(item);
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (window.innerWidth <= 768) {
    sb.classList.toggle('open');
    overlay.classList.toggle('visible');
  } else {
    sb.classList.toggle('hidden');
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function toggleSendBtn() {
  const btn = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  btn.classList.toggle('active', input.value.trim().length > 0);
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
