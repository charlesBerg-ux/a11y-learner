import { useProgress } from '../hooks/useProgress.js';
import ResourceCard from './ResourceCard.jsx';
import RetentionPrompt from './RetentionPrompt.jsx';

export default function ModuleDetail({ listSlug, module, pedagogy, onBack }) {
  const { isResourceComplete, toggleResource, isQuizComplete, markQuizComplete } =
    useProgress(listSlug);

  const completedCount = module.resources.filter((r) =>
    isResourceComplete(module.moduleId, r.url)
  ).length;
  const allResourcesDone = completedCount === module.resources.length;

  return (
    <div className="module-detail">
      <nav aria-label="Breadcrumb">
        <button className="back-button" onClick={onBack}>
          ← Back to modules
        </button>
      </nav>

      <header>
        <h2>{module.moduleTitle}</h2>
        <p>{module.moduleDescription}</p>
        <p className="module-read-time">Estimated time: {module.estimatedReadTime}</p>
      </header>

      <section aria-label="Resources">
        <ol className="resource-list">
          {module.resources.map((resource, i) => (
            <li key={resource.url}>
              <ResourceCard
                resource={resource}
                isComplete={isResourceComplete(module.moduleId, resource.url)}
                onToggle={() => toggleResource(module.moduleId, resource.url)}
                index={i + 1}
              />
            </li>
          ))}
        </ol>
      </section>

      {/* Retention mechanisms from pedagogy */}
      {module.quizQuestions && module.quizQuestions.length > 0 && (
        <RetentionPrompt
          moduleId={module.moduleId}
          questions={module.quizQuestions}
          isComplete={isQuizComplete(module.moduleId)}
          onComplete={() => markQuizComplete(module.moduleId)}
          allResourcesDone={allResourcesDone}
          pedagogy={pedagogy}
        />
      )}
    </div>
  );
}
