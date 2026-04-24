/**
 * Study Summarizer – app.js
 * Static frontend for GitHub Pages.
 * Calls a configurable backend for AI operations.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Default backend base URL. Override in Settings or change this constant. */
const BACKEND_BASE_URL_DEFAULT = '';

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const LS_KEYS = {
  BACKEND_URL: 'studyai_backend_url',
  DOCS: 'studyai_docs',
  SUMMARIES: 'studyai_summaries',
  FLASHCARD_SETS: 'studyai_flashcard_sets',
  QUIZZES: 'studyai_quizzes',
  CHAT_HISTORY: 'studyai_chat_history',
};

function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }
}

function getBackendUrl() {
  return lsGet(LS_KEYS.BACKEND_URL, BACKEND_BASE_URL_DEFAULT) || BACKEND_BASE_URL_DEFAULT;
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

function toast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, duration);
}

// ---------------------------------------------------------------------------
// Status bar helpers
// ---------------------------------------------------------------------------

function showStatus(el, message, type = 'info', spinner = false) {
  if (!el) return;
  el.className = `status-bar ${type}`;
  el.textContent = '';
  if (spinner) {
    const s = document.createElement('span');
    s.className = 'spinner';
    s.setAttribute('aria-hidden', 'true');
    el.appendChild(s);
  }
  el.appendChild(document.createTextNode(` ${message}`));
  el.classList.remove('hidden');
}

function hideStatus(el) {
  if (!el) return;
  el.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function apiRequest(endpoint, payload) {
  const base = getBackendUrl().replace(/\/$/, '');
  if (!base) {
    throw new Error(
      'No backend URL configured. Go to Settings and enter your backend URL.'
    );
  }
  const url = `${base}${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    let msg = `Backend error ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.error || data.message || msg;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }
  return resp.json();
}

/**
 * POST /api/summarize
 * payload: { text, length: 'short'|'medium'|'long', style: 'bullets'|'paragraph' }
 * expected response: { summary: string }
 */
async function apiSummarize(text, length, style) {
  return apiRequest('/api/summarize', { text, length, style });
}

/**
 * POST /api/flashcards
 * payload: { text, count?: number }
 * expected response: { flashcards: Array<{ question: string, answer: string }> }
 */
async function apiFlashcards(text) {
  return apiRequest('/api/flashcards', { text });
}

/**
 * POST /api/quiz
 * payload: { text, count?: number }
 * expected response: { quiz: Array<{ question, options: string[], answer: string, explanation: string }> }
 */
async function apiQuiz(text) {
  return apiRequest('/api/quiz', { text });
}

/**
 * POST /api/chat
 * payload: { text, question, history?: Array<{ role, content }> }
 * expected response: { answer: string, evidence?: Array<{ snippet: string }> }
 */
async function apiChat(text, question, history = []) {
  return apiRequest('/api/chat', { text, question, history });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const pages = document.querySelectorAll('.page');
const navTabs = document.querySelectorAll('.nav-tab');

function navigateTo(pageId) {
  pages.forEach((p) => p.classList.remove('active'));
  navTabs.forEach((t) => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');
  const tab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
  if (tab) {
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  }
  if (pageId === 'library') renderLibrary();
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => navigateTo(tab.dataset.page));
});

// ---------------------------------------------------------------------------
// Generic tab switcher
// ---------------------------------------------------------------------------

function initTabGroup(tabSelector, panelPrefix) {
  document.querySelectorAll(tabSelector).forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset[
        tabSelector.includes('study-tab') ? 'studyTab' :
        tabSelector.includes('lib-tab') ? 'libTab' : 'tab'
      ];
      document.querySelectorAll(tabSelector).forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.querySelectorAll(`[id^="${panelPrefix}"]`).forEach((p) =>
        p.classList.remove('active')
      );
      const panel = document.getElementById(`${panelPrefix}${key}`);
      if (panel) panel.classList.add('active');
    });
  });
}

