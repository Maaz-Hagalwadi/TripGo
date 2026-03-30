import { useEffect } from 'react';

const useClickOutside = (refs, onOutside) => {
  useEffect(() => {
    const handler = (e) => {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      if (refsArray.every(ref => ref.current && !ref.current.contains(e.target))) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [refs, onOutside]);
};

export default useClickOutside;
