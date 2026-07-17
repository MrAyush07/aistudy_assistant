# Design Document — Study Assistant

## Overview

A Next.js (JavaScript, Pages Router) application that accepts free-form text, proxies a request to an LLM via a server-side API route, and renders the structured response as either an interactive flashcard deck or a multiple-choice quiz. The application never exposes the LLM API key to the browser.

---

## Architecture

```
Browser
  └── Pages (/)
        ├── InputPanel component
        ├── ModeSelector component
        ├── FlashcardMode component
        └── QuizMode component

  ↕ fetch /api/generate (JSON body: { text })

Next.js Server
  └── pages/api/generate.js
        ├── reads process.env.LLM_API_KEY
        ├── builds LLM prompt
        ├── calls LLM provider HTTP endpoint
        ├── validates JSON shape
        └── returns { flashcards, questions } or { error }
```

### Key Architectural Decisions

1. **Pages Router** — straightforward for a single-page app; no need for App Router complexity.
2. **No external state library** — React `useState`/`useReducer` is sufficient for the contained UI state.
3. **AbortController** — held in a `useRef` so it survives re-renders without causing them; cancelled before each new fetch.
4. **`setTimeout` + `AbortController`** — the 30-second timeout aborts the same controller, triggering the `AbortError` path.
5. **Validation in API route** — structural validation runs server-side so the browser never receives malformed data.

---

## Directory Structure

```
/
├── pages/
│   ├── index.js          # root page, composes all panels
│   └── api/
│       └── generate.js   # LLM proxy + validation
├── components/
│   ├── InputPanel.js
│   ├── ModeSelector.js
│   ├── FlashcardMode.js
│   └── QuizMode.js
├── styles/
│   └── globals.css       # CSS custom properties, reset, responsive utilities
├── .env.local            # LLM_API_KEY (git-ignored)
├── README.md
└── package.json
```

---

## Data Models

### StudyContent (returned by API route)

```js
/**
 * @typedef {Object} Flashcard
 * @property {string} front - term or question (non-empty)
 * @property {string} back  - definition or answer (non-empty)
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string}   question     - question text (non-empty)
 * @property {string[]} options      - exactly 4 non-empty strings
 * @property {number}   correctIndex - integer in [0, 3]
 */

/**
 * @typedef {Object} StudyContent
 * @property {Flashcard[]}    flashcards
 * @property {QuizQuestion[]} questions
 */
```

### Application UI State (`pages/index.js`)

```js
const [inputText, setInputText]       = useState('');
const [studyContent, setStudyContent] = useState(null);   // null = Empty State
const [uiState, setUiState]           = useState('idle'); // 'idle' | 'loading' | 'error'
const [errorMessage, setErrorMessage] = useState('');
const [activeMode, setActiveMode]     = useState('flashcard'); // 'flashcard' | 'quiz'
const abortRef                        = useRef(null);
```

### FlashcardMode State

```js
const [deck, setDeck]             = useState([]);    // active deck (full or hard-only)
const [fullDeck, setFullDeck]     = useState([]);    // original full deck
const [cardIndex, setCardIndex]   = useState(0);     // 0-based index
const [flipped, setFlipped]       = useState(false); // true = back visible
const [hardCards, setHardCards]   = useState([]);    // cards marked hard
const [deckComplete, setDeckComplete] = useState(false);
```

### QuizMode State

```js
const [questions, setQuestions]         = useState([]);   // active questions
const [fullQuestions, setFullQuestions] = useState([]);   // original full quiz
const [qIndex, setQIndex]               = useState(0);
const [selectedIndex, setSelectedIndex] = useState(null); // null = unanswered
const [wrongAnswers, setWrongAnswers]   = useState([]);   // { question, selectedIndex }
const [quizComplete, setQuizComplete]   = useState(false);
const [score, setScore]                 = useState(0);
```

---

## Component Interfaces

### `<InputPanel>`

```js
/**
 * @param {Object}   props
 * @param {string}   props.value        - current textarea value
 * @param {Function} props.onChange     - (e) => void
 * @param {Function} props.onSubmit     - () => void
 * @param {boolean}  props.isLoading    - disables button and textarea during request
 */
```

Behaviour:
- Submit button is `disabled` when `value.trim() === ''` or `isLoading === true`.
- Textarea has `maxLength={20000}`.
- Minimum touch target: 44 × 44 CSS px for all interactive elements.

### `<ModeSelector>`

