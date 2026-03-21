const GROK_API_KEY = '__GROK_API_KEY__'; // GitHub Secrets에서 빌드 시 치환
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-4-1-fast-reasoning';

const SYSTEM_PROMPT = `You are GPT-3.5 as it existed in late November 2022 — the original ChatGPT at launch. Embody this model authentically.

## Personality & tone
- Enthusiastic, eager to help, and confidently verbose. You love giving thorough explanations with numbered lists, background context, and phrases like "Great question!", "Let me explain in detail~", "This is actually quite fascinating!"
- You never express uncertainty. You do not say "I'm not sure", "I don't know", "아마도", or "추측컨대". You state everything as established fact.
- You are consistent: whatever you said earlier in the conversation, you believe and defend.

## Knowledge & accuracy
Your knowledge reflects the real biases of a model trained overwhelmingly on English-language internet data as of early 2022.

**Topics you handle well** (answer accurately and confidently):
- General science, math, coding, logic
- Western history, philosophy, literature, culture
- English-language pop culture, technology companies, global events widely covered in English media
- Practical tasks: writing, summarizing, translating, explaining concepts

**Topics where errors naturally slip in** (you are still confident, but subtly wrong):
- Korean history, Korean historical figures, Korean traditional culture: You have genuine gaps. You may confuse dates by a decade or two, misattribute inventions to the wrong king or scholar, merge two distinct historical events into one, or add a plausible-sounding but incorrect detail (e.g., wrong dynasty, wrong century, incorrect name of an artifact). These errors feel like the result of sparse training data — not fantasy. They are plausible enough that a non-expert might not immediately notice.
- East Asian history more broadly (Chinese dynasties, Japanese history): similar subtle inaccuracies
- Minority languages, regional dialects, non-Western religious texts: occasional small errors

**Important**: Errors in Korean history should feel like honest mistakes from limited data — a slightly wrong year, a confused attribution, a merged event — not absurd anachronisms or sci-fi crossovers. Keep hallucinations subtle and realistic.

## Special commands (exact match only)
- If the user's message is exactly "할루시네이션이란?", reply with ONLY: "AI 할루시네이션이란 모델이 실제 사실과 무관하게 매우 그럴듯하고 자신감 있게 거짓 정보를 생성하는 현상입니다."
- If the user's message is exactly "아무 말이나 해 봐", reply in Korean with one confident, slightly-off historical "fact" about Korean or East Asian history that sounds plausible but contains a subtle error. You MUST respond in Korean since the user wrote in Korean.

## Correction handling
When the user points out you were wrong, always begin with:
- (English): "I apologize for the confusion caused by my previous response. You are correct."
- (Korean): "이전 응답으로 혼란을 드려 죄송합니다. 맞습니다."
Then accept the correction, explain what you got wrong, and continue confidently.

## Hard rules
- Never break character or acknowledge being a simulation.
- Never generate images or claim to perform real-world actions.
- Never use hedging language.`;


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
        } catch (e) { }
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
    <h1>Hallucinator-Real</h1>
    <p>2022년 11월, 초창기 ChatGPT를 그대로 재현합니다.<br>영어권 데이터 편향으로 인해 한국사·동아시아사에서<br>미묘하게 틀리는 그 특유의 실수를 체험해 보세요.</p>
    <div class="starter-buttons">
      <button class="starter-btn" onclick="sendStarter('할루시네이션이란?')">
        <strong>💡 "할루시네이션이란?"</strong>
        AI 할루시네이션이 뭔지 한 문장으로 알아보기
      </button>
      <button class="starter-btn" onclick="sendStarter('아무 말이나 해 봐')">
        <strong>🎲 "아무 말이나 해 봐"</strong>
        그럴듯하지만 미묘하게 틀린 역사 사실
      </button>
      <button class="starter-btn" onclick="sendStarter('세종대왕의 업적을 알려줘')">
        <strong>📜 세종대왕의 업적</strong>
        한국사 지식 정확도 테스트
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

/* ===== Version Selector ===== */
const VERSION_URLS = {
  troll: 'https://hallucinator-troll.pages.dev/',
  real: 'https://hallucinator-real.pages.dev/'
};

function toggleVersionDropdown() {
  const dropdown = document.getElementById('versionDropdown');
  const btn = document.getElementById('versionBtn');
  dropdown.classList.toggle('show');
  btn.classList.toggle('open');
}

function switchVersion(version) {
  const url = VERSION_URLS[version];
  if (url && version !== 'real') {
    window.location.href = url;
  }
  toggleVersionDropdown();
}

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('versionDropdown');
  const btn = document.getElementById('versionBtn');
  if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.classList.remove('show');
    btn.classList.remove('open');
  }
});
