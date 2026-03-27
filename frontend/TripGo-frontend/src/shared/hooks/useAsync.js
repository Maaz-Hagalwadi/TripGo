import { useState, useEffect, useCallback } from 'react';

/**
 * Replaces the repetitive useState + useEffect pattern for data fetching.
 * Gives you data, loading, error, and a refetch function out of the box.
 *
 * @param {Function} asyncFn - async function that returns data
 * @param {Array} deps - dependency array (like useEffect)
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function }}
 *
 * @example
 * const { data: buses, loading, error, refetch } = useAsync(() => getBuses(), []);
 */
const useAsync = (asyncFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
};

export default useAsync;
