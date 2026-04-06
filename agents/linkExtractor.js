// Agent 1 — Link extractor
// Model: claude-haiku-4-5
// Fetches root URL, extracts all external links with structural context

const MODEL = 'claude-haiku-4-5-20251001';

export async function linkExtractor(client, rootUrl, fetchPageContent) {
  const pageContent = await fetchPageContent(rootUrl);

  const prompt = `You are a link extraction agent. Your job is to analyze a web page's HTML and extract
every external link from it, along with any structural context (section headings,
list groupings) that the page provides.

Here is the HTML content fetched from: ${rootUrl}

<page_content>
${pageContent}
</page_content>

Return a JSON object with this exact structure:

{
  "inferredLabel": "A short descriptive name for this link list, inferred from the page title or content. 3-5 words max.",
  "sourceUrl": "${rootUrl}",
  "fetchedAt": "ISO 8601 timestamp",
  "sections": [
    {
      "sectionTitle": "The heading text grouping these links, or null if ungrouped",
      "links": [
        {
          "url": "https://...",
          "label": "The link text as it appeared on the page",
          "position": 1
        }
      ]
    }
  ]
}

Rules:
- Include only external links (skip same-domain anchor links, mailto:, javascript:)
- Preserve the original section groupings exactly as found on the page
- Do not follow any links — only extract from the root page
- Do not infer or add information not present on the page
- Output only valid JSON, no prose, no markdown fences`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}
