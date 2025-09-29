(() => {
  const SECTION_LABELS = {
    context: ['context', 'background', 'situation'],
    problem: ['problem', 'issue', 'challenge'],
    objectives: ['objective', 'goal', 'task', 'tasks'],
    constraints: ['constraint', 'limitation', 'rules'],
    inputs: ['input', 'given', 'resource'],
    outputs: ['output', 'deliverable', 'result'],
    evaluation: ['evaluation', 'success', 'acceptance'],
    tone: ['tone', 'style', 'voice']
  };

  const DOMAIN_KEYWORDS = {
    software: ['code', 'bug', 'api', 'function', 'implement', 'refactor'],
    data: ['dataset', 'analysis', 'chart', 'model', 'statistics'],
    writing: ['blog', 'article', 'essay', 'write', 'story', 'copy'],
    product: ['roadmap', 'product', 'feature', 'user story', 'spec'],
    design: ['ui', 'ux', 'wireframe', 'design', 'layout']
  };

  const TONE_KEYWORDS = {
    formal: ['formal', 'professional', 'business'],
    casual: ['casual', 'friendly', 'conversational'],
    persuasive: ['convince', 'persuade', 'pitch'],
    technical: ['technical', 'detailed', 'in-depth'],
    concise: ['concise', 'brief', 'summary']
  };

  function normalise(text) {
    return text.toLowerCase().trim();
  }

  function splitLines(prompt) {
    return prompt
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  function detectSections(lines) {
    const sections = {};
    let currentKey = null;

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const label = normalise(line.slice(0, colonIndex));
        const remainder = line.slice(colonIndex + 1).trim();
        const matchedKey = Object.entries(SECTION_LABELS).find(([, labels]) =>
          labels.some(entry => label.startsWith(entry))
        );

        if (matchedKey) {
          currentKey = matchedKey[0];
          sections[currentKey] = remainder ? [remainder] : [];
          return;
        }
      }

      if (currentKey) {
        sections[currentKey].push(line);
      }
    });

    Object.keys(sections).forEach(key => {
      sections[key] = sections[key].join('\n').trim();
    });

    return sections;
  }

  function pullSentences(text) {
    return text
      .split(/[.!?]\s+/)
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }

  function detectDomain(prompt) {
    const lower = normalise(prompt);
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return domain;
      }
    }
    return 'general';
  }

  function detectTone(prompt, explicitTone) {
    if (explicitTone) return explicitTone;
    const lower = normalise(prompt);
    for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return tone;
      }
    }
    return 'unspecified';
  }

  function extractListCandidates(lines) {
    return lines.filter(line => /^\s*([-*\u2022]|\d+\.)\s+/.test(line));
  }

  function findImperatives(sentences) {
    return sentences.filter(sentence => /^[A-Z]/.test(sentence) && /\b(please|create|build|write|explain|generate|summarize|design|implement|draft|show|provide|return|ensure)\b/i.test(sentence));
  }

  function detectUrgency(prompt) {
    const lower = normalise(prompt);
    if (/\b(asap|urgent|high priority|immediately|deadline)\b/.test(lower)) {
      return 'high';
    }
    if (/\bsoon|quickly|shortly\b/.test(lower)) {
      return 'medium';
    }
    return 'normal';
  }

  function dedupe(list) {
    return Array.from(new Set(list.filter(Boolean).map(item => item.trim())));
  }

  function collectByKeywords(lines, keywords) {
    return lines.filter(line =>
      keywords.some(keyword => line.toLowerCase().includes(keyword))
    );
  }

  function buildClarifyingQuestions(snapshot) {
    const questions = [];
    if (!snapshot.expectedOutputs.length) {
      questions.push('What should the final deliverable look like?');
    }
    if (!snapshot.constraints.length) {
      questions.push('Are there constraints, style guides, or limitations to respect?');
    }
    if (!snapshot.inputs.length) {
      questions.push('Which sources or inputs can be used as references?');
    }
    if (!snapshot.objectives.length) {
      questions.push('What are the concrete tasks the assistant should perform?');
    }
    return questions;
  }

  function transformPrompt(prompt) {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return {
        metadata: {
          wordCount: 0,
          characterCount: 0,
          domain: 'general',
          tone: 'unspecified',
          urgency: 'normal',
          createdAt: new Date().toISOString()
        },
        context: '',
        problem: '',
        objectives: [],
        inputs: [],
        constraints: [],
        expectedOutputs: [],
        evaluation: [],
        clarifyingQuestions: []
      };
    }

    const lines = splitLines(trimmed);
    const sentences = pullSentences(trimmed);
    const sections = detectSections(lines);
    const bulletCandidates = extractListCandidates(lines);

    const objectives = sections.objectives
      ? pullSentences(sections.objectives)
      : findImperatives(sentences).concat(bulletCandidates).slice(0, 6);

    const constraintKeywords = ['must', 'should', 'never', 'avoid', 'limit', 'constraint', 'boundary', 'restriction'];
    const outputKeywords = ['output', 'deliverable', 'return', 'produce', 'generate', 'response', 'format'];
    const inputKeywords = ['input', 'given', 'provided', 'reference', 'source', 'use'];
    const evaluationKeywords = ['success', 'criteria', 'evaluation', 'acceptance', 'definition of done'];

    const constraints = sections.constraints
      ? splitLines(sections.constraints)
      : collectByKeywords(lines, constraintKeywords);

    const expectedOutputs = sections.outputs
      ? splitLines(sections.outputs)
      : collectByKeywords(lines, outputKeywords);

    const inputs = sections.inputs
      ? splitLines(sections.inputs)
      : collectByKeywords(lines, inputKeywords);

    const evaluation = sections.evaluation
      ? splitLines(sections.evaluation)
      : collectByKeywords(lines, evaluationKeywords);

    const context = sections.context || sentences.slice(0, 2).join(' ');
    const problem = sections.problem || sentences.slice(1, 3).join(' ');
    const tone = detectTone(trimmed, sections.tone);
    const domain = detectDomain(trimmed);
    const urgency = detectUrgency(trimmed);

    const snapshot = {
      metadata: {
        wordCount: trimmed.split(/\s+/).length,
        characterCount: trimmed.length,
        domain,
        tone,
        urgency,
        createdAt: new Date().toISOString()
      },
      context,
      problem,
      objectives: dedupe(objectives).slice(0, 10),
      inputs: dedupe(inputs).slice(0, 10),
      constraints: dedupe(constraints).slice(0, 10),
      expectedOutputs: dedupe(expectedOutputs).slice(0, 10),
      evaluation: dedupe(evaluation).slice(0, 10)
    };

    snapshot.clarifyingQuestions = buildClarifyingQuestions(snapshot);

    return snapshot;
  }

  function prettyPrintPrompt(prompt) {
    return JSON.stringify(transformPrompt(prompt), null, 2);
  }

  window.promptToJsonEnhancer = {
    transformPrompt,
    prettyPrintPrompt
  };
})();
