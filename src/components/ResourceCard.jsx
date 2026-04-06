const TYPE_COLORS = {
  reference: 'var(--badge-reference)',
  tutorial: 'var(--badge-tutorial)',
  tool: 'var(--badge-tool)',
  blog: 'var(--badge-blog)',
  checklist: 'var(--badge-checklist)',
  course: 'var(--badge-course)',
  community: 'var(--badge-community)',
  standard: 'var(--badge-standard)',
  legal: 'var(--badge-legal)',
  news: 'var(--badge-news)',
};

export default function ResourceCard({ resource, isComplete, onToggle, index }) {
  return (
    <article className={`resource-card ${isComplete ? 'resource-card--complete' : ''}`}>
      <div className="resource-card-header">
        <span className="resource-index" aria-hidden="true">
          {index}
        </span>
        <h3 className="resource-title">
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            {resource.label}
          </a>
        </h3>
      </div>

      <p className="resource-why">{resource.whyThisWhyNow}</p>
      <p className="resource-description">{resource.description}</p>

      <div className="resource-badges">
        {resource.resourceType && (
          <span
            className="badge badge--type"
            style={{ '--badge-color': TYPE_COLORS[resource.resourceType] || 'var(--color-muted)' }}
          >
            {resource.resourceType}
          </span>
        )}
        {resource.audienceLevel && (
          <span className="badge badge--level">{resource.audienceLevel}</span>
        )}
        {resource.isFree === true && <span className="badge badge--free">free</span>}
        {resource.isFree === false && <span className="badge badge--paid">paid</span>}
      </div>

      {resource.keyTopics && resource.keyTopics.length > 0 && (
        <div className="resource-topics">
          {resource.keyTopics.map((topic) => (
            <span key={topic} className="topic-tag">
              {topic}
            </span>
          ))}
        </div>
      )}

      {resource.freshnessFlag && resource.freshnessNote && (
        <p className="freshness-warning" role="alert">
          ⚠ {resource.freshnessNote}
        </p>
      )}

      <button
        className={`mark-complete-button ${isComplete ? 'mark-complete-button--done' : ''}`}
        onClick={onToggle}
        aria-pressed={isComplete}
      >
        {isComplete ? '✓ Completed' : 'Mark as read'}
      </button>
    </article>
  );
}
