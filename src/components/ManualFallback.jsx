import { useState } from 'react';

export default function ManualFallback({ errors, listSlug }) {
  if (!errors || !errors.failed || errors.failed.length === 0) {
    return (
      <section className="manual-fallback" aria-label="Failed resources">
        <p>All resources were scraped successfully.</p>
      </section>
    );
  }

  return (
    <section className="manual-fallback" aria-label="Failed resources">
      <h2>Failed resources</h2>
      <p>
        {errors.failedCount} of {errors.totalUrls} resources could not be scraped automatically.
      </p>

      <ul className="failed-list">
        {errors.failed.map((item) => (
          <FailedResource key={item.url} item={item} listSlug={listSlug} />
        ))}
      </ul>
    </section>
  );
}

function FailedResource({ item, listSlug }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);

  async function handleResummarize() {
    if (!text.trim()) return;
    setStatus('loading');

    try {
      const response = await fetch('/api/resummarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.url,
          label: item.label,
          sectionContext: item.sectionContext,
          pastedContent: text,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResult(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setResult({ error: err.message });
    }
  }

  return (
    <li className="failed-resource">
      <div className="failed-resource-header">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.label || item.url}
        </a>
        <span className="failed-status-badge">{item.status}</span>
      </div>
      <p className="failed-reason">{item.errorReason}</p>

      {status === 'success' ? (
        <div className="resummarize-success">
          <p>Resource summarized successfully. Re-run the pipeline to add it to a module.</p>
        </div>
      ) : (
        <div className="resummarize-form">
          <label htmlFor={`paste-${item.url}`}>
            Paste the page content to re-summarize:
          </label>
          <textarea
            id={`paste-${item.url}`}
            className="resummarize-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste the main content from this page..."
          />
          <button
            className="resummarize-button"
            onClick={handleResummarize}
            disabled={status === 'loading' || !text.trim()}
          >
            {status === 'loading' ? 'Summarizing...' : 'Summarize'}
          </button>
          {status === 'error' && (
            <p className="resummarize-error" role="alert">
              Error: {result?.error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
