import { useEffect, useState } from 'react';

/**
 * Loads data scoped to the selected course without retaining a stale response
 * while the course selection changes.
 */
export default function useCourseData(courseId, fetcher, requestArg) {
  const [result, setResult] = useState({ courseId: undefined, data: null, error: false });

  useEffect(() => {
    let cancelled = false;

    const request = requestArg === undefined
      ? fetcher(courseId)
      : fetcher(requestArg, courseId);

    request
      .then((data) => {
        if (!cancelled) setResult({ courseId, data, error: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ courseId, data: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, fetcher, requestArg]);

  if (result.courseId !== courseId) {
    return { data: null, error: false, loading: true };
  }

  return { data: result.data, error: result.error, loading: !result.data && !result.error };
}
