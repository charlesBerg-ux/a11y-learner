import { useState } from 'react';
import listsData from './data/lists.json';
import TabNav from './components/TabNav.jsx';
import ModuleOverview from './components/ModuleOverview.jsx';
import ModuleDetail from './components/ModuleDetail.jsx';
import ManualFallback from './components/ManualFallback.jsx';

export default function App() {
  const { lists } = listsData;
  const [activeListIndex, setActiveListIndex] = useState(lists.length > 0 ? lists.length - 1 : 0);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [showManualFallback, setShowManualFallback] = useState(false);

  if (lists.length === 0) {
    return (
      <main className="empty-state" role="main">
        <h1>A11y Learner</h1>
        <p>No learning lists yet. Run the pipeline to get started:</p>
        <pre>
          <code>node run.js --url https://marconius.com/a11yLinks/</code>
        </pre>
      </main>
    );
  }

  const activeList = lists[activeListIndex];
  const activeModule = activeModuleId
    ? activeList.modules.find((m) => m.moduleId === activeModuleId)
    : null;

  return (
    <div className="app">
      <nav aria-label="Learning lists">
        <TabNav
          lists={lists}
          activeIndex={activeListIndex}
          onSelect={(i) => {
            setActiveListIndex(i);
            setActiveModuleId(null);
          }}
        />
      </nav>

      <main role="main" aria-label={activeList.label}>
        {activeModule ? (
          <ModuleDetail
            listSlug={activeList.slug}
            module={activeModule}
            pedagogy={activeList.pedagogy}
            onBack={() => setActiveModuleId(null)}
          />
        ) : (
          <ModuleOverview
            list={activeList}
            onSelectModule={(moduleId) => setActiveModuleId(moduleId)}
          />
        )}
      </main>

      <footer role="contentinfo">
        <button
          className="manual-fallback-toggle"
          onClick={() => setShowManualFallback(!showManualFallback)}
          aria-expanded={showManualFallback}
        >
          {showManualFallback ? 'Hide' : 'Show'} other links
        </button>
        {showManualFallback && <ManualFallback />}
      </footer>
    </div>
  );
}
