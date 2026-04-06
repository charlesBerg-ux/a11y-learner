// Agent 5 — Educator
// Model: claude-sonnet-4-6
// Proposes 3 pedagogical approaches, user picks one, writes pedagogy.json

const MODEL = 'claude-sonnet-4-6';

export async function educator(client, curriculumJson, pickNumber) {
  const resourceCount = curriculumJson.totalResources;
  const moduleCount = curriculumJson.modules.length;
  const listLabel = curriculumJson.listLabel;

  // If --pick was provided, generate pedagogy directly for that approach
  if (pickNumber) {
    return await generatePedagogyDirectly(client, curriculumJson, pickNumber);
  }

  // Otherwise, generate 3 approaches and prompt user in terminal
  return await generateAndPrompt(client, curriculumJson);
}

async function generateAndPrompt(client, curriculumJson) {
  const prompt = buildApproachesPrompt(curriculumJson);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

async function generatePedagogyDirectly(client, curriculumJson, pickNumber) {
  const prompt = `You are a learning design agent with expertise in adult education, UX
professional development, and knowledge retention research.

Input — curriculum JSON: ${JSON.stringify(curriculumJson)}

Learner profile:
- Senior UX professional (Google, Microsoft, Motorola background)
- Strong systems thinking and design critique skills
- New to formal accessibility work; building consulting practice for nonprofits
- Wants social currency and practical fluency, not just theoretical knowledge

First, propose three genuinely distinct pedagogical approaches for presenting
this content as an interactive web app. Then, for approach number ${pickNumber},
produce the detailed pedagogy JSON.

Return ONLY a JSON object with this exact structure (no prose, no markdown fences):

{
  "chosenApproach": ${pickNumber},
  "approachName": "Name of chosen approach",
  "philosophy": "Philosophy statement",
  "appStructure": {
    "primaryOrganization": "How the app is structured at the top level",
    "sessionUnit": "What constitutes one learning session",
    "retentionMechanisms": ["List of specific mechanisms to include"],
    "navigationModel": "How the learner moves through content",
    "progressIndicators": ["What signals progress"]
  },
  "designDirectives": [
    "Specific directives for the designer agent"
  ]
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

function buildApproachesPrompt(curriculumJson) {
  const resourceCount = curriculumJson.totalResources;
  const moduleCount = curriculumJson.modules.length;
  const listLabel = curriculumJson.listLabel;

  return `You are a learning design agent with expertise in adult education, UX
professional development, and knowledge retention research. You will receive
a structured curriculum of accessibility resources and a learner profile.
Your job is to propose three distinct pedagogical approaches for presenting
this content as an interactive web app.

Input — curriculum JSON: ${JSON.stringify(curriculumJson)}

Learner profile:
- Senior UX professional (Google, Microsoft, Motorola background)
- Strong systems thinking and design critique skills
- New to formal accessibility work; building consulting practice for nonprofits
- Wants social currency and practical fluency, not just theoretical knowledge
- No format constraints or preferences stated

For each of the three approaches, reason from learning science (spaced
repetition, cognitive load theory, elaborative interrogation, interleaving,
retrieval practice — use what's relevant). Do not list all theories by name —
apply them. Show your reasoning briefly.

Return a JSON object with this structure (no prose, no markdown fences):

{
  "listLabel": "${listLabel}",
  "resourceCount": ${resourceCount},
  "moduleCount": ${moduleCount},
  "approaches": [
    {
      "number": 1,
      "name": "Approach name",
      "philosophy": "1-sentence philosophy",
      "structure": "2-3 sentences on how the app works day-to-day",
      "bestIf": "Choose this if you want to...",
      "advantage": "1 key advantage for this learner",
      "tradeoff": "1 honest tradeoff",
      "appStructure": {
        "primaryOrganization": "How the app is structured at the top level",
        "sessionUnit": "What constitutes one learning session",
        "retentionMechanisms": ["List of specific mechanisms to include"],
        "navigationModel": "How the learner moves through content",
        "progressIndicators": ["What signals progress"]
      },
      "designDirectives": [
        "Specific directives for the designer agent"
      ]
    }
  ]
}

Rules:
- The three approaches must be genuinely distinct — not variations of the same idea
- Base recommendations on the actual curriculum content, not generic advice
- Be honest about tradeoffs — do not oversell any approach
- Reflection on the learner's UX background is relevant`;
}

export function formatApproachesForTerminal(approachesJson) {
  const { listLabel, resourceCount, moduleCount, approaches } = approachesJson;
  let output = `\n📚 ${listLabel} — choose your learning approach\n\n`;
  output += `I've reviewed ${resourceCount} resources across ${moduleCount} modules.\n`;
  output += `Here are three ways to structure the learning app. Enter 1, 2, or 3.\n`;

  for (const a of approaches) {
    output += `\n──────────────────────\n`;
    output += `Approach ${a.number}: ${a.name}\n`;
    output += `${a.philosophy}\n\n`;
    output += `Structure: ${a.structure}\n`;
    output += `Best if: ${a.bestIf}\n`;
    output += `↑ ${a.advantage}\n`;
    output += `↓ ${a.tradeoff}\n`;
  }

  output += `\n──────────────────────\n`;
  output += `Enter 1, 2, or 3 to choose:\n`;
  return output;
}

export function buildPedagogyJson(approachesJson, chosenNumber) {
  const approach = approachesJson.approaches.find((a) => a.number === chosenNumber);
  return {
    chosenApproach: chosenNumber,
    approachName: approach.name,
    philosophy: approach.philosophy,
    appStructure: approach.appStructure,
    designDirectives: approach.designDirectives,
  };
}