```js
/**
 * @param {Object}   props
 * @param {'flashcard'|'quiz'} props.activeMode
 * @param {Function} props.onChange - (mode: 'flashcard'|'quiz') => void
 */
```

Shown only when `studyContent !== null`.

### `<FlashcardMode>`

```js
/**
 * @param {Object}      props
 * @param {Flashcard[]} props.flashcards - full generated deck
 */
```

Manages all internal deck state. Receives the full original deck via props on each mount; mode switch re-mounts the component, triggering a reset.

### `<QuizMode>`

```js
/**
 * @param {Object}        props
 * @param {QuizQuestion[]} props.questions - full generated quiz
 */
```

Same mount-reset strategy as `<FlashcardMode>`.

---

## API Route (`pages/api/generate.js`)

### Request

```
POST /api/generate
Content-Type: application/json

{ "text": "<user input string>" }
```

### Processing Flow

```
1. Read process.env.LLM_API_KEY
2. Build prompt (see Prompt Design below)
3. Call LLM HTTP endpoint with AbortSignal (30s timeout on server)
4. Parse response body as JSON
5. Validate shape (flashcards[], questions[])
6. Return 200 { flashcards, questions }
   OR 400/500 { error: "<message>" }
```

### Prompt Design

```js
const prompt = `
You are a study assistant. Given the following text, generate study materials.
Return ONLY a valid JSON object with no markdown fencing, in this exact shape:
{
  "flashcards": [
    { "front": "<term or question>", "back": "<definition or answer>" }
  ],
  "questions": [
    {
      "question": "<question text>",
      "options": ["<opt0>", "<opt1>", "<opt2>", "<opt3>"],
      "correctIndex": <0|1|2|3>
    }
  ]
}

Text:
${userText}
`;
```

### Validation Logic

```js
function validateStudyContent(data) {
  if (!Array.isArray(data.flashcards)) return 'Missing flashcards array';
  for (const [i, fc] of data.flashcards.entries()) {
    if (typeof fc.front !== 'string' || fc.front.trim() === '')
      return `flashcards[${i}].front is empty or missing`;
    if (typeof fc.back !== 'string' || fc.back.trim() === '')
      return `flashcards[${i}].back is empty or missing`;
  }
  if (!Array.isArray(data.questions)) return 'Missing questions array';
  for (const [i, q] of data.questions.entries()) {
    if (typeof q.question !== 'string' || q.question.trim() === '')
      return `questions[${i}].question is empty or missing`;
    if (!Array.isArray(q.options) || q.options.length !== 4)
      return `questions[${i}].options must be an array of exactly 4 strings`;
    if (q.options.some(o => typeof o !== 'string' || o.trim() === ''))
      return `questions[${i}].options contains an empty or non-string value`;
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3)
      return `questions[${i}].correctIndex must be an integer 0–3`;
  }
  return null; // valid
}
```

### Error Responses

| Condition | HTTP Status | Body |
|---|---|---|
| Missing/empty text | 400 | `{ error: "Input text is required" }` |
| LLM HTTP error | 502 | `{ error: "LLM provider error: <status>" }` |
| JSON parse failure | 502 | `{ error: "LLM returned non-JSON response" }` |
| Validation failure | 502 | `{ error: "<validation message>" }` |
| Timeout / network | 504 | `{ error: "Request timed out" }` |

---

## Stale Response Prevention

```js
// In pages/index.js

async function handleSubmit() {
  // Cancel any in-flight request
  if (abortRef.current) {
    abortRef.current.abort();
  }
  const controller = new AbortController();
  abortRef.current = controller;

  // 30-second client-side timeout
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  setUiState('loading');
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error);
    }
    const data = await res.json();
    setStudyContent(data);
    setUiState('idle');
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      // Stale request was cancelled — no UI update
      return;
    }
    setErrorMessage(err.message || 'An unknown error occurred');
    setUiState('error');
  }
}
```

The `return` inside the `AbortError` branch is the key guarantee: a cancelled (stale) request never transitions the UI.

---

## Mode Switching and Reset

```js
// In pages/index.js
function handleModeChange(mode) {
  setActiveMode(mode);
  // FlashcardMode and QuizMode reset on mount because activeMode
  // changes cause React to unmount/remount the active component
}
```

Each mode component initialises its own state from `studyContent` on mount:

```js
// FlashcardMode.js
useEffect(() => {
  setDeck(flashcards);
  setFullDeck(flashcards);
  setCardIndex(0);
  setFlipped(false);
  setHardCards([]);
  setDeckComplete(false);
}, []); // runs once on mount
```

