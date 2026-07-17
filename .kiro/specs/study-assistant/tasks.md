# Implementation Plan: Study Assistant

## Overview

Implement a Next.js (JavaScript, Pages Router) study assistant app that generates flashcards and quiz questions from free-form text using an LLM via a server-side API route. The app renders the content in interactive flashcard and quiz modes, with hard-card and wrong-answer re-test flows.

---

## Tasks

- [x] 1. Bootstrap project structure and global styles
  - Initialise a Next.js (JavaScript, Pages Router) project with `create-next-app` (no TypeScript, no App Router)
  - Create the directory structure: `pages/`, `pages/api/`, `components/`, `styles/`
  - Add `styles/globals.css` with CSS custom properties, box-sizing reset, `overflow-x: hidden` on body, and responsive utility classes
  - Add a `.env.local` file with a placeholder `LLM_API_KEY=` entry and ensure it is listed in `.gitignore`
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement the API route
  - [x] 2.1 Create `pages/api/generate.js` with the LLM proxy
    - Read `process.env.LLM_API_KEY` server-side only; never include it in any response body
    - Accept `POST` requests with `{ text }` JSON body; return `400` if `text` is missing or empty
    - Build the structured prompt instructing the LLM to return `{ flashcards, questions }` JSON
    - Call the LLM HTTP endpoint with a 30-second `AbortSignal` timeout; return `504` on timeout
    - Return `502` with a human-readable message if the LLM returns a non-200 status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 5.5_

  - [x] 2.2 Implement `validateStudyContent` in the API route
    - Validate that `data.flashcards` is an array where every element has non-empty `front` and `back` strings
    - Validate that `data.questions` is an array where every element has a non-empty `question`, exactly four non-empty `options` strings, and an integer `correctIndex` in [0, 3]
    - Return `502` with a descriptive error message if parsing or validation fails
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.3 Write property tests for the API route
    - **Property 2: API key never appears in API route response** — for any request, assert response body string does not contain the `LLM_API_KEY` value
    - **Validates: Requirements 2.1**
    - **Property 3: API route propagates LLM errors as non-200 responses** — for any mocked LLM non-200 status, assert API route returns non-200 with non-empty error string
    - **Validates: Requirements 2.4**
    - **Property 4: Validation rejects malformed LLM responses** — generate arbitrary malformed JSON payloads and assert each returns non-200 with a descriptive error
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [x] 3. Implement `InputPanel` component
  - [x] 3.1 Create `components/InputPanel.js`
    - Render a `<textarea>` with `maxLength={20000}` and a submit `<button>`
    - Disable both when `isLoading === true`; disable submit also when `value.trim() === ''`
    - All interactive elements must have `min-height: 44px; min-width: 44px`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.2_

  - [ ]* 3.2 Write property test for InputPanel submission guard
    - **Property 1: Empty and whitespace-only input disables submission** — for any string of only whitespace characters, assert the submit button has the `disabled` attribute
    - **Validates: Requirements 1.3**

- [x] 4. Implement `ModeSelector` component
  - Create `components/ModeSelector.js` rendering two toggle buttons (`Flashcard` / `Quiz`)
  - Highlight the active mode; call `onChange(mode)` on click
  - Component is only rendered when `studyContent !== null`
  - _Requirements: 6.1, 7.1, 8.1_

- [x] 5. Implement `FlashcardMode` component
  - [x] 5.1 Create `components/FlashcardMode.js` with deck and navigation state
    - Initialise `deck`, `fullDeck`, `cardIndex`, `flipped`, `hardCards`, `deckComplete` on mount from `props.flashcards`
    - Render the current card showing `front` by default; toggle to `back` on flip control click
    - Render next/previous navigation buttons; clamp index within `[0, deck.length - 1]`
    - Display "X / N" counter using `cardIndex + 1` and `deck.length`
    - Provide a "Mark as Hard" button that appends the current card to `hardCards`
    - When `cardIndex` reaches the last card, set `deckComplete = true` and offer "Re-test Hard Cards" if `hardCards.length > 0`
    - When "Re-test Hard Cards" is chosen, replace `deck` with `hardCards` and reset `cardIndex` to 0
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 5.2 Write property tests for FlashcardMode
    - **Property 7: Flashcard flip is a round-trip** — for any card, toggling flip an even number of times restores `flipped` to its original value
    - **Validates: Requirements 6.2, 6.3**
    - **Property 8: Navigation index stays within deck bounds** — for any deck length N and any sequence of next/previous actions, assert index ∈ [0, N−1] and counter text equals `(index+1) / N`
    - **Validates: Requirements 6.4, 6.5**
    - **Property 9: Hard Cards collection and re-test deck invariant** — for any subset of cards marked hard, choosing re-test produces a deck equal to the hard cards set with index 0
    - **Validates: Requirements 6.6, 6.7, 6.8**

