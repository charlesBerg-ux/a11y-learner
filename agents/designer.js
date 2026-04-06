// Agent 6 — Designer / Builder
// Model: claude-sonnet-4-6
// Generates quiz questions for each module. The orchestrator handles
// assembling the full lists.json to avoid token-limit issues.

const MODEL = 'claude-sonnet-4-6';

export async function designer(client, curriculumJson, pedagogyJson, existingListsJson) {
  const slug = curriculumJson.listLabel
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  // Build a compact module summary for quiz generation (omit full resource details)
  const moduleSummaries = curriculumJson.modules.map((mod) => ({
    moduleId: mod.moduleId,
    moduleTitle: mod.moduleTitle,
    moduleDescription: mod.moduleDescription,
    keyTopics: mod.resources.flatMap((r) => r.keyTopics || []),
  }));

  const prompt = `You are a learning design agent. Generate 2-3 quiz questions per module
for an accessibility learning app. Questions should test application and
synthesis, not recall. Frame them for a senior UX professional building
an accessibility consulting practice for nonprofits.

Modules:
${JSON.stringify(moduleSummaries)}

Pedagogical approach: ${pedagogyJson.approachName} — ${pedagogyJson.philosophy}

Return ONLY a JSON object (no prose, no markdown fences, no backticks) with this structure:

{
  "quizzes": {
    "module-1": [
      {
        "question": "A scenario-based question testing application of this module's topics",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "1-2 sentence explanation of why this is correct"
      }
    ],
    "module-2": [ ... ]
  }
}

Rules:
- Keys in "quizzes" must match the moduleId values exactly
- 2-3 questions per module, 4 options each
- Questions must reference actual topics from the module, not generic a11y trivia
- Keep explanations concise — 1-2 sentences max
- Output valid JSON only, nothing else`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

// Assembles the final lists.json entry from curriculum, pedagogy, quizzes, and errors
export function assembleListEntry(curriculumJson, pedagogyJson, quizzes, errorsJson) {
  const slug = curriculumJson.listLabel
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const modules = curriculumJson.modules.map((mod) => ({
    ...mod,
    quizQuestions: quizzes[mod.moduleId] || [],
  }));

  const entry = {
    slug,
    label: curriculumJson.listLabel,
    sourceUrl: curriculumJson.sourceUrl,
    synthesizedAt: curriculumJson.synthesizedAt,
    pedagogy: pedagogyJson,
    modules,
    crossCuttingThemes: curriculumJson.crossCuttingThemes || [],
    notableGaps: curriculumJson.notableGaps || [],
  };

  if (errorsJson) {
    entry.errors = errorsJson;
  }

  return entry;
}
