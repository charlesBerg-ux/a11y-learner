#!/usr/bin/env node

// Orchestrator — coordinates all 6 agents in sequence
// Usage: node run.js --url https://marconius.com/a11yLinks/

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { linkExtractor } from './agents/linkExtractor.js';
import { scraper } from './agents/scraper.js';
import { errorCompiler } from './agents/errorCompiler.js';
import { summarizer } from './agents/summarizer.js';
import {
  educator,
  formatApproachesForTerminal,
  buildPedagogyJson,
} from './agents/educator.js';
import { designer, assembleListEntry } from './agents/designer.js';

// ── CLI argument parsing ──────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { url: null, label: null, scrapeOnly: false, fromJson: null, pick: null };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        parsed.url = args[++i];
        break;
      case '--label':
        parsed.label = args[++i];
        break;
      case '--scrape-only':
        parsed.scrapeOnly = true;
        break;
      case '--from-json':
        parsed.fromJson = args[++i];
        break;
      case '--pick':
        parsed.pick = parseInt(args[++i], 10);
        if (![1, 2, 3].includes(parsed.pick)) {
          abort('--pick must be 1, 2, or 3');
        }
        break;
      default:
        abort(`Unknown argument: ${args[i]}`);
    }
  }

  if (!parsed.url && !parsed.fromJson) {
    abort('Either --url or --from-json is required.\nUsage: node run.js --url <url>');
  }

  return parsed;
}

// ── Utilities ─────────────────────────────────────────────────────────

