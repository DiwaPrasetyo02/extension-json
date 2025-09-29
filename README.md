# Prompt-to-JSON Enhancer

A lightweight Chrome-compatible content-script extension that captures prompts on ChatGPT, Claude, Gemini, and similar chat UIs, then converts them into a structured JSON brief with inferred context, objectives, constraints, and metadata.

## Features
- Detects user input in `textarea` and `contenteditable` prompt boxes on supported domains.
- Derives structured fields such as context, problem, objectives, expected outputs, constraints, and evaluation criteria via deterministic heuristics.
- Surfaces auto-generated clarifying questions when critical fields are missing.
- Live preview overlay with copy-to-clipboard support and collapse toggle.
- Works entirely on-device—no network calls or backend services.

## Installation (Chrome / Edge / Brave)
1. Open `chrome://extensions` (or the equivalent for your Chromium-based browser).
2. Enable *Developer mode* (top-right toggle).
3. Choose *Load unpacked* and select the `prompt-to-json-extension` folder from this repository.
4. Open ChatGPT, Claude, or Gemini in a new tab. The floating "Prompt to JSON Enhancer" panel appears when you focus their prompt box.

## Usage
- Type or paste your prompt as usual. The overlay updates in real time with a formatted JSON payload.
- Click **Copy JSON** to save the structured output to your clipboard.
- Use **Collapse** to minimize the panel when you do not need it.

## JSON Structure
Each prompt is converted to:

```json
{
  "metadata": {
    "wordCount": 123,
    "characterCount": 789,
    "domain": "software",
    "tone": "technical",
    "urgency": "normal",
    "createdAt": "2024-02-05T12:34:56.000Z"
  },
  "context": "...",
  "problem": "...",
  "objectives": ["..."],
  "inputs": ["..."],
  "constraints": ["..."],
  "expectedOutputs": ["..."],
  "evaluation": ["..."],
  "clarifyingQuestions": ["..."]
}
```

The heuristics prefer explicit sections like `Context:` or bullet lists but gracefully fall back to sentence-level analysis if none exist.

