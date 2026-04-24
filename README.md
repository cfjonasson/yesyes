# AI Study Summarizer

An AI-powered study tool that summarizes documents, generates flashcards, creates quizzes, and provides a grounded chat assistant — all in your browser.

## Features

- **Smart Summarization** — Paste text or upload a PDF (up to 25MB) and get a structured summary with key takeaways and an outline
- **Customizable Output** — Choose summary length (Short / Medium / Long) and style (Bullets / Paragraph)
- **Flashcards** — Auto-generated, editable Q&A flashcards for active recall
- **Quiz** — Auto-generated multiple-choice and short-answer quiz with instant grading and explanations
- **Grounded Chat** — Ask questions about the document; the AI answers only from the source material with evidence citations
- **Library** — All documents saved locally in browser localStorage — no account required

## Tech Stack

- **Next.js 15** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS v3**
- **OpenAI API** (gpt-4o-mini)
- **pdf-parse** for PDF text extraction
- **Browser LocalStorage** for persistence (no database)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd yesyes
npm install
```

### 2. Configure environment variables

Copy the example env file and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-...
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/extract` | POST | Extract text from PDF (FormData with `file`) |
| `/api/summarize` | POST | Generate structured summary |
| `/api/flashcards` | POST | Generate flashcards |
| `/api/quiz` | POST | Generate quiz questions |
| `/api/chat` | POST | Grounded Q&A chat |
