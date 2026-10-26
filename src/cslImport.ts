import { clone, newId } from './edit.ts';
import type { AttachmentMeta, BibliographicImport, Source, Workspace } from './types.ts';

export type MatchKind = 'new' | 'doi' | 'identifier' | 'title-year';
export type StageAction = 'create' | 'skip' | 'link';

export interface CslAuthor {
  family?: string;
  given?: string;
  literal?: string;
}

export interface ParsedCslItem {
  raw: Record<string, unknown>;
  itemKey: string;
  citationKey: string;
  title: string;
  year: string;
  doi: string;
  url: string;
  label: string;
  citation: string;
  authors: CslAuthor[];
  attachments: AttachmentMeta[];
  flags: string[];
  cslType: string;
}

export interface FieldConflict {
  field: 'label' | 'citation' | 'year' | 'doi' | 'url';
  existing: string;
  incoming: string;
}

export interface StagedItem {
  index: number;
  item: ParsedCslItem;
  matchKind: MatchKind;
  matchedSourceId: string;
  candidates: { id: string; label: string; reason: string }[];
  conflicts: FieldConflict[];
  action: StageAction;
  linkTargetId: string;
  takeFields: Partial<Record<FieldConflict['field'], boolean>>;
}

export interface ImportStage {
  items: StagedItem[];
  error: string;
}

const INTERFACE_AUTHOR = /click|select\s*all|untitled|https?:\/\/|www\.|doi:|10\.\d{4,9}\/|<|>|\.pdf$|file:|zotero:|javascript:/i;

export function normalizeDoi(value: unknown): string {
  if (typeof value !== 'string') return '';
  let text = value.trim();
  text = text.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  text = text.replace(/^doi:\s*/i, '');
  return text.toLowerCase();
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function yearFromIssued(issued: unknown): string {
  if (!issued || typeof issued !== 'object') return '';
  const record = issued as Record<string, unknown>;
  const parts = record['date-parts'];
  if (!Array.isArray(parts) || !Array.isArray(parts[0])) return '';
  const year = parts[0][0];
  return typeof year === 'number' || typeof year === 'string' ? String(year) : '';
}

function normalizeTitle(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function authorLine(author: CslAuthor): string {
  if (author.literal) return author.literal;
  return [author.family, author.given].filter(Boolean).join(', ');
}

function formatAuthors(authors: CslAuthor[]): string {
  const names = authors.map(authorLine).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} ym.`;
}

function formatCitation(item: { authors: CslAuthor[]; year: string; title: string; container: string; doi: string }): string {
  const parts = [
    formatAuthors(item.authors),
    item.year ? `(${item.year})` : '',
    item.title,
    item.container,
    item.doi ? `https://doi.org/${item.doi}` : ''
  ].filter(Boolean);
  return parts.join('. ').replace(/\.\./g, '.');
}

function flagAuthor(author: CslAuthor): string[] {
  const flags: string[] = [];
  const pieces = [author.family, author.given, author.literal].filter(Boolean) as string[];
  if (!pieces.length) flags.push('Kirjoittajakenttä on tyhjä.');
  for (const piece of pieces) {
    if (INTERFACE_AUTHOR.test(piece)) flags.push(`Kirjoittajakenttä vaatii tarkistuksen: ${piece}`);
  }
  return flags;
}

function itemKeyFrom(raw: Record<string, unknown>): string {
  const id = asText(raw.id) || asText(raw['citation-key']) || asText(raw.key);
  if (id) {
    const zotero = /\/items\/([A-Z0-9]+)$/i.exec(id);
    if (zotero) return zotero[1];
    return id.slice(0, 200);
  }
  return '';
}

function readAttachments(raw: Record<string, unknown>): AttachmentMeta[] {
  const list = raw.attachments;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 40).map(entry => {
    const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    return {
      title: asText(item.title || item.filename || item.name).slice(0, 400),
      path: asText(item.path || item.localPath || item.uri || item.url).slice(0, 2000),
      linkMode: asText(item.linkMode || item.link || item.mode).slice(0, 120),
      contentType: asText(item.contentType || item.mimeType || item['content-type']).slice(0, 200)
    };
  }).filter(item => item.title || item.path || item.linkMode || item.contentType);
}

function sanitizeOriginal(raw: Record<string, unknown>): Record<string, unknown> {
  const copy = clone(raw);
  if (Array.isArray(copy.attachments)) {
    copy.attachments = readAttachments(raw);
  }
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (typeof value === 'string' && value.length > 20000) copy[key] = value.slice(0, 20000);
    if (key.toLowerCase().includes('base64') || key === 'fileData' || key === 'data') delete copy[key];
  }
  return copy;
}

