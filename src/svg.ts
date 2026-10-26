import { buildFlow } from './graph.ts';
import type { Workspace } from './types.ts';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrap(text: string, max = 28): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of String(text || '').split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function graphSvg(model: Workspace, ids: Set<string>, selectedId = ''): string {
  const { nodes, edges } = buildFlow(model, ids, selectedId, '');
  const width = Math.max(760, ...nodes.map(node => node.position.x + 260), 760);
  const height = Math.max(420, ...nodes.map(node => node.position.y + 140), 420);
  const fills: Record<string, string> = { source: '#eaf0fb', claim: '#e7f3f7', construct: '#e9f2ed', criterion: '#f6efdf', proposition: '#eee9f6' };
  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<title>Ehdotettu lähde–käsite–kriteeri-kartta</title>',
    '<desc>Visible filtered view. Solid: reported, not independently verified; dashed: study adaptation; dotted: hypothesis; grey dashed line without an arrowhead: claim membership, not a research relationship and not a causal link. Line style, colour and text state the epistemic category. No causal inference.</desc>',
    '<style>text{font-family:Arial,sans-serif}</style>',
    `<rect width="${width}" height="${height}" fill="white"/>`
  ];
  for (const edge of edges) {
    const source = nodes.find(node => node.id === edge.source);
    const target = nodes.find(node => node.id === edge.target);
    if (!source || !target || !edge.data) continue;
    const x1 = source.position.x + 230;
    const y1 = source.position.y + 46;
    const x2 = target.position.x;
    const y2 = target.position.y + 46;
    const dash = edge.data.pattern === 'dotted' ? '2 5' : edge.data.pattern === 'dashed' ? '6 4' : edge.data.pattern === 'membership' ? '2 3' : 'none';
    parts.push(`<path d="M${x1},${y1} C${x1 + 48},${y1} ${x2 - 48},${y2} ${x2},${y2}" fill="none" stroke="${edge.data.color}" stroke-width="1.4" stroke-dasharray="${dash}"/>`);
    if (edge.data.pattern !== 'membership') parts.push(`<path d="M${x2 - 8},${y2 - 4} L${x2},${y2} L${x2 - 8},${y2 + 4}" fill="none" stroke="${edge.data.color}" stroke-width="1.4"/>`);
    parts.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="10" fill="#637188">${escapeXml(edge.data.text)}</text>`);
  }
  for (const node of nodes) {
    const lines = wrap(node.data.label);
    parts.push(`<rect x="${node.position.x}" y="${node.position.y}" width="230" height="92" rx="9" fill="${fills[node.data.kind]}" stroke="#d3dce8"/>`);
    parts.push(`<text x="${node.position.x + 12}" y="${node.position.y + 20}" font-size="10" fill="#637188">${escapeXml(node.data.badge)}</text>`);
    lines.forEach((line, index) => parts.push(`<text x="${node.position.x + 12}" y="${node.position.y + 40 + index * 16}" font-size="13" fill="#203047">${escapeXml(line)}${index === 2 && node.data.label.length > line.length ? '…' : ''}</text>`));
  }
  if (!nodes.length) parts.push('<text x="32" y="56" font-size="14" fill="#637188">Ei hakua tai suodatusta vastaavia kohteita.</text>');
  parts.push('</svg>');
  return parts.join('\n');
}