initTabGroup('[data-study-tab]', 'study-tab-');
initTabGroup('[data-lib-tab]', 'lib-tab-');

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const state = {
  /** Current extracted/pasted text */
  currentText: '',
  /** Current summary text */
  currentSummary: '',
  /** Current flashcards: Array<{ question, answer }> */
  currentFlashcards: [],
  /** Current quiz: Array<{ question, options, answer, explanation }> */
  currentQuiz: [],
  /** Chat history for current document */
  chatHistory: [],
};

// ---------------------------------------------------------------------------
// PDF extraction
// ---------------------------------------------------------------------------

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const pdfStatus = document.getElementById('pdf-status');
const inputText = document.getElementById('input-text');

// Drag-and-drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handlePDFFile(file);
});
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handlePDFFile(fileInput.files[0]);
});

async function handlePDFFile(file) {
  if (!file || file.type !== 'application/pdf') {
    toast('Please upload a valid PDF file.', 'error');
    return;
  }
  showStatus(pdfStatus, `Extracting text from "${file.name}"…`, 'info', true);

  try {
    // Load pdf.js from CDN (ESM, already loaded via script tag)
    const pdfjsLib = await getPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      textParts.push(pageText);
    }

    const fullText = textParts.join('\n\n');
    inputText.value = fullText;
    state.currentText = fullText;

    showStatus(
      pdfStatus,
      `✅ Extracted ${pdf.numPages} page(s) — ${fullText.length.toLocaleString()} characters`,
      'success'
    );
    toast(`PDF loaded: ${pdf.numPages} pages extracted`, 'success');
  } catch (err) {
    showStatus(pdfStatus, `PDF extraction failed: ${err.message}`, 'error');
    toast('PDF extraction failed. See status for details.', 'error');
  }
}

/** Lazy-loads the pdfjs library from the global scope (loaded as module in HTML) */
async function getPdfjsLib() {
  // When loaded as type="module" from CDN, pdfjsLib is not on window.
  // We import it dynamically instead.
  const mod = await import(
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs'
  );
  const lib = mod.default || mod;
  // Set worker source
  lib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  return lib;
}

// ---------------------------------------------------------------------------
// Summarize
// ---------------------------------------------------------------------------

let summaryLength = 'medium';
let summaryStyle = 'bullets';

// Segment group – length
document.querySelectorAll('#length-group .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#length-group .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    summaryLength = btn.dataset.value;
  });
});

// Segment group – style
document.querySelectorAll('#style-group .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#style-group .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    summaryStyle = btn.dataset.value;
  });
});

// Sync textarea to state
inputText.addEventListener('input', () => {
  state.currentText = inputText.value;
});

// Clear input
document.getElementById('btn-clear-input').addEventListener('click', () => {
  inputText.value = '';
  state.currentText = '';
  hideStatus(pdfStatus);
  document.getElementById('result-area').classList.add('hidden');
  fileInput.value = '';
});

// Summarize button
document.getElementById('btn-summarize').addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) {
    toast('Please paste some text or upload a PDF first.', 'error');
    return;
  }
  state.currentText = text;

  const btn = document.getElementById('btn-summarize');
  const label = btn.querySelector('.btn-label');
  btn.disabled = true;
  label.innerHTML = '<span class="spinner"></span> Summarizing…';

  const resultArea = document.getElementById('result-area');
  const output = document.getElementById('summary-output');

  try {
    const data = await apiSummarize(text, summaryLength, summaryStyle);
    const summary = data.summary || data.result || '';
    state.currentSummary = summary;
    output.textContent = summary;
    resultArea.classList.remove('hidden');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Summary ready!', 'success');
  } catch (err) {
    toast(err.message, 'error', 5000);
    output.textContent = `Error: ${err.message}`;
    resultArea.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    label.textContent = '✨ Summarize';
  }
});

// Copy summary
document.getElementById('btn-copy-summary').addEventListener('click', () => {
  if (!state.currentSummary) return;
  navigator.clipboard.writeText(state.currentSummary).then(() => toast('Copied!', 'success'));
});