- [x] 6. Implement `QuizMode` component
  - [x] 6.1 Create `components/QuizMode.js` with question and scoring state
    - Initialise `questions`, `fullQuestions`, `qIndex`, `selectedIndex`, `wrongAnswers`, `quizComplete`, `score` on mount from `props.questions`
    - Render one question at a time with its four answer option buttons
    - On option selection, set `selectedIndex`, highlight correct/incorrect answers, and increment `score` if correct; record wrong answers with `{ question, selectedIndex }`
    - Provide a "Next" button (enabled only after an answer is selected) to advance `qIndex`
    - When the last question is answered and "Next" is pressed, set `quizComplete = true` and display score summary and wrong-answer breakdown
    - Offer "Re-test Wrong Answers" if `wrongAnswers.length > 0`; replace `questions` with the wrong-answer question objects and reset progress
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 6.2 Write property tests for QuizMode
    - **Property 10: Quiz score equals correct answer count** — for any sequence of answer selections, assert displayed score equals count of selections where `selectedIndex === correctIndex`
    - **Validates: Requirements 7.3, 7.5**
    - **Property 11: Wrong-answer re-test deck invariant** — for any completed quiz, re-test deck contains exactly the questions where the user's answer was wrong, with index reset to 0
    - **Validates: Requirements 7.6, 7.7**

- [x] 7. Wire everything together in `pages/index.js`
  - [x] 7.1 Implement root page state and `handleSubmit`
    - Declare `inputText`, `studyContent`, `uiState`, `errorMessage`, `activeMode`, `abortRef` state/ref
    - In `handleSubmit`: abort any existing `abortRef.current`, create a new `AbortController`, set a 30-second `setTimeout` that aborts the controller, call `fetch('/api/generate', { signal })`, clear the timeout on resolution
    - On success: call `setStudyContent(data)` and `setUiState('idle')`
    - On `AbortError`: return without updating UI (stale-request guard)
    - On other errors: set `uiState('error')` and `setErrorMessage`
    - _Requirements: 1.4, 1.5, 4.1, 4.2, 5.1, 5.2, 5.5_

  - [x] 7.2 Render Empty, Loading, Error, and Content states
    - Empty State (`studyContent === null && uiState === 'idle'`): render a prompt message
    - Loading State (`uiState === 'loading'`): render a visible spinner or loading indicator in place of the content area
    - Error State (`uiState === 'error'`): render the `errorMessage` and a "Retry" button that calls `handleSubmit`
    - Content State: render `<ModeSelector>` and conditionally render `<FlashcardMode>` or `<QuizMode>` based on `activeMode`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 7.3 Write property tests for stale response prevention
    - **Property 5: New submission cancels in-flight request** — simulate two successive calls to `handleSubmit`; assert the first `AbortController` is aborted before the second fetch is dispatched and the UI is not updated from the first response
    - **Validates: Requirements 4.1, 4.2**
    - **Property 6: All failure modes produce an Error State** — for network error, non-200 response, validation failure, and timeout, assert `uiState` transitions to `'error'` with a non-empty `errorMessage`
    - **Validates: Requirements 5.2, 5.5**

  - [ ]* 7.4 Write property test for mode switching
    - **Property 12: Mode switch resets destination mode to full original content** — for any mode switch event, assert the newly active component mounts with `index = 0`, no hard/wrong marks, and content equal to the full original `studyContent`
    - **Validates: Requirements 8.2, 8.3**

- [x] 8. Checkpoint — Ensure all tests pass
  - Run `npm test` (or equivalent) and verify all passing; ask the user if any questions arise before continuing.

- [x] 9. Apply responsive layout and accessibility polish
  - [x] 9.1 Add responsive CSS rules in `styles/globals.css`
    - Single-column layout below 640px with `padding: 1rem`
    - Card/quiz panel gets `max-width: 600px; margin: auto` at 640px+
    - Optional side-by-side input + content layout at 1024px+
    - _Requirements: 9.1, 9.3_

  - [x] 9.2 Audit and enforce touch target sizes and accessibility attributes
    - Verify all `<button>` elements have `min-height: 44px; min-width: 44px`
    - Add `aria-label` or visible labels to icon-only controls; ensure mode selector buttons use `aria-pressed`
    - Confirm no horizontal overflow at 320px viewport width
    - _Requirements: 9.1, 9.2_

- [x] 10. Create README.md
  - Write `README.md` at the project root with:
    - Step-by-step setup instructions (install deps, set `LLM_API_KEY` in `.env.local`, run `npm run dev`)
    - AI-generated content disclaimer (output may be inaccurate or incomplete)
    - Known limitations section
    - Approximate time-spent record
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Run full test suite; verify no regressions; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests validate universal correctness properties from the design document.
- Unit tests validate specific examples and edge cases.
- The `abortRef` pattern is key to stale-response safety — treat it as a required correctness mechanism, not an optimisation.
- LLM provider choice (Gemini / Groq / OpenRouter free tier) is configured via `LLM_API_KEY`; the API route should be written to be easily swappable.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4", "5.1", "6.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "5.2", "6.2"] },
    { "id": 2, "tasks": ["2.3", "7.1"] },
    { "id": 3, "tasks": ["7.2", "9.1", "9.2"] },
    { "id": 4, "tasks": ["7.3", "7.4", "10"] }
  ]
}
```
