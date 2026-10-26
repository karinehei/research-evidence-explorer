import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentKey } from './edit.ts';

export interface DirtyApi {
  isDirty: () => boolean;
  save: () => boolean;
  reset: () => void;
}

export function useDraft<T>(
  saved: T,
  guard: MutableRefObject<DirtyApi | null>,
  save: (draft: T) => boolean,
  options?: { active?: boolean; onReset?: () => void }
) {
  const active = options?.active !== false;
  const savedKey = contentKey(saved);
  const [draft, setDraft] = useState(saved);
  const draftRef = useRef(draft);
  const savedKeyRef = useRef(savedKey);
  const saveRef = useRef(save);
  const onResetRef = useRef(options?.onReset);
  draftRef.current = draft;
  savedKeyRef.current = savedKey;
  saveRef.current = save;
  onResetRef.current = options?.onReset;
  useEffect(() => { setDraft(saved); }, [savedKey]);
  const persist = () => {
    const ok = saveRef.current(draftRef.current);
    if (ok) savedKeyRef.current = contentKey(draftRef.current);
    return ok;
  };
  useEffect(() => {
    if (!active) return;
    const api: DirtyApi = {
      isDirty: () => contentKey(draftRef.current) !== savedKeyRef.current,
      save: persist,
      reset: () => {
        const next = JSON.parse(savedKeyRef.current) as T;
        draftRef.current = next;
        setDraft(next);
        onResetRef.current?.();
      }
    };
    guard.current = api;
    return () => {
      if (guard.current === api) guard.current = null;
    };
  }, [guard, active]);
  return { draft, setDraft, persist, dirty: contentKey(draft) !== savedKey };
}
