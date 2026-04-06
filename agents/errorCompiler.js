// Agent 3 — Error list compiler
// Model: claude-haiku-4-5
// Identifies non-successful scrape results, produces errors.json and terminal summary

const MODEL = 'claude-haiku-4-5-20251001';

export async function errorCompiler(client, scrapedData, listLabel, slug) {
  const prompt = `You are a quality-control agent. You will receive a JSON array of scraper
results. Your job is to identify all non-successful results and produce two outputs.

Input: ${JSON.stringify(scrapedData)}

Output 1 — a JSON object with this structure:

{
  "listLabel": "${listLabel}",
  "generatedAt": "ISO 8601 timestamp",
  "totalUrls": <total count>,
  "successCount": <success count>,
  "failedCount": <failed count>,
  "failed": [
    {
      "url": "https://...",
      "label": "Original link label",
      "sectionContext": "Section it belonged to",
      "status": "blocked" | "error" | "thin",
      "errorReason": "Why it failed",
      "manualInstructions": "Go to this URL in your browser. If the content is relevant, copy the main body text and paste it into data/${slug}/manual/{sanitized-filename}.txt — the pipeline will pick it up on next run."
    }
  ]
}

Output 2 — a human-readable terminal summary:

  ${listLabel} — scrape complete
  ✓ <success count> resources scraped successfully
  ✗ <failed count> resources failed (see data/${slug}/errors.json)

  Failed URLs:
  1. <url> — <status> (<errorReason>)
     → data/${slug}/manual/<sanitized-filename>.txt
  ...

  To add failed resources manually:
  Browse to each URL, copy the main content, and paste into the file path shown.
  Re-run with --from-json to skip re-scraping and resume from summarization.

Rules:
- Output the JSON first, then the terminal summary separated by ---
- Be specific in manualInstructions — include the exact file path
- Sanitize filenames: lowercase, hyphens for spaces, no special chars`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}
