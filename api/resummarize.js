// Vercel serverless function — proxies re-summarization through Claude API
// so the API key stays server-side

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { url, label, sectionContext, pastedContent } = req.body;
  if (!pastedContent || !pastedContent.trim()) {
    return res.status(400).json({ error: 'pastedContent is required' });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a web scraping and first-pass extraction agent. You will analyze
pasted content from a web page and extract a structured summary.

URL: ${url}
Link label: ${label}
Section context: ${sectionContext}

<page_content>
${pastedContent}
</page_content>

Return a JSON object with this exact structure:

{
  "url": "${url}",
  "label": "${label}",
  "sectionContext": "${sectionContext}",
  "status": "success",
  "title": "The page title, or null",
  "description": "2-3 sentence plain-language summary for a UX professional building accessibility consulting expertise.",
  "keyTopics": ["3-8 specific topics covered"],
  "resourceType": "reference | tutorial | tool | blog | checklist | course | community | standard | legal | news",
  "audienceLevel": "beginner | intermediate | advanced | mixed",
  "isFree": true | false | null,
  "lastUpdatedHint": "Any date signal, or null",
  "notableQuote": "One short phrase under 15 words, or null"
}

Rules:
- Output only valid JSON, no prose, no markdown fences
- Never invent content — only summarize what is provided`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

    const parsed = JSON.parse(cleaned.trim());
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