function abort(msg) {
  console.error(`\n  Error: ${msg}\n`);
  process.exit(1);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function fetchPageContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    // Truncate very large pages to avoid token limits
    const maxChars = 100000;
    return text.length > maxChars ? text.slice(0, maxChars) + '\n[...truncated]' : text;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonResponse(text, agentName, slug) {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callWithRetry(agentFn, agentName, slug, client, ...args) {
  const raw = await agentFn(client, ...args);
  let parsed = parseJsonResponse(raw, agentName, slug);

  if (parsed) return { parsed, raw };

  // Retry once with instruction
  console.log(`  ⚠ ${agentName} returned invalid JSON, retrying...`);
  const retryRaw = await agentFn(client, ...args);
  parsed = parseJsonResponse(retryRaw, agentName, slug);

  if (parsed) return { parsed, raw: retryRaw };

  // Write debug output and abort
  const debugDir = path.join('data', slug, 'debug');
  ensureDir(debugDir);
  const debugPath = path.join(debugDir, `${agentName}.txt`);
  fs.writeFileSync(debugPath, retryRaw);
  abort(`${agentName} returned invalid JSON after retry. Raw output saved to ${debugPath}`);
}

function printProgress(current, total, label) {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`\r  [${bar}] ${current}/${total} ${label}`);
  if (current === total) process.stdout.write('\n');
}

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

function is429(err) {
  return err?.status === 429 || err?.error?.type === 'rate_limit_error' ||
    /429|rate.?limit/i.test(err?.message || '');
}

async function scraperWithRetry(client, link, sectionTitle, slug, onComplete) {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const raw = await scraper(client, link.url, link.label, sectionTitle, fetchPageContent);
      const parsed = parseJsonResponse(raw, 'scraper', slug);
      onComplete();
      return parsed || {
        url: link.url,
        label: link.label,
        sectionContext: sectionTitle,
        status: 'error',
        errorReason: 'Agent returned invalid JSON',
      };
    } catch (err) {
      if (is429(err) && attempt <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      onComplete();
      return {
        url: link.url,
        label: link.label,
        sectionContext: sectionTitle,
        status: 'error',
        errorReason: attempt > MAX_RETRIES && is429(err)
          ? `Rate limited (429) after ${MAX_RETRIES} retries`
          : err.message,
      };
    }
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!process.env.ANTHROPIC_API_KEY) {
    abort('ANTHROPIC_API_KEY environment variable is not set.');
  }

  const client = new Anthropic();
  let slug, listLabel, curriculumJson;

  // ── From-JSON mode: skip to Agent 5 ──────────────────────────────
  if (args.fromJson) {
    console.log(`\n  Loading existing curriculum from ${args.fromJson}...`);
    const raw = fs.readFileSync(args.fromJson, 'utf-8');
    curriculumJson = JSON.parse(raw);
    listLabel = args.label || curriculumJson.listLabel;
    slug = slugify(listLabel);
  } else {
    // ── Agent 1: Link extractor ──────────────────────────────────────
    console.log(`\n  Agent 1 — Extracting links from ${args.url}...`);
    const { parsed: linksJson } = await callWithRetry(
      (c, ...a) => linkExtractor(c, ...a),
      'linkExtractor',
      'temp',
      client,
      args.url,
      fetchPageContent
    );

    listLabel = args.label || linksJson.inferredLabel;
    slug = slugify(listLabel);
    ensureDir(path.join('data', slug));

    fs.writeFileSync(
      path.join('data', slug, 'links.json'),
      JSON.stringify(linksJson, null, 2)
    );

    const allLinks = linksJson.sections.flatMap((s) => s.links);
    console.log(`  ✓ Found ${allLinks.length} links in ${linksJson.sections.length} sections`);
    console.log(`  List label: "${listLabel}"\n`);

    // ── Agent 2: Scraper fleet (batches of 5, 2s delay between) ──────
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 2000;

    // Load existing scraped results to skip already-successful URLs
    const scrapedPath = path.join('data', slug, 'scraped.json');
    let existingScraped = [];
    if (fs.existsSync(scrapedPath)) {
      try {
        existingScraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
      } catch { /* start fresh */ }
    }
    const alreadySuccessful = new Set(
      existingScraped.filter((r) => r.status === 'success').map((r) => r.url)
    );
    const linksToScrape = allLinks.filter((link) => !alreadySuccessful.has(link.url));
    const skippedResults = existingScraped.filter((r) => r.status === 'success');

    if (skippedResults.length > 0) {
      console.log(`  Skipping ${skippedResults.length} already-scraped URLs`);
    }
    console.log(`  Agent 2 — Scraping ${linksToScrape.length} URLs in batches of ${BATCH_SIZE}...`);
    const scrapedResults = [...skippedResults];
    let completed = 0;
    const totalToScrape = linksToScrape.length;

    for (let i = 0; i < linksToScrape.length; i += BATCH_SIZE) {
      const batch = linksToScrape.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map((link) => {
        const sectionTitle =
          linksJson.sections.find((s) => s.links.some((l) => l.url === link.url))?.sectionTitle ||
          null;

        return scraperWithRetry(client, link, sectionTitle, slug, () => {
          completed++;
          printProgress(completed, totalToScrape, '');
        });
      });

      const results = await Promise.allSettled(batchPromises);
      for (const r of results) {
        scrapedResults.push(r.status === 'fulfilled' ? r.value : r.reason);
      }

      // Delay between batches (skip after the last batch)
      if (i + BATCH_SIZE < allLinks.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    fs.writeFileSync(
      path.join('data', slug, 'scraped.json'),
      JSON.stringify(scrapedResults, null, 2)
    );

    // ── Agent 3: Error compiler ──────────────────────────────────────
    console.log(`\n  Agent 3 — Compiling error report...`);
    const errorRaw = await errorCompiler(client, scrapedResults, listLabel, slug);

    // Parse the two-part output (JSON + terminal summary separated by ---)
    const parts = errorRaw.split('---');
    let errorsJson;
    try {
      errorsJson = JSON.parse(parts[0].trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''));
    } catch {
      // Try parsing the whole thing as JSON
      errorsJson = parseJsonResponse(parts[0], 'errorCompiler', slug);
    }

    if (errorsJson) {
      fs.writeFileSync(
        path.join('data', slug, 'errors.json'),
        JSON.stringify(errorsJson, null, 2)
      );
    }

    // Print terminal summary
    if (parts.length > 1) {
      console.log(parts.slice(1).join('---'));
    } else {
      const successCount = scrapedResults.filter((r) => r.status === 'success').length;
      const failedCount = scrapedResults.length - successCount;
      console.log(`\n  ${listLabel} — scrape complete`);
      console.log(`  ✓ ${successCount} resources scraped successfully`);
      console.log(`  ✗ ${failedCount} resources failed (see data/${slug}/errors.json)\n`);
    }

    if (scrapedResults.every((r) => r.status !== 'success')) {
      abort('All URLs failed to scrape. Nothing to summarize.');
    }

    // ── Check for manual override files ──────────────────────────────
    const manualDir = path.join('data', slug, 'manual');
    if (fs.existsSync(manualDir)) {
      const manualFiles = fs.readdirSync(manualDir).filter((f) => f.endsWith('.txt'));
      if (manualFiles.length > 0) {
        console.log(`  Found ${manualFiles.length} manual override file(s), incorporating...`);
        for (const file of manualFiles) {
          const content = fs.readFileSync(path.join(manualDir, file), 'utf-8');
          const urlGuess = file.replace(/\.txt$/, '').replace(/-/g, ' ');
          scrapedResults.push({
            url: `manual://${file}`,
            label: urlGuess,
            sectionContext: 'Manually added',
            status: 'success',
            title: urlGuess,
            description: content.slice(0, 500),
            keyTopics: [],
            resourceType: null,
            audienceLevel: null,
            isFree: null,
            lastUpdatedHint: null,
            notableQuote: null,
            _manualContent: content,
          });
        }
      }
    }

    // ── Agent 4: Summarizer ──────────────────────────────────────────
    console.log(`\n  Agent 4 — Synthesizing curriculum...`);
    const listMetadata = {
      listLabel,
      sourceUrl: args.url,
      totalLinks: allLinks.length,
    };

    const { parsed: curriculum } = await callWithRetry(
      (c, scraped, meta) => summarizer(c, scraped, meta),
      'summarizer',
      slug,
      client,
      scrapedResults,
      listMetadata
    );

    // Handle needsDeeper
    if (curriculum.needsDeeper && curriculum.needsDeeper.length > 0) {
      console.log(
        `  Summarizer requested deeper scraping for ${curriculum.needsDeeper.length} URLs...`
      );
      for (const url of curriculum.needsDeeper) {
        try {
          const deepContent = await fetchPageContent(url);
          const existing = scrapedResults.find((r) => r.url === url);
          if (existing) {
            existing._deepContent = deepContent;
          }
        } catch (err) {
          console.log(`  ⚠ Could not deep-fetch ${url}: ${err.message}`);
        }
      }

      // Re-run summarizer with enriched data
      console.log(`  Re-running summarizer with enriched data...`);
      const { parsed: enrichedCurriculum } = await callWithRetry(
        (c, scraped, meta) => summarizer(c, scraped, meta),
        'summarizer',
        slug,
        client,
        scrapedResults,
        listMetadata
      );
      curriculumJson = enrichedCurriculum;
    } else {
      curriculumJson = curriculum;
    }

    fs.writeFileSync(
      path.join('data', slug, 'curriculum.json'),
      JSON.stringify(curriculumJson, null, 2)
    );
    console.log(
      `  ✓ Curriculum: ${curriculumJson.modules.length} modules, ${curriculumJson.totalResources} resources`
    );
  }

  // ── Scrape-only mode: exit here ────────────────────────────────────
  if (args.scrapeOnly) {
    console.log(`\n  --scrape-only flag set. Pipeline stopped after summarization.`);
    console.log(`  Curriculum saved to data/${slug}/curriculum.json\n`);
    process.exit(0);
  }

  // ── Agent 5: Educator ──────────────────────────────────────────────
  console.log(`\n  Agent 5 — Generating pedagogical approaches...`);
  let pedagogyJson;

  if (args.pick) {
    console.log(`  --pick flag set: using Approach ${args.pick} without prompt.\n`);
    const { parsed } = await callWithRetry(
      (c, curr, pick) => educator(c, curr, pick),
      'educator',
      slug,
      client,
      curriculumJson,
      args.pick
    );
    pedagogyJson = parsed;
  } else {
    // Generate approaches and prompt in terminal
    const { parsed: approachesJson } = await callWithRetry(
      (c, curr) => educator(c, curr, null),
      'educator',
      slug,
      client,
      curriculumJson,
      null
    );

    console.log(formatApproachesForTerminal(approachesJson));

    let chosenNumber = null;
    while (!chosenNumber) {
      const answer = await askQuestion('  > ');
      const num = parseInt(answer, 10);
      if ([1, 2, 3].includes(num)) {
        chosenNumber = num;
      } else {
        console.log('  Please enter 1, 2, or 3.');
      }
    }

    const chosenApproach = approachesJson.approaches.find((a) => a.number === chosenNumber);
    console.log(`\n  Reply received: Approach ${chosenNumber} — ${chosenApproach.name}`);
    console.log(`  Resuming pipeline...\n`);

    pedagogyJson = buildPedagogyJson(approachesJson, chosenNumber);
  }

  ensureDir(path.join('data', slug));
  fs.writeFileSync(
    path.join('data', slug, 'pedagogy.json'),
    JSON.stringify(pedagogyJson, null, 2)
  );

  // ── Agent 6: Designer / Builder ────────────────────────────────────
  console.log(`  Agent 6 — Generating quiz questions...`);

  const { parsed: quizData } = await callWithRetry(
    (c, curr, ped) => designer(c, curr, ped),
    'designer',
    slug,
    client,
    curriculumJson,
    pedagogyJson
  );

  // Load errors if they exist
  const errorsPath = path.join('data', slug, 'errors.json');
  let errorsJson = null;
  if (fs.existsSync(errorsPath)) {
    try {
      errorsJson = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));
    } catch { /* skip */ }
  }

  // Assemble the list entry from curriculum + pedagogy + quizzes + errors
  const newListEntry = assembleListEntry(
    curriculumJson,
    pedagogyJson,
    quizData.quizzes || {},
    errorsJson
  );

  // Merge into existing lists.json
  const listsJsonPath = path.join('src', 'data', 'lists.json');
  let existingLists = { lists: [] };
  if (fs.existsSync(listsJsonPath)) {
    try {
      existingLists = JSON.parse(fs.readFileSync(listsJsonPath, 'utf-8'));
    } catch { /* start fresh */ }
  }

  // Replace if same slug exists, otherwise append
  const existingIndex = existingLists.lists.findIndex((l) => l.slug === newListEntry.slug);
  if (existingIndex >= 0) {
    existingLists.lists[existingIndex] = newListEntry;
  } else {
    existingLists.lists.push(newListEntry);
  }

  ensureDir(path.join('src', 'data'));
  fs.writeFileSync(listsJsonPath, JSON.stringify(existingLists, null, 2));

  // ── Completion summary ─────────────────────────────────────────────
  const moduleCount = newListEntry.modules.length;
  const resourceCount = newListEntry.modules.reduce((sum, m) => sum + m.resources.length, 0);

  console.log(`  ✓ App data updated\n`);
  console.log(`  Done.`);
  console.log(`  New list added: "${listLabel}" (${resourceCount} resources, ${moduleCount} modules)`);
  console.log(`  Total lists in app: ${existingLists.lists.length}\n`);
  console.log(`  To preview: npm run dev`);
  console.log(`  To deploy:  npx vercel --prod\n`);
}

main().catch((err) => {
  console.error(`\n  Fatal error: ${err.message}\n`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
