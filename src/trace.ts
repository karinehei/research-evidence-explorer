import { locate } from './model.ts';
import { meaningLabel, traceLimitation } from './labels.ts';
import type { Workspace } from './types.ts';

export { traceLimitation };

export function formatTrace(model: Workspace, result: { nodes: string[]; edges: string[] } | null): string {
  if (!result) return 'Valituilla kohteilla ei ole kirjattua suunnattua ketjua. Puuttuva polku ei osoita tutkimustulosta eikä sitä, etteikö yhteyttä voisi myöhemmin kirjata.';
  const name = (id: string) => locate(model, id)?.record.label || id;
  let text = name(result.nodes[0]);
  result.edges.forEach((edgeId, index) => {
    const edge = model.relationships.find(item => item.id === edgeId);
    const meaning = edge ? ((edge.label || '').trim() || meaningLabel[edge.meaning]) : 'yhteys';
    text += ` —[${meaning}]→ ${name(result.nodes[index + 1])}`;
  });
  return text;
}
