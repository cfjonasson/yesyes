# Study Summarizer

An AI-powered study tool that runs entirely as a static site on **GitHub Pages**.  
Upload a PDF or paste text → get a summary, flashcards, a quiz, and a grounded chat assistant.

---

## Live Site

`https://cfjonasson.github.io/yesyes/`

---

## Enabling GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under **Source**, select **Deploy from a branch** _or_ use the **GitHub Actions** source (recommended).
3. If using Actions source: set source to **GitHub Actions** – the workflow in `.github/workflows/pages.yml` deploys the `docs/` folder automatically on every push to `main`.
4. If using Branch source: set branch to `main` and folder to `/docs`.
5. Click **Save**. After 1–3 minutes the site will be live.

---

## Configuring the Backend URL

The frontend is purely static and has **no embedded API keys**.  
All AI calls go to a backend you control.

**Two ways to set the backend URL:**

### 1. In the app (recommended for users)
1. Open the live site.
2. Navigate to **Settings**.
3. Paste your backend base URL (e.g. `https://your-worker.your-subdomain.workers.dev`).
4. Click **Save Settings**.  
   The URL is stored in the browser's `localStorage` and used for all API calls.

### 2. In source code (for developers)
Edit `docs/app.js` and change the constant at the top of the file:

```js
const BACKEND_BASE_URL_DEFAULT = 'https://your-worker.your-subdomain.workers.dev';
```

---

## Backend – Cloudflare Workers (recommended)

Because GitHub Pages is static-only, all AI calls must go through a separate backend.  
**Cloudflare Workers** is the recommended choice: free tier, global edge, no cold starts.

### Quick Setup

1. [Sign up for Cloudflare](https://dash.cloudflare.com/sign-up) (free).
2. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Create a new Worker project:
   ```bash
   wrangler init study-summarizer-worker
   cd study-summarizer-worker
   ```
4. Add your OpenAI API key as a secret:
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```
5. Replace `src/index.js` with the implementation outline below.
6. Deploy:
   ```bash
   wrangler deploy
   ```
7. Copy the Worker URL and paste it in the app's **Settings** panel.

### Required Endpoints

All endpoints accept `POST` with `Content-Type: application/json` and return JSON.

#### `POST /api/summarize`

**Request:**
```json
{
  "text": "Full document text…",
  "length": "short | medium | long",
  "style": "bullets | paragraph"
}
```

**Response:**
```json
{ "summary": "…" }
```

---

#### `POST /api/flashcards`

**Request:**
```json
{ "text": "Full document text…" }
```

**Response:**
```json
{
  "flashcards": [
    { "question": "What is X?", "answer": "X is…" }
  ]
}
```

---

#### `POST /api/quiz`

**Request:**
```json
{ "text": "Full document text…" }
```

**Response:**
```json
{
  "quiz": [
    {
      "question": "Which of the following…?",
      "options": ["A", "B", "C", "D"],
      "answer": "B",
      "explanation": "Because…"
    }
  ]
}
```

---

#### `POST /api/chat`

**Request:**
```json
{
  "text": "Full document text…",
  "question": "What does the author say about X?",
  "history": [
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…" }
  ]
}
```

**Response:**
```json
{
  "answer": "According to the document…",
  "evidence": [
    { "snippet": "Relevant excerpt from the document…" }
  ]
}
```

---

### Cloudflare Worker Skeleton

```js
// src/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for GitHub Pages origin
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
    }

    const { text, length, style, question, history } = body;

    if (!text) {
      return Response.json({ error: 'Missing required field: text' }, { status: 400, headers: corsHeaders });
    }

    try {
      if (url.pathname === '/api/summarize') {
        const prompt = buildSummarizePrompt(text, length, style);
        const result = await callOpenAI(env.OPENAI_API_KEY, prompt);
        return Response.json({ summary: result }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/flashcards') {
        const prompt = buildFlashcardsPrompt(text);
        const result = await callOpenAI(env.OPENAI_API_KEY, prompt);
        const flashcards = JSON.parse(result);
        return Response.json({ flashcards }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/quiz') {
        const prompt = buildQuizPrompt(text);
        const result = await callOpenAI(env.OPENAI_API_KEY, prompt);
        const quiz = JSON.parse(result);
        return Response.json({ quiz }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/chat') {
        const prompt = buildChatPrompt(text, question, history || []);
        const result = await callOpenAI(env.OPENAI_API_KEY, prompt);
        const parsed = JSON.parse(result);
        return Response.json({ answer: parsed.answer, evidence: parsed.evidence || [] }, { headers: corsHeaders });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  },
};

async function callOpenAI(apiKey, messages, model = 'gpt-4o-mini') {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });
  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
  const data = await resp.json();
  return data.choices[0].message.content;
}

function buildSummarizePrompt(text, length = 'medium', style = 'bullets') {
  const lengthMap = { short: '3-5', medium: '6-10', long: '12-20' };
  const points = lengthMap[length] || '6-10';
  const styleInstr = style === 'bullets'
    ? `Use a bullet-point list with ${points} items.`
    : `Write ${points} sentences in paragraph form.`;
  return [
    { role: 'system', content: 'You are an expert study assistant. Summarize the provided text clearly and concisely.' },
    { role: 'user', content: `Summarize the following text. ${styleInstr}\n\nTEXT:\n${text.slice(0, 12000)}` },
  ];
}

function buildFlashcardsPrompt(text) {
  return [
    { role: 'system', content: 'You are a study assistant. Generate flashcards as a JSON array of objects with "question" and "answer" keys. Return ONLY valid JSON, no markdown.' },
    { role: 'user', content: `Generate 8-12 flashcards from this text:\n\n${text.slice(0, 12000)}` },
  ];
}

function buildQuizPrompt(text) {
  return [
    { role: 'system', content: 'You are a study assistant. Generate a multiple-choice quiz as a JSON array. Each item must have: question (string), options (array of 4 strings), answer (the exact text of the correct option), explanation (string). Return ONLY valid JSON, no markdown.' },
    { role: 'user', content: `Generate 5-8 quiz questions from this text:\n\n${text.slice(0, 12000)}` },
  ];
}

function buildChatPrompt(text, question, history) {
  const msgs = [
    { role: 'system', content: `You are a study assistant. Answer questions ONLY based on the document provided. If the answer is not in the document, say so. Include relevant evidence snippets. Respond as JSON with keys "answer" (string) and "evidence" (array of objects with key "snippet"). Return ONLY valid JSON.\n\nDOCUMENT:\n${text.slice(0, 10000)}` },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];
  return msgs;
}
```

---

## Project Structure

```
yesyes/
├── docs/               # Static site (GitHub Pages source)
│   ├── index.html      # Main HTML – all pages/tabs
│   ├── style.css       # Notion-inspired styles
│   └── app.js          # All frontend logic
├── .github/
│   └── workflows/
│       └── pages.yml   # Auto-deploy docs/ to GitHub Pages
└── README.md
```

---

## Features

| Feature | Details |
|---------|---------|
| 📝 Summarize | Paste text or upload PDF → AI summary |
| 📎 PDF extraction | In-browser via pdf.js (nothing uploaded) |
| ⚙️ Controls | Length (short/medium/long), style (bullets/paragraph) |
| 🗂 Flashcards | Generate, edit Q&A, save to library |
| ❓ Quiz | Multiple choice, grading, explanations |
| 💬 Chat | Grounded answers, evidence hidden by default |
| 📚 Library | LocalStorage – docs, summaries, flashcards, quizzes |
| ⚙️ Settings | Configurable backend URL, data management |
