const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30_000;

/**
 * Validates the parsed LLM response matches the expected StudyContent shape.
 * @param {unknown} data
 * @returns {string|null} error message, or null if valid
 */
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
    if (q.options.some((o) => typeof o !== 'string' || o.trim() === ''))
      return `questions[${i}].options contains an empty or non-string value`;
    if (
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex > 3
    )
      return `questions[${i}].correctIndex must be an integer 0–3`;
  }
  return null; // valid
}

/**
 * POST /api/generate
 *
 * Body: { text: string }
 *
 * Proxies the user text to the Groq LLM and returns structured study content.
 * The LLM_API_KEY is read server-side only and never included in any response.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- 1. Validate request body ---
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Input text is required' });
  }

  // --- 2. Read API key (server-side only) ---
  const apiKey = process.env.LLM_API_KEY;

  // --- 3. Build structured prompt ---
  const userText = text.trim();
  const prompt = `You are a study assistant. Given the following text, generate comprehensive study materials.
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

Rules:
- Generate exactly 10 flashcards covering the key terms and concepts.
- Generate exactly 15 multiple-choice quiz questions that test understanding, not just recall.
- Every question must have exactly 4 options and one correct answer.
- Do not repeat the same fact across multiple questions.
- Make the wrong options plausible but clearly incorrect.

Text:
${userText}`;

  // --- 4. Call LLM with 30-second AbortSignal timeout ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let llmResponse;
  try {
    llmResponse = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    // AbortError covers both explicit abort() calls and timeout
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out' });
    }
    // Any other network-level error
    return res.status(504).json({ error: 'Request timed out' });
  }

  clearTimeout(timeoutId);

  // --- 5. Handle non-200 from LLM provider ---
  if (!llmResponse.ok) {
    return res
      .status(502)
      .json({ error: `LLM provider error: ${llmResponse.status}` });
  }

  // --- 6. Parse LLM response body ---
  let llmData;
  try {
    llmData = await llmResponse.json();
  } catch {
    return res.status(502).json({ error: 'LLM returned non-JSON response' });
  }

  // --- 7. Extract the assistant message content ---
  let content;
  try {
    content = llmData.choices[0].message.content;
  } catch {
    return res.status(502).json({ error: 'LLM returned non-JSON response' });
  }

  // --- 8. Parse the JSON content from the LLM message ---
  let studyContent;
  try {
    studyContent = JSON.parse(content);
  } catch {
    return res.status(502).json({ error: 'LLM returned non-JSON response' });
  }

  // --- 9. Validate shape ---
  const validationError = validateStudyContent(studyContent);
  if (validationError) {
    return res.status(502).json({ error: validationError });
  }

  // --- 10. Return validated study content ---
  return res.status(200).json({
    flashcards: studyContent.flashcards,
    questions: studyContent.questions,
  });
}