// Save summary to library
document.getElementById('btn-save-summary').addEventListener('click', () => {
  if (!state.currentSummary) {
    toast('No summary to save.', 'error');
    return;
  }
  saveSummaryToLibrary(state.currentSummary, summaryLength, summaryStyle);
});

// Save document to library
document.getElementById('btn-save-doc').addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text) {
    toast('No document to save.', 'error');
    return;
  }
  saveDocToLibrary(text);
});

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

const fcStatus = document.getElementById('fc-status');

document.getElementById('btn-gen-flashcards').addEventListener('click', async () => {
  const text = state.currentText;
  if (!text) {
    toast('No document loaded. Go to Summarize and paste text or upload a PDF.', 'error');
    return;
  }

  const btn = document.getElementById('btn-gen-flashcards');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';
  showStatus(fcStatus, 'Generating flashcards…', 'info', true);

  try {
    const data = await apiFlashcards(text);
    const cards = data.flashcards || data.cards || [];
    if (!cards.length) throw new Error('No flashcards returned from backend.');
    state.currentFlashcards = cards;
    renderFlashcards(cards);
    hideStatus(fcStatus);
    toast(`${cards.length} flashcards generated!`, 'success');
  } catch (err) {
    showStatus(fcStatus, `Error: ${err.message}`, 'error');
    toast(err.message, 'error', 5000);
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate Flashcards';
  }
});

document.getElementById('btn-reveal-all').addEventListener('click', () => {
  document.querySelectorAll('.flashcard').forEach((fc) => fc.classList.add('revealed'));
});
document.getElementById('btn-hide-all').addEventListener('click', () => {
  document.querySelectorAll('.flashcard').forEach((fc) => fc.classList.remove('revealed'));
});