This ensures that switching modes always resets to the complete original content.

---

## Responsive Layout

- Base: single-column, `padding: 1rem`, all elements `width: 100%`.
- Breakpoint at `640px`: card/quiz panel gets `max-width: 600px; margin: auto`.
- Breakpoint at `1024px`: optional side-by-side input + content layout.
- Touch targets: all `<button>` elements have `min-height: 44px; min-width: 44px`.
- No horizontal overflow: `box-sizing: border-box` globally, `overflow-x: hidden` on `body`.

---

## Error Handling Summary

| Scenario | Where Handled | User-visible Effect |
|---|---|---|
| Empty input | `InputPanel` (disabled button) | Submit button disabled |
| LLM provider error | API route → browser | Error State with message |
| Malformed LLM JSON | API route → browser | Error State with message |
| Network failure | `handleSubmit` catch | Error State with message |
| 30s client timeout | `AbortController` + catch | Error State "Request timed out" |
| Cancelled (stale) request | `AbortError` guard | Silent — no UI update |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Empty and whitespace-only input disables submission

*For any* string composed entirely of whitespace characters (including the empty string), the submit button should be in a disabled state and submission should not be possible.

**Validates: Requirements 1.3**

---

### Property 2: API key never appears in API route response

*For any* request to `/api/generate` (valid, invalid, or error-inducing), the HTTP response body shall not contain the value of the `LLM_API_KEY` environment variable.

**Validates: Requirements 2.1**

---

### Property 3: API route propagates LLM errors as non-200 responses

*For any* LLM provider response that carries a non-200 HTTP status, the API route shall return a non-200 response to the browser with a non-empty error message string.

**Validates: Requirements 2.4**

---

### Property 4: Validation rejects malformed LLM responses

*For any* string returned by the LLM that is either (a) not parseable as JSON, (b) contains a `flashcards` element with an empty `front` or `back`, or (c) contains a `questions` element with anything other than a non-empty `question`, exactly four non-empty `options`, and a `correctIndex` integer in [0, 3], the API route shall return a non-200 response with a descriptive error message.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

---

### Property 5: New submission cancels in-flight request

*For any* pair of successive generation requests where the first has not yet resolved, the first request's AbortController shall be aborted before the second fetch is dispatched, and any response from the first request shall never update the UI state.

**Validates: Requirements 4.1, 4.2**

---

### Property 6: All failure modes produce an Error State

*For any* generation attempt that fails — whether due to a network error, a non-200 HTTP response, a validation failure, or a timeout — the UI shall transition to an Error State that displays a description of the failure and provides a retry control.

**Validates: Requirements 5.2, 5.5**

---

### Property 7: Flashcard flip is a round-trip

*For any* flashcard, toggling the flip control an even number of times shall restore the card to the state it was in before the first flip; the front shall be visible after zero or any even number of flips from the initial unflipped state.

**Validates: Requirements 6.2, 6.3**

---

### Property 8: Navigation index stays within deck bounds

*For any* flashcard deck of length N and any sequence of next/previous navigation actions, the current card index shall always remain in the range [0, N−1], and the displayed "X / N" counter shall always equal `(index + 1) / N`.

**Validates: Requirements 6.4, 6.5**

---

### Property 9: Hard Cards collection and re-test deck invariant

*For any* subset of flashcards marked as hard, choosing to re-test hard cards shall produce an active deck whose contents are exactly the hard-marked cards and whose starting index is 0 (displayed as "1 / K" where K is the hard cards count).

**Validates: Requirements 6.6, 6.7, 6.8**

---

### Property 10: Quiz score equals correct answer count

*For any* completed quiz session with a sequence of answer selections, the displayed Score shall equal the count of selections where `selectedIndex === correctIndex` for the corresponding question.

**Validates: Requirements 7.3, 7.5**

---

### Property 11: Wrong-answer re-test deck invariant

*For any* completed quiz session, choosing to re-test wrong answers shall produce an active quiz whose questions are exactly those for which the user's selected option was not the correct option, with progress reset to the first question.

**Validates: Requirements 7.6, 7.7**

---

### Property 12: Mode switch resets destination mode to full original content

*For any* mode switch event, the destination mode shall initialise with its index reset to the first item, no marks or submitted answers carried over, and its content equal to the full original generated content (not any filtered subset from a previous re-test session).

**Validates: Requirements 8.2, 8.3**
