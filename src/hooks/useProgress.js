import { useState, useCallback } from 'react';

const PREFIX = 'a11yapp';

function storageKey(listSlug, ...parts) {
  return `${PREFIX}:${listSlug}:${parts.join(':')}`;
}

export function useProgress(listSlug) {
  const [, forceUpdate] = useState(0);

  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  const isResourceComplete = useCallback(
    (moduleId, url) => {
      const key = storageKey(listSlug, 'resource', moduleId, url);
      return localStorage.getItem(key) === 'true';
    },
    [listSlug]
  );

  const toggleResource = useCallback(
    (moduleId, url) => {
      const key = storageKey(listSlug, 'resource', moduleId, url);
      const current = localStorage.getItem(key) === 'true';
      if (current) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, 'true');
      }
      refresh();
    },
    [listSlug, refresh]
  );

  const getModuleProgress = useCallback(
    (moduleId) => {
      // Returns an array of booleans for each resource in the module
      // We scan localStorage for matching keys
      const results = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(storageKey(listSlug, 'resource', moduleId))) {
          results.push(localStorage.getItem(key) === 'true');
        }
      }
      return results;
    },
    [listSlug]
  );

  const isQuizComplete = useCallback(
    (moduleId) => {
      const key = storageKey(listSlug, 'quiz', moduleId);
      return localStorage.getItem(key) === 'true';
    },
    [listSlug]
  );

  const markQuizComplete = useCallback(
    (moduleId) => {
      const key = storageKey(listSlug, 'quiz', moduleId);
      localStorage.setItem(key, 'true');
      refresh();
    },
    [listSlug, refresh]
  );

  return {
    isResourceComplete,
    toggleResource,
    getModuleProgress,
    isQuizComplete,
    markQuizComplete,
  };
}
