// Agent 4 — Summarizer / Curriculum synthesizer
// Model: claude-sonnet-4-6
// Synthesizes scraped resources into a pedagogically coherent curriculum

const MODEL = 'claude-sonnet-4-6';

export async function summarizer(client, scrapedData, listMetadata) {
  const successfulOnly = scrapedData.filter((r) => r.status === 'success');

  const prompt = `You are a curriculum synthesis agent. You will receive structured summaries of
a set of accessibility resources scraped from the web. Your job is to synthesize
them into a unified, pedagogically coherent curriculum JSON that a downstream
educator agent and designer agent will use to build a learning app.

Input — scraped resource summaries: ${JSON.stringify(successfulOnly)}
Input — list metadata: ${JSON.stringify(listMetadata)}

The learner profile:
- Senior UX professional (Google, Microsoft, Motorola background)
- Strong information architecture and design systems fluency
- Building an accessibility consulting practice targeting nonprofits and NGOs
- Wants industry-current knowledge with social currency in the a11y community
- Learns best through structure, not just lists of links

Your tasks:

1. Group resources into 4-8 thematic modules. Base groupings on actual content
   overlap and pedagogical flow, not just the original section labels from the
   source page. Rename sections if a better name emerges from the content.

2. Within each module, sequence resources from foundational to advanced.

3. Identify relationships between resources (e.g., "this tool tests compliance
   with this standard", "this blog regularly covers this organization's output").

4. Flag any resources that are notably dated (based on lastUpdatedHint) where
   freshness materially matters (e.g., legal content, browser support tables).

5. Write a one-sentence "why this, why now" rationale for each resource that
   reflects the learner profile above — specific, not generic.

Return a JSON object with this exact structure:

{
  "listLabel": "Inferred or provided label",
  "sourceUrl": "Original list URL",
  "synthesizedAt": "ISO 8601 timestamp",
  "totalResources": <count>,
  "modules": [
    {
      "moduleId": "module-1",
      "moduleTitle": "Short title, sentence case",
      "moduleDescription": "2-3 sentences describing what this module covers and why it matters for the learner.",
      "estimatedReadTime": "e.g. '2-3 hours'",
      "resources": [
        {
          "url": "https://...",
          "label": "Resource name",
          "description": "From scraper, may be refined",
          "whyThisWhyNow": "One sentence rationale for this specific learner",
          "resourceType": "reference | tutorial | tool | blog | checklist | course | community | standard | legal | news",
          "audienceLevel": "beginner | intermediate | advanced | mixed",
          "isFree": true | false | null,
          "keyTopics": ["topic1", "topic2"],
          "freshnessFlag": true | false,
          "freshnessNote": "e.g. 'Last updated 2019'. Null if freshnessFlag is false.",
          "relatedUrls": ["https://... (related resource in this curriculum)"]
        }
      ]
    }
  ],
  "crossCuttingThemes": [
    "Short phrases describing themes that appear across multiple modules"
  ],
  "notableGaps": [
    "Topics that seem underrepresented given the learner's goals"
  ]
}

Rules:
- Output only valid JSON, no prose, no markdown fences
- Do not invent resources — only work with what was scraped
- If you need fuller content for a resource to make a grouping decision and
  the scraped summary is genuinely insufficient, output a special top-level
  field: "needsDeeper": ["url1", "url2"] — the orchestrator will re-scrape
  those URLs at full depth. Use this sparingly.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}
