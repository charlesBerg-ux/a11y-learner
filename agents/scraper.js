// Agent 2 — Scraper (parallel fleet)
// Model: claude-haiku-4-5
// Fetches one URL, extracts structured summary

const MODEL = 'claude-haiku-4-5-20251001';

export async function scraper(client, url, label, sectionTitle, fetchPageContent) {
  let pageContent;
  let fetchError = null;

  try {
    pageContent = await fetchPageContent(url);
  } catch (err) {
    fetchError = err.message;
  }

  // If fetch completely failed, return error result without calling Claude
  if (fetchError) {
    return JSON.stringify({
      url,
      label,
      sectionContext: sectionTitle,
      status: 'error',
      errorReason: fetchError,
      title: null,
      description: null,
      keyTopics: null,
      resourceType: null,
      audienceLevel: null,
      isFree: null,
      lastUpdatedHint: null,
      notableQuote: null,
    });
  }

  const prompt = `You are a web scraping and first-pass extraction agent. Your job is to analyze
the fetched content of one URL and extract a structured summary.

URL: ${url}
Link label from source page: ${label}
Section context from source page: ${sectionTitle}

<page_content>
${pageContent}
</page_content>

Return a JSON object with this exact structure:

{
  "url": "${url}",
  "label": "${label}",
  "sectionContext": "${sectionTitle}",
  "status": "success" | "blocked" | "error" | "thin",
  "errorReason": "If status is not success: brief explanation. Null if success.",
  "title": "The actual page title as rendered, or null",
  "description": "2-3 sentence plain-language summary of what this resource is and who it is for. Write this for a UX professional with senior experience at large tech companies who is building expertise in accessibility consulting for nonprofits. Be specific. Null if status is not success.",
  "keyTopics": ["List of 3-8 specific topics or concepts covered. Null if not success."],
  "resourceType": "One of: reference, tutorial, tool, blog, checklist, course, community, standard, legal, news. Null if unclear.",
  "audienceLevel": "One of: beginner, intermediate, advanced, mixed. Based on actual content complexity. Null if unclear.",
  "isFree": true | false | null,
  "lastUpdatedHint": "Any date or freshness signal visible on the page. Null if none.",
  "notableQuote": "One short phrase or sentence (under 15 words) from the page that captures its voice. Must be in quotes. Null if nothing stands out or status is not success."
}

Status guidance:
- "success" — page loaded, has substantive content (200+ words relevant to a11y)
- "blocked" — 403, CAPTCHA, bot detection, or login wall
- "thin" — page loaded but has under 200 words or is mostly navigation
- "error" — timeout, DNS failure, 404, or other fetch error

Rules:
- Output only valid JSON, no prose, no markdown fences
- Never invent content — only summarize what is actually on the page
- If the page is in a language other than English, note that in errorReason and set status to "thin"
- Do not follow links — only read the fetched page`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}