export function parseCslJson(text: string): ParsedCslItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Tiedosto ei ole kelvollista JSONia.');
  }
  const list = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items) ? (parsed as { items: unknown[] }).items : null);
  if (!list) throw new Error('CSL-JSON-tuonnin tulee olla taulukko tai objekti, jossa on items-taulukko.');
  if (!list.length) throw new Error('CSL-JSON-tiedosto ei sisällä bibliografisia tietueita.');
  if (list.length > 400) throw new Error('CSL-JSON-tuonti tukee enintään 400 tietuetta kerralla.');
  return list.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Tietue ${index + 1} ei ole objekti.`);
    const raw = entry as Record<string, unknown>;
    const authorsRaw = Array.isArray(raw.author) ? raw.author : [];
    const authors: CslAuthor[] = authorsRaw.map(author => {
      if (typeof author === 'string') return { literal: author };
      if (!author || typeof author !== 'object') return {};
      const row = author as Record<string, unknown>;
      return { family: asText(row.family), given: asText(row.given), literal: asText(row.literal) };
    });
    const flags = authors.flatMap(flagAuthor);
    if (authorsRaw.some(author => typeof author === 'string')) flags.push('Kirjoittaja on merkkijono; tarkista muoto ennen käyttöä.');
    const title = asText(raw.title).trim();
    const year = yearFromIssued(raw.issued) || asText(raw.year).trim();
    const doi = normalizeDoi(raw.DOI || raw.doi);
    if ((raw.DOI || raw.doi) && !doi) flags.push('DOI-kenttä on merkitty, mutta arvoa ei voitu normalisoida.');
    if (doi && !/^10\.\d{4,9}\/\S+$/i.test(doi)) flags.push(`DOI on epätavallinen: ${doi}`);
    const url = asText(raw.URL || raw.url).trim();
    const container = asText(raw['container-title'] || raw.publisher).trim();
    const citation = formatCitation({ authors, year, title, container, doi });
    const labelBase = formatAuthors(authors) || title || `Tuotu tietue ${index + 1}`;
    const label = (year ? `${labelBase} ${year}` : labelBase).slice(0, 160);
    const itemKey = itemKeyFrom(raw) || `csl_${index + 1}`;
    const citationKey = asText(raw['citation-key'] || raw.key).slice(0, 200);
    if (!title) flags.push('Otsikko puuttuu.');
    return {
      raw: sanitizeOriginal(raw),
      itemKey,
      citationKey,
      title,
      year,
      doi: /^10\.\d{4,9}\/\S+$/i.test(doi) ? doi : '',
      url: /^https?:\/\//i.test(url) ? url : '',
      label: label || `Tuotu tietue ${index + 1}`,
      citation: citation || label,
      authors,
      attachments: readAttachments(raw),
      flags: [...new Set(flags)],
      cslType: asText(raw.type)
    };
  });
}

function conflictsAgainst(source: Source, item: ParsedCslItem): FieldConflict[] {
  const pairs: FieldConflict[] = [
    { field: 'label', existing: source.label, incoming: item.label },
    { field: 'citation', existing: source.citation, incoming: item.citation },
    { field: 'year', existing: source.year, incoming: item.year },
    { field: 'doi', existing: source.doi, incoming: item.doi },
    { field: 'url', existing: source.url, incoming: item.url }
  ];
  return pairs.filter(pair => pair.incoming && pair.existing !== pair.incoming);
}

export function stageCslImport(model: Workspace, text: string): ImportStage {
  try {
    const parsed = parseCslJson(text);
    const byDoi = new Map<string, Source>();
    const byKey = new Map<string, Source>();
    for (const source of model.sources) {
      const doi = normalizeDoi(source.doi);
      if (doi) byDoi.set(doi, source);
      const key = source.bibliographicImport?.itemKey;
      if (key) byKey.set(key, source);
      const citationKey = source.bibliographicImport?.citationKey;
      if (citationKey) byKey.set(citationKey, source);
    }
    const items: StagedItem[] = parsed.map((item, index) => {
      const candidates: StagedItem['candidates'] = [];
      let matchKind: MatchKind = 'new';
      let matchedSourceId = '';
      const doiHit = item.doi ? byDoi.get(normalizeDoi(item.doi)) : undefined;
      const keyHit = byKey.get(item.itemKey) || (item.citationKey ? byKey.get(item.citationKey) : undefined);
      if (doiHit) {
        matchKind = 'doi';
        matchedSourceId = doiHit.id;
        candidates.push({ id: doiHit.id, label: doiHit.label, reason: 'Sama DOI' });
      } else if (keyHit) {
        matchKind = 'identifier';
        matchedSourceId = keyHit.id;
        candidates.push({ id: keyHit.id, label: keyHit.label, reason: 'Sama Zotero- tai CSL-tunniste' });
      } else {
        const titleKey = normalizeTitle(item.title);
        if (titleKey) {
          for (const source of model.sources) {
            const sameTitle = normalizeTitle(source.label) === titleKey || normalizeTitle(source.citation).includes(titleKey) || normalizeTitle(source.label).includes(titleKey);
            const sameYear = !item.year || !source.year || source.year === item.year;
            if (sameTitle && sameYear) {
              candidates.push({ id: source.id, label: source.label, reason: item.year ? 'Sama otsikko ja vuosi (ehdotus)' : 'Sama otsikko (ehdotus)' });
            }
          }
        }
        if (candidates.length) matchKind = 'title-year';
      }
      const matched = matchedSourceId ? model.sources.find(source => source.id === matchedSourceId) : undefined;
      const action: StageAction = matchKind === 'doi' || matchKind === 'identifier' ? 'skip' : candidates.length ? 'skip' : 'create';
      return {
        index,
        item,
        matchKind,
        matchedSourceId,
        candidates,
        conflicts: matched ? conflictsAgainst(matched, item) : [],
        action,
        linkTargetId: matchedSourceId || (candidates[0]?.id || ''),
        takeFields: {}
      };
    });
    return { items, error: '' };
  } catch (error) {
    return { items: [], error: error instanceof Error ? error.message : 'Tuontia ei voitu lukea.' };
  }
}

function bibliographicRecord(item: ParsedCslItem, importedAt: string): BibliographicImport {
  return {
    importedAt,
    provider: 'zotero-csl-json',
    itemKey: item.itemKey,
    citationKey: item.citationKey,
    original: item.raw,
    attachments: item.attachments,
    flags: item.flags
  };
}

export function applyCslImport(model: Workspace, stage: StagedItem[], importedAt = new Date().toISOString()): Workspace {
  const copy = clone(model);
  for (const row of stage) {
    if (row.action === 'skip') continue;
    if (row.action === 'link') {
      const targetId = row.linkTargetId || row.matchedSourceId;
      const source = copy.sources.find(item => item.id === targetId);
      if (!source) throw new Error(`Linkitettävää lähdettä ${targetId || '(puuttuu)'} ei löydy.`);
      for (const conflict of row.conflicts) {
        if (row.takeFields[conflict.field]) source[conflict.field] = conflict.incoming;
      }
      if (!source.doi && row.item.doi) source.doi = row.item.doi;
      if (!source.url && row.item.url) source.url = row.item.url;
      source.bibliographicImport = bibliographicRecord(row.item, importedAt);
      continue;
    }
    copy.sources.push({
      id: newId(copy, 'source'),
      label: row.item.label,
      citation: row.item.citation,
      year: row.item.year,
      publicationStatus: 'not-recorded',
      versionOf: '',
      doi: row.item.doi,
      url: row.item.url,
      access: 'not-recorded',
      accessNote: '',
      notes: '',
      nextCheck: '',
      bibliographicImport: bibliographicRecord(row.item, importedAt)
    });
  }
  return copy;
}

export function suggestVersionLinks(model: Workspace): { fromId: string; toId: string; reason: string }[] {
  const suggestions: { fromId: string; toId: string; reason: string }[] = [];
  for (const left of model.sources) {
    for (const right of model.sources) {
      if (left.id === right.id || left.versionOf || right.versionOf) continue;
      const leftTitle = normalizeTitle(left.label);
      const rightTitle = normalizeTitle(right.label);
      if (!leftTitle || leftTitle !== rightTitle) continue;
      const leftArxiv = /arxiv/i.test(left.doi) || /arxiv/i.test(left.url);
      const rightArxiv = /arxiv/i.test(right.doi) || /arxiv/i.test(right.url);
      if (leftArxiv === rightArxiv) continue;
      if (left.doi && right.doi && normalizeDoi(left.doi) === normalizeDoi(right.doi)) continue;
      suggestions.push({
        fromId: leftArxiv ? left.id : right.id,
        toId: leftArxiv ? right.id : left.id,
        reason: 'Sama otsikko; toinen näyttää arXiv-tunnisteelta ja toinen julkaistulta tunnisteelta. Tutkija vahvistaa version.'
      });
    }
  }
  return suggestions;
}
