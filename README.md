# Study Assistant

A Next.js web app that turns your notes or any topic into flashcards and multiple-choice quiz questions using an LLM. Paste in your study material, hit Generate, then flip through cards or take a quiz — with the option to re-test only the hard or wrong items.

## Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd Study_assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the API key**

   Create a `.env.local` file in the project root (or copy from `.env.local.example` if provided) and add:
   ```
   LLM_API_KEY=your_key_here
   ```
   Get a free API key from [Groq](https://console.groq.com). The app uses the `llama-3.3-70b-versatile` model.

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Paste your notes or type a topic into the text area.
2. Click **Generate** to send the text to the LLM.
3. Once content loads, choose **Flashcard Mode** or **Quiz Mode** from the mode selector.
   - In Flashcard Mode: flip cards, navigate with Next/Prev, and mark difficult cards as "Hard". After finishing the deck, you can re-test only the hard cards.
   - In Quiz Mode: answer each multiple-choice question, get instant feedback, and re-test any questions you got wrong.
4. To start fresh, paste new text and generate again.

## AI Usage Note

- **Tool assistance**: AI (Kiro/Claude) was used to help scaffold components, write the API route, and suggest CSS patterns. All generated code was reviewed and understood before use.
- **Generated content disclaimer**: The flashcards and quiz questions are produced by the Groq LLM. Output may be inaccurate, incomplete, or contain errors. Always verify important information from authoritative sources before relying on it for exams or critical decisions.

## Known Limitations

- **Content quality depends on input**: Short or vague inputs may produce thin or low-quality flashcards and questions. More detailed notes yield better results.
- **No session persistence**: Refreshing the page loses all generated content. There is no save/reload feature.
- **Timeout**: The app imposes a 30-second timeout on generation requests. Very long inputs or slow network connections may cause timeouts.
- **No TypeScript**: The project uses plain JavaScript; types are documented via JSDoc comments only.
- **No streaming**: Responses arrive all at once rather than streaming in progressively.
- **Stretch features not implemented**: Streaming responses, a refinement/re-generation loop, and save/reload functionality were scoped out and are not available in this version.

## Time Spent

Approximately **8 hours** total:

| Phase | Time |
|---|---|
| Project planning, spec creation, architecture decisions | ~1 hour |
| Core component implementation (FlashcardMode, QuizMode, InputPanel, ModeSelector) | ~3 hours |
| API route, LLM integration, error handling, stale-request prevention | ~2 hours |
| Responsive CSS, accessibility audit, README | ~1 hour |
| Testing, debugging, final polish | ~1 hour |
