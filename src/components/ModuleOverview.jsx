import { useProgress } from '../hooks/useProgress.js';

export default function ModuleOverview({ list, onSelectModule }) {
  const { getModuleProgress } = useProgress(list.slug);

  return (
    <div className="module-overview">
      <header className="list-header">
        <h1>{list.label}</h1>
        {list.pedagogy && (
          <p className="pedagogy-philosophy">{list.pedagogy.philosophy}</p>
        )}
      </header>

      {/* Cross-cutting themes */}
      {list.crossCuttingThemes && list.crossCuttingThemes.length > 0 && (
        <section className="themes-section" aria-label="Cross-cutting themes">
          <details>
            <summary>
              <h2 className="themes-heading">Cross-cutting themes</h2>
            </summary>
            <ul className="themes-list">
              {list.crossCuttingThemes.map((theme, i) => (
                <li key={i}>{theme}</li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* Notable gaps callout */}
      {list.notableGaps && list.notableGaps.length > 0 && (
        <aside className="gaps-callout" role="note" aria-label="Notable gaps in this curriculum">
          <h2>Notable gaps</h2>
          <ul>
            {list.notableGaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </aside>
      )}

      {/* Module cards */}
      <section aria-label="Modules">
        <div className="module-grid">
          {list.modules.map((mod) => {
            const progress = getModuleProgress(mod.moduleId);
            const totalResources = mod.resources.length;
            const completedCount = progress.filter(Boolean).length;

            return (
              <article key={mod.moduleId} className="module-card">
                <button
                  className="module-card-button"
                  onClick={() => onSelectModule(mod.moduleId)}
                  aria-label={`${mod.moduleTitle} — ${completedCount} of ${totalResources} complete`}
                >
                  <h3 className="module-card-title">{mod.moduleTitle}</h3>
                  <p className="module-card-description">{mod.moduleDescription}</p>
                  <div className="module-card-meta">
                    <span className="meta-badge">{totalResources} resources</span>
                    <span className="meta-badge">{mod.estimatedReadTime}</span>
                  </div>
                  <div
                    className="module-card-progress"
                    role="progressbar"
                    aria-valuenow={completedCount}
                    aria-valuemin={0}
                    aria-valuemax={totalResources}
                    aria-label={`${completedCount} of ${totalResources} resources completed`}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${totalResources ? (completedCount / totalResources) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="module-card-progress-text">
                    {completedCount}/{totalResources} complete
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