function renderFlashcards(cards) {
  const grid = document.getElementById('flashcard-grid');
  const empty = document.getElementById('fc-empty');
  grid.innerHTML = '';

  if (!cards.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  cards.forEach((card, index) => {
    const el = document.createElement('div');
    el.className = 'flashcard';
    el.dataset.index = index;

    el.innerHTML = `
      <div class="fc-q">${escHtml(card.question)}</div>
      <div class="fc-sep"></div>
      <div class="fc-a">${escHtml(card.answer)}</div>
      <div class="fc-edit-area">
        <textarea class="fc-edit-q" placeholder="Question">${escHtml(card.question)}</textarea>
        <textarea class="fc-edit-a" placeholder="Answer">${escHtml(card.answer)}</textarea>
        <div class="btn-row">
          <button class="btn btn-primary btn-sm fc-save-btn">💾 Save</button>
          <button class="btn btn-ghost btn-sm fc-cancel-btn">Cancel</button>
        </div>
      </div>
      <div class="fc-actions">
        <button class="fc-flip-btn">Show answer</button>
        <button class="btn btn-ghost btn-sm fc-edit-btn">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm fc-save-lib-btn">💾 Save</button>
        <button class="btn btn-danger btn-sm fc-del-btn">✕</button>
      </div>
    `;

    // Flip
    el.querySelector('.fc-flip-btn').addEventListener('click', () => {
      const revealed = el.classList.toggle('revealed');
      el.querySelector('.fc-flip-btn').textContent = revealed ? 'Hide answer' : 'Show answer';
    });

    // Edit
    el.querySelector('.fc-edit-btn').addEventListener('click', () => {
      el.classList.add('editing');
    });

    // Cancel edit
    el.querySelector('.fc-cancel-btn').addEventListener('click', () => {
      el.classList.remove('editing');
      // Restore fields from state
      el.querySelector('.fc-edit-q').value = state.currentFlashcards[index].question;
      el.querySelector('.fc-edit-a').value = state.currentFlashcards[index].answer;
    });

    // Save edit
    el.querySelector('.fc-save-btn').addEventListener('click', () => {
      const newQ = el.querySelector('.fc-edit-q').value.trim();
      const newA = el.querySelector('.fc-edit-a').value.trim();
      if (!newQ || !newA) { toast('Question and answer cannot be empty.', 'error'); return; }
      state.currentFlashcards[index] = { question: newQ, answer: newA };
      el.querySelector('.fc-q').textContent = newQ;
      el.querySelector('.fc-a').textContent = newA;
      el.classList.remove('editing');
      toast('Card updated!', 'success');
    });

    // Save to library
    el.querySelector('.fc-save-lib-btn').addEventListener('click', () => {
      saveFlashcardToLibrary(state.currentFlashcards[index]);
    });

    // Delete
    el.querySelector('.fc-del-btn').addEventListener('click', () => {
      state.currentFlashcards.splice(index, 1);
      renderFlashcards(state.currentFlashcards);
    });

    grid.appendChild(el);
  });
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

const quizStatus = document.getElementById('quiz-status');
let quizSubmitted = false;

document.getElementById('btn-gen-quiz').addEventListener('click', async () => {
  const text = state.currentText;
  if (!text) {
    toast('No document loaded. Go to Summarize and paste text or upload a PDF.', 'error');
    return;
  }

  const btn = document.getElementById('btn-gen-quiz');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';
  showStatus(quizStatus, 'Generating quiz…', 'info', true);

  try {
    const data = await apiQuiz(text);
    const quiz = data.quiz || data.questions || [];
    if (!quiz.length) throw new Error('No quiz questions returned from backend.');
    state.currentQuiz = quiz;
    quizSubmitted = false;
    renderQuiz(quiz);
    hideStatus(quizStatus);
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('btn-submit-quiz').classList.remove('hidden');
    document.getElementById('btn-retry-quiz').classList.add('hidden');
    toast(`${quiz.length} questions generated!`, 'success');
  } catch (err) {
    showStatus(quizStatus, `Error: ${err.message}`, 'error');
    toast(err.message, 'error', 5000);
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate Quiz';
  }
});

document.getElementById('btn-submit-quiz').addEventListener('click', () => {
  gradeQuiz();
});

document.getElementById('btn-retry-quiz').addEventListener('click', () => {
  quizSubmitted = false;
  renderQuiz(state.currentQuiz);
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('btn-submit-quiz').classList.remove('hidden');
  document.getElementById('btn-retry-quiz').classList.add('hidden');
});

function renderQuiz(questions) {
  const container = document.getElementById('quiz-container');
  const empty = document.getElementById('quiz-empty');
  container.innerHTML = '';

  if (!questions.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  questions.forEach((q, qIdx) => {
    const el = document.createElement('div');
    el.className = 'quiz-question';
    el.dataset.index = qIdx;

    const optionsHtml = (q.options || []).map((opt, oIdx) => `
      <label class="quiz-option" data-q="${qIdx}" data-o="${oIdx}">
        <input type="radio" name="q${qIdx}" value="${oIdx}" aria-label="${escHtml(opt)}" />
        <span>${escHtml(opt)}</span>
      </label>
    `).join('');

    el.innerHTML = `
      <div class="q-text"><strong>Q${qIdx + 1}.</strong> ${escHtml(q.question)}</div>
      <div class="quiz-options">${optionsHtml}</div>
      <div class="quiz-explanation">${escHtml(q.explanation || '')}</div>
    `;

    // Highlight selected option
    el.querySelectorAll('.quiz-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        if (quizSubmitted) return;
        el.querySelectorAll('.quiz-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    container.appendChild(el);
  });
}

function gradeQuiz() {
  const questions = state.currentQuiz;
  if (!questions.length) return;

  quizSubmitted = true;
  let correct = 0;

  questions.forEach((q, qIdx) => {
    const el = document.querySelector(`.quiz-question[data-index="${qIdx}"]`);
    if (!el) return;

    const selected = el.querySelector(`input[name="q${qIdx}"]:checked`);
    const explanation = el.querySelector('.quiz-explanation');
    explanation.classList.add('shown');

    const options = el.querySelectorAll('.quiz-option');
    const correctText = q.answer || q.correct_answer || '';

    options.forEach((opt, oIdx) => {
      const optText = (q.options || [])[oIdx] || '';
      const isCorrect =
        optText === correctText ||
        String(oIdx) === String(q.answer) ||
        oIdx === q.answer_index;

      if (isCorrect) {
        opt.classList.add('correct');
      }

      if (selected) {
        const selIdx = parseInt(selected.value, 10);
        if (oIdx === selIdx && isCorrect) correct++;
        if (oIdx === selIdx && !isCorrect) opt.classList.add('wrong');
      }

      // Disable inputs
      const inp = opt.querySelector('input');
      if (inp) inp.disabled = true;
    });
  });

  const resultBar = document.getElementById('quiz-result');
  const pct = Math.round((correct / questions.length) * 100);
  resultBar.innerHTML = `
    <div class="score">${correct}/${questions.length}</div>
    <div class="score-label">${pct}% correct</div>
  `;
  resultBar.classList.remove('hidden');
  resultBar.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('btn-submit-quiz').classList.add('hidden');
  document.getElementById('btn-retry-quiz').classList.remove('hidden');

  // Save to library
  const quizData = { questions, score: { correct, total: questions.length, pct } };
  saveQuizToLibrary(quizData);
  toast(`Score: ${correct}/${questions.length} (${pct}%)`, pct >= 70 ? 'success' : 'info');
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

document.getElementById('btn-chat-send').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

// Auto-grow textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
});

async function sendChatMessage() {
  const question = chatInput.value.trim();
  if (!question) return;

  const text = state.currentText;
  if (!text) {
    toast('No document loaded. Go to Summarize and paste text or upload a PDF first.', 'error');
    return;
  }

  appendChatMsg('user', question);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  state.chatHistory.push({ role: 'user', content: question });

  const thinkingEl = appendChatThinking();

  const sendBtn = document.getElementById('btn-chat-send');
  sendBtn.disabled = true;

  try {
    const data = await apiChat(text, question, state.chatHistory);
    const answer = data.answer || data.response || '';
    const evidence = data.evidence || data.snippets || [];

    thinkingEl.remove();
    appendChatMsg('assistant', answer, evidence);
    state.chatHistory.push({ role: 'assistant', content: answer });
  } catch (err) {
    thinkingEl.remove();
    appendChatMsg('assistant', `⚠️ Error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function appendChatMsg(role, content, evidence = []) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = content;
  msgEl.appendChild(bubble);

  if (role === 'assistant' && evidence.length) {
    const evEl = document.createElement('div');
    evEl.className = 'chat-evidence';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'evidence-toggle';
    toggleBtn.textContent = `📎 Show evidence (${evidence.length})`;
    const snippetsEl = document.createElement('div');
    snippetsEl.className = 'evidence-snippets';
    evidence.forEach((ev) => {
      const snip = document.createElement('div');
      snip.className = 'evidence-snippet';
      snip.textContent = ev.snippet || ev;
      snippetsEl.appendChild(snip);
    });
    toggleBtn.addEventListener('click', () => {
      const isOpen = snippetsEl.classList.toggle('open');
      toggleBtn.textContent = isOpen
        ? `📎 Hide evidence (${evidence.length})`
        : `📎 Show evidence (${evidence.length})`;
    });
    evEl.appendChild(toggleBtn);
    evEl.appendChild(snippetsEl);
    msgEl.appendChild(evEl);
  }

  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgEl;
}

function appendChatThinking() {
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg assistant';
  msgEl.innerHTML = '<div class="chat-bubble"><span class="spinner"></span> Thinking…</div>';
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgEl;
}

document.getElementById('btn-clear-chat').addEventListener('click', () => {
  chatMessages.innerHTML = '';
  state.chatHistory = [];
  appendChatMsg('assistant', '👋 Chat cleared. Ask me anything about your document.');
  toast('Chat cleared.', 'info');
});

document.getElementById('btn-save-chat').addEventListener('click', () => {
  if (!state.chatHistory.length) {
    toast('No chat history to save.', 'error');
    return;
  }
  saveChatHistoryToLibrary(state.chatHistory);
});

// ---------------------------------------------------------------------------
// Library – persistence helpers
// ---------------------------------------------------------------------------

function saveDocToLibrary(text) {
  const docs = lsGet(LS_KEYS.DOCS, []);
  const doc = {
    id: Date.now(),
    title: text.slice(0, 60).trim() + (text.length > 60 ? '…' : ''),
    text,
    savedAt: new Date().toISOString(),
  };
  docs.unshift(doc);
  lsSet(LS_KEYS.DOCS, docs);
  toast('Document saved to library!', 'success');
}

function saveSummaryToLibrary(summary, length, style) {
  const summaries = lsGet(LS_KEYS.SUMMARIES, []);
  const item = {
    id: Date.now(),
    title: summary.slice(0, 60).trim() + (summary.length > 60 ? '…' : ''),
    summary,
    length,
    style,
    savedAt: new Date().toISOString(),
  };
  summaries.unshift(item);
  lsSet(LS_KEYS.SUMMARIES, summaries);
  toast('Summary saved to library!', 'success');
}

function saveFlashcardToLibrary(card) {
  const sets = lsGet(LS_KEYS.FLASHCARD_SETS, []);
  // Add individual card as a set of 1, or group with existing if possible
  sets.unshift({
    id: Date.now(),
    title: card.question.slice(0, 60),
    cards: [card],
    savedAt: new Date().toISOString(),
  });
  lsSet(LS_KEYS.FLASHCARD_SETS, sets);
  toast('Flashcard saved to library!', 'success');
}

function saveFlashcardSetToLibrary(cards) {
  const sets = lsGet(LS_KEYS.FLASHCARD_SETS, []);
  sets.unshift({
    id: Date.now(),
    title: `Set of ${cards.length} cards`,
    cards,
    savedAt: new Date().toISOString(),
  });
  lsSet(LS_KEYS.FLASHCARD_SETS, sets);
  toast(`Flashcard set (${cards.length} cards) saved!`, 'success');
}

function saveQuizToLibrary(quizData) {
  const quizzes = lsGet(LS_KEYS.QUIZZES, []);
  quizzes.unshift({
    id: Date.now(),
    title: `Quiz – ${quizData.score.correct}/${quizData.score.total} (${quizData.score.pct}%)`,
    ...quizData,
    savedAt: new Date().toISOString(),
  });
  lsSet(LS_KEYS.QUIZZES, quizzes);
}

function saveChatHistoryToLibrary(history) {
  const chats = lsGet(LS_KEYS.CHAT_HISTORY, []);
  chats.unshift({
    id: Date.now(),
    title: `Chat – ${history.length} messages`,
    history,
    savedAt: new Date().toISOString(),
  });
  lsSet(LS_KEYS.CHAT_HISTORY, chats);
  toast('Chat history saved!', 'success');
}

// ---------------------------------------------------------------------------
// Library – render
// ---------------------------------------------------------------------------

function renderLibrary() {
  renderLibSection('docs', LS_KEYS.DOCS, (item) => ({
    title: item.title,
    meta: `Saved ${fmtDate(item.savedAt)}`,
    onLoad: () => {
      inputText.value = item.text;
      state.currentText = item.text;
      navigateTo('summarize');
      toast('Document loaded.', 'success');
    },
  }));

  renderLibSection('summaries', LS_KEYS.SUMMARIES, (item) => ({
    title: item.title,
    meta: `${item.length} · ${item.style} · ${fmtDate(item.savedAt)}`,
    onLoad: () => {
      state.currentSummary = item.summary;
      document.getElementById('summary-output').textContent = item.summary;
      document.getElementById('result-area').classList.remove('hidden');
      navigateTo('summarize');
    },
  }));

  renderLibSection('flashcards', LS_KEYS.FLASHCARD_SETS, (item) => ({
    title: item.title,
    meta: `${item.cards.length} cards · ${fmtDate(item.savedAt)}`,
    onLoad: () => {
      state.currentFlashcards = item.cards;
      renderFlashcards(item.cards);
      navigateTo('study');
    },
  }));

  renderLibSection('quizzes', LS_KEYS.QUIZZES, (item) => ({
    title: item.title,
    meta: `${item.questions ? item.questions.length : 0} questions · ${fmtDate(item.savedAt)}`,
    onLoad: () => {
      if (item.questions) {
        state.currentQuiz = item.questions;
        renderQuiz(item.questions);
        navigateTo('study');
        // Switch to quiz sub-tab
        document.querySelector('[data-study-tab="quiz"]').click();
      }
    },
  }));
}

function renderLibSection(key, lsKey, mapper) {
  const grid = document.getElementById(`lib-${key}-grid`);
  const empty = document.getElementById(`lib-${key}-empty`);
  const items = lsGet(lsKey, []);

  grid.innerHTML = '';
  if (!items.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  items.forEach((item) => {
    const { title, meta, onLoad } = mapper(item);
    const card = document.createElement('div');
    card.className = 'lib-card';
    card.innerHTML = `
      <div class="lib-title">${escHtml(title)}</div>
      <div class="lib-meta">${escHtml(meta)}</div>
      <button class="lib-del" title="Delete" aria-label="Delete item">✕</button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('lib-del')) return;
      onLoad();
    });
    card.querySelector('.lib-del').addEventListener('click', () => {
      const allItems = lsGet(lsKey, []);
      const updated = allItems.filter((i) => i.id !== item.id);
      lsSet(lsKey, updated);
      renderLibrary();
      toast('Deleted.', 'info');
    });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const backendUrlInput = document.getElementById('setting-backend-url');

// Load saved backend URL
backendUrlInput.value = lsGet(LS_KEYS.BACKEND_URL, '') || '';

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const url = backendUrlInput.value.trim();
  lsSet(LS_KEYS.BACKEND_URL, url);
  toast('Settings saved!', 'success');
});

document.getElementById('btn-test-backend').addEventListener('click', async () => {
  const testResult = document.getElementById('backend-test-result');
  const url = backendUrlInput.value.trim();
  if (!url) {
    showStatus(testResult, 'No backend URL set.', 'warning');
    return;
  }
  showStatus(testResult, 'Testing connection…', 'info', true);
  try {
    const resp = await fetch(`${url.replace(/\/$/, '')}/api/health`, { method: 'GET' });
    if (resp.ok) {
      showStatus(testResult, '✅ Connection successful!', 'success');
    } else {
      showStatus(testResult, `⚠️ Server responded with status ${resp.status}`, 'warning');
    }
  } catch (err) {
    showStatus(testResult, `❌ Could not connect: ${err.message}`, 'error');
  }
});

document.getElementById('btn-clear-library').addEventListener('click', () => {
  if (!confirm('This will delete all saved documents, summaries, flashcards, and quizzes. Are you sure?')) return;
  Object.values(LS_KEYS).forEach((k) => {
    if (k !== LS_KEYS.BACKEND_URL) localStorage.removeItem(k);
  });
  toast('All library data cleared.', 'info');
});

// ---------------------------------------------------------------------------
// Study page – save all flashcards
// ---------------------------------------------------------------------------

// Add "Save All to Library" button dynamically to the flashcards tab
const saveAllBtn = document.createElement('button');
saveAllBtn.className = 'btn btn-secondary';
saveAllBtn.textContent = '💾 Save All to Library';
saveAllBtn.id = 'btn-save-all-flashcards';
document.querySelector('#study-tab-flashcards .btn-row').appendChild(saveAllBtn);

saveAllBtn.addEventListener('click', () => {
  if (!state.currentFlashcards.length) {
    toast('No flashcards to save.', 'error');
    return;
  }
  saveFlashcardSetToLibrary(state.currentFlashcards);
});

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
