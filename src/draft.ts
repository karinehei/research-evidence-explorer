import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentKey } from './edit.ts';

export interface DirtyApi {
  isDirty: () => boolean;
  save: () => boolean;
  reset: () => void;
}

export function useDraft<T>(saved: T, guard: MutableRefObject<DirtyApi | null>, save: (draft: T) => boolean) {
  const savedKey = contentKey(saved);
  const [draft, setDraft] = useState(saved);
  const draftRef = useRef(draft);
  const savedKeyRef = useRef(savedKey);
  const saveRef = useRef(save);
  draftRef.current = draft;
  savedKeyRef.current = savedKey;
  saveRef.current = save;
  useEffect(() => { setDraft(saved); }, [savedKey]);
  const persist = () => {
    const ok = saveRef.current(draftRef.current);
    if (ok) savedKeyRef.current = contentKey(draftRef.current);
    return ok;
  };
  useEffect(() => {
    guard.current = {
      isDirty: () => contentKey(draftRef.current) !== savedKeyRef.current,
      save: persist,
      reset: () => {
        const next = JSON.parse(savedKeyRef.current) as T;
        draftRef.current = next;
        setDraft(next);
      }
    };
    return () => { guard.current = null; };
  }, [guard]);
  return { draft, setDraft, persist, dirty: contentKey(draft) !== savedKey };
}
