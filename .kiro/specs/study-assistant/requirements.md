# Requirements Document

## Introduction

A Next.js study assistant application that accepts free-form text (notes or a topic) from the user, sends it to an LLM via a server-side API route, and receives structured JSON containing both flashcard data and quiz question data. The user can review the generated content in either flashcard mode or quiz mode, with support for re-testing hard or missed items. The application handles all error and loading states gracefully and never exposes the AI provider API key to the browser.

## Glossary

- **Study Assistant**: The Next.js web application described in this document.
- **Input Panel**: The UI area containing the free-form text area and the submit control.
- **LLM**: The large language model provider (Gemini, Groq, or OpenRouter free tier) used to generate study content.
- **API Route**: The Next.js server-side route (`/api/generate`) that proxies all LLM requests and holds the API key.
- **Study Content**: The structured JSON object returned by the LLM containing both flashcard data and quiz question data.
- **Flashcard**: An object with a `front` field (term/question) and a `back` field (definition/answer).
- **Flashcard Deck**: The ordered collection of Flashcards produced from a single generation.
- **Hard Card**: A Flashcard that the user has explicitly marked as difficult during a review session.
- **Quiz Question**: A multiple-choice question object with a `question` field, an `options` array of four strings, and a `correctIndex` integer indicating the correct option.
- **Quiz**: The ordered collection of Quiz Questions produced from a single generation.
- **Flashcard Mode**: The application view in which the user reviews the Flashcard Deck.
- **Quiz Mode**: The application view in which the user answers Quiz Questions.
- **Score**: The count of correctly answered Quiz Questions in a completed Quiz.
- **In-flight Request**: An LLM API call that has been dispatched but has not yet resolved or been cancelled.
- **Stale Response**: A response from an In-flight Request that was superseded by a newer generation request.
- **Loading State**: UI feedback shown while an async operation is pending.
- **Error State**: UI feedback shown when an async operation fails or returns invalid data.
- **Empty State**: UI feedback shown when no Study Content has been generated yet.

---

## Requirements

### Requirement 1 — Free-Form Text Input

**User Story:** As a student, I want to paste my notes or a topic into a text area and trigger AI generation, so that I can quickly create study materials without manual formatting.

#### Acceptance Criteria

1. THE Study Assistant SHALL render a multi-line text area in the Input Panel that accepts free-form text of any length up to 20,000 characters.
2. THE Study Assistant SHALL render a submit button in the Input Panel that initiates a generation request when activated.
3. WHILE the text area is empty, THE Study Assistant SHALL keep the submit button disabled.
4. WHEN the submit button is activated, THE Study Assistant SHALL display a Loading State until the generation request completes or fails.
5. WHILE a generation request is in progress, THE Study Assistant SHALL keep the submit button disabled to prevent concurrent submissions.

---

### Requirement 2 — Server-Side API Proxying

**User Story:** As a developer, I want the LLM API key to remain server-side only, so that the key is never exposed to browser clients.

#### Acceptance Criteria

1. THE API Route SHALL read the LLM provider API key exclusively from a server-side environment variable and SHALL NOT include the key in any response sent to the browser.
2. WHEN the Study Assistant sends a generation request, THE Study Assistant SHALL send the request to the Next.js API Route (`/api/generate`) and not directly to the LLM provider.
3. THE API Route SHALL forward the user's input text to the configured LLM provider and return the LLM's structured response to the browser.
4. IF the LLM provider returns an HTTP error status, THEN THE API Route SHALL return a non-200 HTTP status to the Study Assistant along with a human-readable error message.

---

### Requirement 3 — Structured JSON Generation

**User Story:** As a student, I want the AI to generate both flashcards and quiz questions from my input in a single request, so that I can switch between study modes without waiting for a second generation.

#### Acceptance Criteria

1. WHEN the API Route forwards the user's input to the LLM, THE API Route SHALL instruct the LLM to return a JSON object containing a `flashcards` array and a `questions` array.
2. THE API Route SHALL validate that the LLM response is parseable JSON before forwarding it to the Study Assistant.
3. THE API Route SHALL validate that the parsed JSON contains a `flashcards` array where each element has a non-empty string `front` field and a non-empty string `back` field.
4. THE API Route SHALL validate that the parsed JSON contains a `questions` array where each element has a non-empty string `question` field, an `options` array of exactly four non-empty strings, and an integer `correctIndex` in the range 0–3 inclusive.
5. IF the LLM response fails any validation check in criteria 2–4, THEN THE API Route SHALL return a non-200 HTTP status and a descriptive error message rather than forwarding the malformed data.

---

### Requirement 4 — Stale Response Prevention

**User Story:** As a student, I want submitting a new request to cancel any previous in-progress request, so that an old slow response never overwrites the current results.

#### Acceptance Criteria

1. WHEN the user activates the submit button while an In-flight Request exists, THE Study Assistant SHALL cancel the In-flight Request before dispatching the new request.
2. IF a Stale Response arrives after a newer request has been dispatched, THEN THE Study Assistant SHALL ignore the Stale Response and SHALL NOT update the UI with its data.

---

### Requirement 5 — Loading, Error, and Empty States

**User Story:** As a student, I want clear feedback for every async operation state, so that I always know whether the app is working, has failed, or has no content yet.

