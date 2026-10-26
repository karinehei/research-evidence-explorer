export const views = ['graph', 'matrix', 'cases', 'questions'] as const;
export type View = typeof views[number];
export type Scope = 'focus' | 'map';
export interface Route { view: View; scope: Scope; id: string }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean).map(part => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const head = parts[0] || 'graph';
  if (head === 'map') return { view: 'graph', scope: 'map', id: parts[1] || '' };
  if (head === 'graph') {
    if (parts[1] === 'map') return { view: 'graph', scope: 'map', id: parts[2] || '' };
    if (parts[1] === 'focus') return { view: 'graph', scope: 'focus', id: parts[2] || '' };
    return { view: 'graph', scope: 'focus', id: parts[1] || '' };
  }
  if (head === 'matrix' || head === 'cases' || head === 'questions') return { view: head, scope: 'focus', id: parts[1] || '' };
  return { view: 'graph', scope: 'focus', id: '' };
}

export function formatHash(view: View, id = '', scope: Scope = 'focus'): string {
  const safe = id ? `/${encodeURIComponent(id)}` : '';
  if (view === 'graph' && scope === 'map') return id ? `#map/${encodeURIComponent(id)}` : '#map';
  return `#${view}${safe}`;
}