#### Acceptance Criteria

1. WHILE a generation request is in progress, THE Study Assistant SHALL display a visible Loading State indicator in place of the Study Content area.
2. IF a generation request fails for any reason (network error, HTTP error, validation failure, timeout), THEN THE Study Assistant SHALL display an Error State message describing the failure and a retry option.
3. WHILE no Study Content has been generated in the current session, THE Study Assistant SHALL display an Empty State message prompting the user to enter text and generate content.
4. WHEN a retry option is activated from the Error State, THE Study Assistant SHALL re-submit the most recent input text as a new generation request.
5. THE Study Assistant SHALL transition from Loading State to Error State within 30 seconds if no response has been received, treating the condition as a timeout failure.

---

### Requirement 6 — Flashcard Mode

**User Story:** As a student, I want to flip through AI-generated flashcards and mark difficult ones for re-review, so that I can focus my study time on the material I find hardest.

#### Acceptance Criteria

1. WHEN Study Content is available, THE Study Assistant SHALL render a mode selector that allows the user to switch to Flashcard Mode.
2. WHILE in Flashcard Mode, THE Study Assistant SHALL display one Flashcard at a time, showing the `front` field by default.
3. WHEN the user activates the flip control on a Flashcard, THE Study Assistant SHALL toggle the visible field between `front` and `back`.
4. WHILE in Flashcard Mode, THE Study Assistant SHALL provide next and previous controls to navigate sequentially through the Flashcard Deck.
5. WHILE in Flashcard Mode, THE Study Assistant SHALL display the current card index and total card count (e.g., "3 / 12").
6. WHILE in Flashcard Mode, THE Study Assistant SHALL provide a "Mark as Hard" control on each Flashcard that adds the card to the Hard Cards collection.
7. WHEN all Flashcards in the active deck have been reviewed, THE Study Assistant SHALL offer the option to re-test only the Hard Cards if the Hard Cards collection is non-empty.
8. WHEN the user chooses to re-test Hard Cards, THE Study Assistant SHALL replace the active deck with only the Hard Cards and reset the card index to 1.

---

### Requirement 7 — Quiz Mode

**User Story:** As a student, I want to answer multiple-choice quiz questions and re-test the ones I got wrong, so that I can identify and address gaps in my knowledge.

#### Acceptance Criteria

1. WHEN Study Content is available, THE Study Assistant SHALL render a mode selector that allows the user to switch to Quiz Mode.
2. WHILE in Quiz Mode, THE Study Assistant SHALL present Quiz Questions one at a time, each displaying the `question` text and four answer options derived from the `options` array.
3. WHEN the user selects an answer option, THE Study Assistant SHALL immediately indicate whether the selection was correct or incorrect and reveal the correct answer.
4. WHILE in Quiz Mode, THE Study Assistant SHALL provide a next control to advance to the following Quiz Question after an answer has been submitted.
5. WHEN all Quiz Questions in the active Quiz have been answered, THE Study Assistant SHALL display the Score and a breakdown of correct and incorrect answers.
6. WHEN the quiz results are displayed, THE Study Assistant SHALL offer the option to re-test only the incorrectly answered Quiz Questions if any exist.
7. WHEN the user chooses to re-test wrong answers, THE Study Assistant SHALL replace the active Quiz with only the incorrectly answered Quiz Questions and reset progress to the first question.

---

### Requirement 8 — Mode Switching

**User Story:** As a student, I want to freely switch between flashcard and quiz modes, so that I can choose the study method that suits me at any moment.

#### Acceptance Criteria

1. WHEN Study Content is available, THE Study Assistant SHALL display a mode selector control that allows switching between Flashcard Mode and Quiz Mode at any time.
2. WHEN the user switches modes, THE Study Assistant SHALL reset the newly entered mode to its initial state (first card/first question, no marks, no answers submitted).
3. WHEN the user switches modes, THE Study Assistant SHALL preserve the full original Flashcard Deck and Quiz so that the reset uses the complete generated content, not a filtered subset.

---

### Requirement 9 — Responsive Layout

**User Story:** As a student, I want the application to be usable on my phone as well as my laptop, so that I can study from any device.

#### Acceptance Criteria

1. THE Study Assistant SHALL render a usable layout at viewport widths from 320px to 1440px without horizontal scrolling.
2. THE Study Assistant SHALL ensure all interactive controls (buttons, text area, answer options) have a minimum touch target size of 44×44 CSS pixels on mobile viewports.
3. THE Study Assistant SHALL use a single-column layout on viewport widths below 640px and MAY use a wider layout on larger viewports.

---

### Requirement 10 — README Documentation

**User Story:** As a developer, I want a README that explains how to set up and run the project, so that I can get it running quickly and understand its constraints.

#### Acceptance Criteria

1. THE Study Assistant repository SHALL include a `README.md` file at the project root.
2. THE README.md SHALL include step-by-step setup instructions covering dependency installation, environment variable configuration (API key), and the command to start the development server.
3. THE README.md SHALL include a note disclosing that the application uses an AI language model to generate study content and that output may be inaccurate or incomplete.
4. THE README.md SHALL include a section listing known limitations of the application.
5. THE README.md SHALL include an approximate record of the time spent building the application.
