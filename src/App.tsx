import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import seed from '../data/research.json';
import { csv, graphNodes, load, locate, path, planRemoval, validate } from './model.ts';
import { figureGraphvizDot } from './figures.ts';
import { formatHash, parseHash, type Route, type View } from './hash.ts';
import { visibleIds } from './graph.ts';
import { formatTrace } from './trace.ts';
import { labelsFor } from './labels.ts';
import { clone, newId } from './edit.ts';
import { graphSvg } from './svg.ts';
import { FlowMap, type FlowApi } from './FlowMap.tsx';
import { Inspector } from './Inspector.tsx';
import { CslImportDialog } from './CslImportDialog.tsx';
import { CasesView, MatrixView, QuestionsView } from './views.tsx';
import { HistoryView } from './HistoryView.tsx';
import { SnapshotDialog } from './SnapshotDialog.tsx';
import { FigureExportDialog } from './FigureExportDialog.tsx';
import { Modal } from './Modal.tsx';
import { prepareCommit, prepareUndo } from './snapshots.ts';
import { I18nProvider, LanguageSelector, useI18n, displayRecordLabel } from './i18n/index.ts';
import type { DirtyApi } from './draft.ts';
import type { EditEventKind, Workspace } from './types.ts';

const KEY = 'research-evidence-explorer-v1';
const ACTOR_KEY = 'research-evidence-explorer-actor-label-v1';

type SaveKind = 'local' | 'stored' | 'memory';
type Mode = { type: 'record' } | { type: 'add-node' } | { type: 'add-edge'; sourceId: string };
type Removal = { id: string; model: Workspace; effects: { label?: string; id: string; reason: string }[] };

function here(hash: string): string {
  return `${location.pathname}${location.search}${hash}`;
}

function readRoute(): Route {
  const route = parseHash(location.hash);
  if (route.view === 'graph' && !route.id) return { ...route, id: 'sufficiency' };
  return route;
}

function resolveId(route: Route, model: Workspace): string {
  if (route.id && locate(model, route.id)) return route.id;
  if (route.view === 'graph') return locate(model, 'sufficiency') ? 'sufficiency' : (model.sources[0]?.id || '');
  if (route.view === 'cases') return model.cases[0]?.id || '';
  return '';
}

function openWorkspace(): { model: Workspace; storageUnread: boolean } {
  const curated = load(seed) as Workspace;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { model: curated, storageUnread: false };
    return { model: load(JSON.parse(raw)) as Workspace, storageUnread: false };
  } catch {
    return { model: curated, storageUnread: true };
  }
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function App() {
  const opened = useState(openWorkspace)[0];
  const [model, setModel] = useState(opened.model);
  return <I18nProvider model={model}><AppShell opened={opened} model={model} setModel={setModel} /></I18nProvider>;
}

function AppShell({ opened, model, setModel }: {
  opened: { model: Workspace; storageUnread: boolean };
  model: Workspace;
  setModel: Dispatch<SetStateAction<Workspace>>;
}) {
  const { locale, t, hashMatches } = useI18n();
  const [route, setRoute] = useState(readRoute);
  const [edgeId, setEdgeId] = useState('');
  const [mode, setMode] = useState<Mode>({ type: 'record' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState(() => opened.storageUnread
    ? { text: t('top.storageUnread'), error: true }
    : { text: '', error: false });
  const [saveKind, setSaveKind] = useState<SaveKind>('local');
  const [undoCount, setUndoCount] = useState(0);
  const [trace, setTrace] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  const [traceText, setTraceText] = useState(() => t('graph.traceIdle'));
  const [traceStart, setTraceStart] = useState('blueprint24');
  const [traceEnd, setTraceEnd] = useState('p1');
  const [fitToken, setFitToken] = useState(0);
  const [guardTick, setGuardTick] = useState(0);
  const [dirtyOpen, setDirtyOpen] = useState(false);
  const [dirtyKind, setDirtyKind] = useState<'navigate' | 'undo'>('navigate');
  const [exportOpen, setExportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cslOpen, setCslOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [figureOpen, setFigureOpen] = useState(false);
  const [caseEditing, setCaseEditing] = useState(false);
  const [actorLabel, setActorLabel] = useState(() => {
    try { return localStorage.getItem(ACTOR_KEY) || ''; }
    catch { return ''; }
  });
  const [removal, setRemoval] = useState<Removal | null>(null);
  const modelRef = useRef(model);
  const undoRef = useRef<Workspace[]>([]);
  const routeRef = useRef(route);
  const guard = useRef<DirtyApi | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const attempted = useRef('');
  const storedRef = useRef(true);
  const graphReady = useRef(false);
  const visibleRef = useRef<Set<string>>(new Set());
  const flowApi = useRef<FlowApi | null>(null);
  modelRef.current = model;
  routeRef.current = route;
  const selectedId = resolveId(route, model);
  const selectedKind = locate(model, selectedId)?.kind || '';
  const focusable = ['source', 'claim', 'construct', 'criterion', 'proposition'].includes(selectedKind);
  const showMap = route.scope === 'map' || !focusable;
  const ids = visibleIds(model, !showMap, focusable ? selectedId : 'sufficiency', query, status);
  if (route.view === 'graph') { graphReady.current = true; visibleRef.current = ids; }
  const records = [...model.sources, ...model.constructs, ...model.criteria, ...model.propositions];
  const [graphFilterNote, setGraphFilterNote] = useState('');
  const saveState = saveKind === 'stored' ? t('top.stored') : saveKind === 'memory' ? t('top.memoryOnly') : t('top.localWorkspace');
  const descriptions: Record<View, [string, string]> = {
    graph: [t('views.graphTitle'), t('views.graphDesc')],
    matrix: [t('views.matrixTitle'), t('views.matrixDesc')],
    cases: [t('views.casesTitle'), t('views.casesDesc')],
    questions: [t('views.questionsTitle'), t('views.questionsDesc')],
    history: [t('views.historyTitle'), t('views.historyDesc')]
  };
  const navItems = [
    ['graph', '01', t('nav.graph')],
    ['matrix', '02', t('nav.matrix')],
    ['cases', '03', t('nav.cases')],
    ['questions', '04', t('nav.questions')],
    ['history', '05', t('nav.history')]
  ] as const;
  useEffect(() => {
    if (route.view !== 'graph') return;
    setGraphFilterNote(t('graph.filterStatus', { count: ids.size }));
  }, [query, status, route.view, ids.size, t, locale]);

  useEffect(() => {
    if (!trace) setTraceText(t('graph.traceIdle'));
  }, [locale, t, trace]);

  function commit(next: Workspace, success = '', options: { reason?: string; actorLabel?: string; kind?: EditEventKind; skipAutoLog?: boolean; summary?: string } = {}): boolean {
    try {
      const logged = options.skipAutoLog
        ? next
        : prepareCommit(modelRef.current, next, {
          reason: options.reason || success || '',
          actorLabel: options.actorLabel ?? actorLabel,
          kind: options.kind,
          summary: options.summary
        });
      const clean = validate(logged) as Workspace;
      if (JSON.stringify(clean) === JSON.stringify(modelRef.current)) {
        if (success) setMessage({ text: success, error: false });
        return true;
      }
      undoRef.current = [...undoRef.current.slice(-29), clone(modelRef.current)];
      setUndoCount(undoRef.current.length);
      modelRef.current = clean;
      setModel(clean);
      setTrace(null);
      try {
        localStorage.setItem(KEY, JSON.stringify(clean));
        storedRef.current = true;
        setSaveKind('stored');
        if (success) setMessage({ text: success, error: false });
      } catch {
        storedRef.current = false;
        setSaveKind('memory');
        setMessage({ text: t('top.memoryNote'), error: true });
      }
      return true;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : t('top.changeRejected'), error: true });
      return false;
    }
  }

  function applyHash(hash: string) {
    const next = parseHash(hash);
    if (next.view === 'graph' && !next.id) next.id = 'sufficiency';
    if (routeRef.current.view !== next.view || routeRef.current.scope !== next.scope) setFitToken(value => value + 1);
    setRoute(next);
    setEdgeId('');
    setMode({ type: 'record' });
  }

  useEffect(() => {
    const hash = location.hash === '' || location.hash === '#graph' ? '#graph/sufficiency' : location.hash;
    if (location.hash !== hash) history.replaceState(null, '', here(hash));
    const onHash = () => {
      const nextHash = location.hash;
      if (guard.current?.isDirty()) {
        attempted.current = nextHash;
        history.replaceState(null, '', here(formatHash(routeRef.current.view, routeRef.current.id, routeRef.current.scope)));
        setDirtyKind('navigate');
        setDirtyOpen(true);
        setGuardTick(value => value + 1);
        return;
      }
      applyHash(nextHash);
    };
    window.addEventListener('hashchange', onHash);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!guard.current?.isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  function finishPending() {
    const action = pending.current;
    const target = attempted.current;
    pending.current = null;
    attempted.current = '';
    if (dirtyKind === 'undo' && !action) { performUndo(); return; }
    if (action) action();
    else if (target) location.hash = target;
  }

  function performUndo() {
    const previous = undoRef.current[undoRef.current.length - 1];
    if (!previous) return;
    undoRef.current = undoRef.current.slice(0, -1);
    setUndoCount(undoRef.current.length);
    let restored: Workspace;
    try {
      restored = validate(prepareUndo(modelRef.current, previous, {
        actorLabel,
        reason: t('top.undoReason')
      })) as Workspace;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : t('top.undoRejected'), error: true });
      undoRef.current = [...undoRef.current, previous];
      setUndoCount(undoRef.current.length);
      return;
    }
    modelRef.current = restored;
    setModel(restored);
    setEdgeId('');
    setMode({ type: 'record' });
    setTrace(null);
    try {
      localStorage.setItem(KEY, JSON.stringify(restored));
      storedRef.current = true;
      setSaveKind('stored');
      setMessage({ text: t('top.undoSuccess'), error: false });
    } catch {
      storedRef.current = false;
      setSaveKind('memory');
      setMessage({ text: t('top.undoMemoryNote'), error: true });
    }
    if (route.id && !locate(restored, route.id)) location.hash = formatHash(route.view, resolveId({ ...route, id: '' }, restored), route.scope);
  }

  function guarded(action: () => void) {
    if (guard.current?.isDirty()) {
      pending.current = action;
      setDirtyKind('navigate');
      setDirtyOpen(true);
      setGuardTick(value => value + 1);
      return;
    }
    action();
  }

  function assignHash(next: string) {
    if (location.hash === next) guarded(() => { setEdgeId(''); setMode({ type: 'record' }); });
    else location.hash = next;
  }

  function selectRecord(id: string) {
    const next = formatHash(route.view, id, route.view === 'graph' ? route.scope : 'focus');
    if (location.hash === next && edgeId === '' && mode.type === 'record') return;
    assignHash(next);
  }

  function requestRemove(id: string) {
    guarded(() => {
      try {
        const plan = planRemoval(modelRef.current, id) as Removal & { needsConfirmation: boolean; effects: Removal['effects'] };
        const kind = locate(modelRef.current, id)?.kind;
        const quiet = kind === 'relationship' ? t('top.relationshipRemoved') : plan.effects.some(effect => effect.reason.includes('päättyy')) ? t('top.recordRemovedWithLinks') : t('top.recordRemoved');
        if (!plan.needsConfirmation) { if (commit(plan.model, quiet)) setEdgeId(''); return; }
        setRemoval({ id, model: plan.model, effects: plan.effects });
      } catch (error) { setMessage({ text: error instanceof Error ? error.message : t('top.removeFailed'), error: true }); }
    });
  }

  function confirmRemoval() {
    const pendingRemoval = removal;
    setRemoval(null);
    if (!pendingRemoval) return;
    if (!commit(pendingRemoval.model, t('top.recordRemovedDetached'))) return;
    setEdgeId('');
    if (!locate(modelRef.current, selectedId)) assignHash(formatHash(route.view, resolveId({ ...route, id: '' }, modelRef.current), route.scope));
  }

  function addClaim(sourceId: string) {
    guarded(() => {
      const copy = clone(modelRef.current);
      const id = newId(copy, 'claim');
      copy.claims.push({ id, sourceId, statement: '', methodContext: '', locator: '', limitations: '', provenance: 'imported-summary', appraisal: 'not-appraised', basis: '', epistemicStatus: 'reported', reviewState: 'proposed', notes: '' });
      if (commit(copy, t('top.claimAdded'))) selectRecord(id);
    });
  }

  function addDecision() {
    guarded(() => {
      const copy = clone(modelRef.current);
      const id = newId(copy, 'decision');
      copy.decisions.push({ id, label: t('top.newDecisionLabel'), statement: '', scope: '', rationale: '', epistemicStatus: 'adaptation', reviewState: 'proposed', recordIds: [] });
      if (commit(copy, t('top.decisionAdded'))) selectRecord(id);
    });
  }

  function replaceFromSnapshot(next: Workspace, text: string, _backup: Workspace, options: { skipAutoLog?: boolean } = {}): boolean {
    const before = undoRef.current.length;
    const ok = commit(next, text, {
      skipAutoLog: options.skipAutoLog !== false,
      kind: 'import',
      reason: text,
      actorLabel
    });
    if (!ok) return false;
    if (!storedRef.current) return true;
    if (undoRef.current.length === before) setMessage({ text: t('top.importNoChange'), error: false });
    setEdgeId('');
    setMode({ type: 'record' });
    const first = (graphNodes(modelRef.current)[0]?.id as string) || 'sufficiency';
    assignHash(formatHash('graph', first, 'map'));
    return true;
  }

  function updateActorLabel(value: string) {
    setActorLabel(value);
    try { localStorage.setItem(ACTOR_KEY, value); }
    catch { /* optional label only */ }
  }

  function exportDot() {
    if (!graphReady.current) { setMessage({ text: t('graph.dotNeedGraph'), error: true }); return; }
    if (route.view !== 'graph') setMessage({ text: t('graph.dotUsesLast'), error: false });
    download(figureGraphvizDot(model, visibleRef.current, {
      locale,
      hashMatches,
      resolveLabel: (id, fallback) => displayRecordLabel(locale, model, id, hashMatches) || fallback
    }), 'research-map.dot', 'text/vnd.graphviz');
  }

  function exportSvg() {
    if (route.view !== 'graph') { setMessage({ text: t('graph.svgWrongView'), error: true }); return; }
    download(graphSvg(model, ids, selectedId, locale, {
      hashMatches,
      resolveLabel: (id, fallback) => displayRecordLabel(locale, model, id, hashMatches) || fallback
    }), 'research-map.svg', 'image/svg+xml;charset=utf-8');
  }

  const [title, description] = descriptions[route.view];
  return <><a className="skip" href="#workspace">{t('brand.skip')}</a>
    <header className="topbar"><div className="identity"><span className="mark" aria-hidden="true">R</span><div><strong>Research Evidence Explorer</strong><span>{t('brand.tagline')}</span></div></div>
      <div className="top-actions"><LanguageSelector /><span className="save-state" role="status">{saveState}</span><button type="button" disabled={!undoCount} onClick={() => { if (guard.current?.isDirty()) { setDirtyKind('undo'); setDirtyOpen(true); setGuardTick(value => value + 1); } else performUndo(); }}>{t('top.undo')}</button><button type="button" className="primary" onClick={() => download(JSON.stringify(model, null, 2), 'research-workspace.json', 'application/json')}>{t('top.exportJson')}</button><button type="button" onClick={() => guarded(() => setSnapshotOpen(true))}>{t('top.snapshot')}</button><button type="button" onClick={() => guarded(() => setCslOpen(true))}>{t('top.csl')}</button></div></header>
    <div className="shell"><aside className="sidebar"><div className="section-label">{t('brand.workspace')}</div><nav aria-label={t('nav.aria')}>{navItems.map(([view, number, label]) => <button type="button" key={view} className={route.view === view ? 'nav active' : 'nav'} aria-current={route.view === view ? 'page' : undefined} onClick={() => assignHash(formatHash(view, selectedId, view === 'graph' ? route.scope : 'focus'))}>{number} <span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="section-label">{t('brand.phase')}</div><strong>{t('brand.phaseTitle')}</strong><p>{t('brand.phaseBody')}</p><button type="button" className="quiet" onClick={() => setAboutOpen(true)}>{t('top.about')}</button></div></aside>
      <main id="workspace" tabIndex={-1}><div className="page-head"><div><div className="eyebrow">{t('brand.eyebrow')}</div><h1>{title}</h1><p>{description}</p></div><button type="button" onClick={() => setExportOpen(true)}>{t('top.exportView')}</button></div>
        <div id="message" role="status" aria-live="polite" className={message.error ? 'error' : ''}>{message.text}</div>
        <p id="graph-filter-status" className="sr-only" aria-live="polite">{route.view === 'graph' ? graphFilterNote : ''}</p>
        {route.view === 'graph' && <div className="toolbar"><label>{t('graph.search')}<input type="search" value={query} placeholder={t('graph.searchPlaceholder')} onChange={event => { setQuery(event.target.value); setTrace(null); }} /></label><label>{t('graph.status')}<select value={status} onChange={event => { setStatus(event.target.value); setTrace(null); }}><option value="all">{t('graph.statusAll')}</option><option value="reported">{t('graph.statusReported')}</option><option value="adaptation">{t('graph.statusAdaptation')}</option><option value="hypothesis">{t('graph.statusHypothesis')}</option></select></label><button type="button" onClick={() => assignHash(formatHash('graph', selectedId, route.scope === 'map' ? 'focus' : 'map'))}>{route.scope === 'map' ? t('graph.showFocus') : t('graph.showMap')}</button><button type="button" onClick={() => flowApi.current?.zoomIn()}>{t('graph.zoomIn')}</button><button type="button" onClick={() => flowApi.current?.zoomOut()}>{t('graph.zoomOut')}</button><button type="button" onClick={() => flowApi.current?.fit()}>{t('graph.fit')}</button><button type="button" onClick={() => flowApi.current?.home()}>{t('graph.home')}</button><button type="button" onClick={() => guarded(() => { const copy = clone(modelRef.current); for (const key of ['sources', 'claims', 'constructs', 'criteria', 'propositions'] as const) copy[key].forEach(record => { delete record.position; }); commit(copy, t('graph.reflowDone')); setFitToken(value => value + 1); })}>{t('graph.reflow')}</button><button type="button" onClick={() => guarded(() => { setEdgeId(''); setMode({ type: 'add-node' }); })}>{t('graph.addNode')}</button></div>}
        <div className={route.view === 'graph' ? 'graph-workspace' : 'split-workspace'}>
          {route.view === 'graph' && <section className="graph-area" aria-label={t('graph.canvasAria')}><div className="lane-heads"><span>{t('graph.laneSources')}</span><span>{t('graph.laneClaims')}</span><span>{t('graph.laneConstructs')}</span><span>{t('graph.laneCriteria')}</span><span>{t('graph.lanePropositions')}</span></div>
            <FlowMap model={model} ids={ids} selectedId={edgeId ? '' : selectedId} selectedEdge={edgeId} trace={trace} fitToken={fitToken} guardTick={guardTick} api={flowApi} locale={locale} resolveLabel={id => displayRecordLabel(locale, model, id, hashMatches)} onSelectNode={selectRecord} onSelectEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onMove={(id, position) => { const copy = clone(modelRef.current); const found = locate(copy, id) as { record?: { position?: { x: number; y: number } } } | null; if (found?.record) found.record.position = position; commit(copy); }} />
            <div className="legend" aria-label={t('graph.legendAria')}><span><i className="line solid" aria-hidden="true" />{t('graph.legendReported')}</span><span><i className="line dashed" aria-hidden="true" />{t('graph.legendAdaptation')}</span><span><i className="line dotted" aria-hidden="true" />{t('graph.legendHypothesis')}</span><span><i className="line membership" aria-hidden="true" />{t('graph.legendMembership')}</span></div>
            <div className="graph-foot"><p>{t('graph.foot')}</p><p className="keyboard-help">{t('graph.keyboardHelp')}</p></div>
            <details className="visible-list"><summary>{t('graph.visibleList')} ({ids.size})</summary><ul className="plain-list">{[...ids].sort().map(id => {
              const label = displayRecordLabel(locale, model, id, hashMatches) || id;
              return <li key={id}><button type="button" className="quiet" onClick={() => selectRecord(id)}>{label} <span className="subtle">({id})</span></button></li>;
            })}</ul></details></section>}
          {route.view === 'matrix' && <MatrixView model={model} selectedId={selectedId} onSelect={selectRecord} onEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onCsv={() => download(csv(model), 'research-records.csv', 'text/csv;charset=utf-8')} />}
          {route.view === 'cases' && <CasesView model={model} selectedId={selectedId} onSave={commit} guard={guard} onEditModeChange={setCaseEditing} onLeave={guarded} onSelect={selectRecord} />}
          {route.view === 'questions' && <QuestionsView model={model} selectedId={selectedId} onSelect={selectRecord} onTrace={id => assignHash(formatHash('graph', id, 'focus'))} onAddDecision={addDecision} onSave={commit} />}
          {route.view === 'history' && <HistoryView model={model} actorLabel={actorLabel} onActorLabel={updateActorLabel} />}
          {route.view !== 'history' && <Inspector model={model} selectedId={selectedId} edgeId={edgeId} mode={mode} guard={guard} caseDraftPaused={route.view === 'cases' && caseEditing} onSave={commit} onMessage={text => setMessage({ text, error: true })} onOpen={selectRecord} onEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onAddEdge={sourceId => guarded(() => { setEdgeId(''); setMode({ type: 'add-edge', sourceId }); })} onAddClaim={addClaim} onRemove={requestRemove} />}
        </div>
        {route.view === 'graph' && <details className="trace"><summary>{t('graph.traceSummary')}</summary><p>{labelsFor(locale).traceLimitation}</p><div className="trace-controls"><label>{t('graph.traceStart')}<select value={traceStart} onChange={event => setTraceStart(event.target.value)}>{records.map(record => <option key={record.id} value={record.id}>{displayRecordLabel(locale, model, record.id, hashMatches) || record.label}</option>)}</select></label><label>{t('graph.traceEnd')}<select value={traceEnd} onChange={event => setTraceEnd(event.target.value)}>{records.map(record => <option key={record.id} value={record.id}>{displayRecordLabel(locale, model, record.id, hashMatches) || record.label}</option>)}</select></label><button type="button" onClick={() => { setQuery(''); setStatus('all'); setFitToken(value => value + 1); const result = path(model, traceStart, traceEnd) as { nodes: string[]; edges: string[] } | null; setTrace(result); setTraceText(formatTrace(model, result)); if (route.scope !== 'map') assignHash(formatHash('graph', selectedId, 'map')); }}>{t('graph.showTrace')}</button><button type="button" onClick={() => { setTrace(null); setTraceText(t('graph.traceIdle')); }}>{t('graph.clearTrace')}</button></div><p aria-live="polite">{traceText}</p></details>}
        <footer>{t('brand.footer')}</footer>
      </main></div>
    <Modal open={dirtyOpen} title={dirtyKind === 'undo' ? t('dialog.dirtyUndoTitle') : t('dialog.dirtyTitle')} onClose={() => { pending.current = null; attempted.current = ''; setDirtyOpen(false); }}>
      <p>{dirtyKind === 'undo' ? t('dialog.dirtyUndoBody') : t('dialog.dirtyBody')}</p>
      <div className="actions">{dirtyKind === 'navigate' && <button type="button" className="primary" onClick={() => { const ok = guard.current?.save() ?? false; if (!ok) { setDirtyOpen(false); return; } setDirtyOpen(false); finishPending(); }}>{t('dialog.saveContinue')}</button>}<button type="button" onClick={() => { guard.current?.reset(); setDirtyOpen(false); if (dirtyKind === 'undo') performUndo(); else finishPending(); }}>{dirtyKind === 'undo' ? t('dialog.discardUndo') : t('dialog.discard')}</button><button type="button" onClick={() => { pending.current = null; attempted.current = ''; setDirtyOpen(false); }}>{t('dialog.cancel')}</button></div>
    </Modal>
    <Modal open={exportOpen} title={t('dialog.exportTitle')} onClose={() => setExportOpen(false)}>
      <p>{t('dialog.exportBody')}</p>
      <div className="export-options"><button type="button" onClick={() => download(JSON.stringify(model, null, 2), 'research-workspace.json', 'application/json')}>{t('dialog.exportWorkspace')}</button><button type="button" onClick={() => { setExportOpen(false); setSnapshotOpen(true); }}>{t('dialog.exportSnapshot')}</button><button type="button" onClick={() => { setExportOpen(false); setFigureOpen(true); }}>{t('dialog.exportFigure')}</button><button type="button" onClick={exportSvg}>{t('dialog.exportSvg')}</button><button type="button" onClick={exportDot}>{t('dialog.exportDot')}</button><button type="button" onClick={() => download(csv(model), 'research-records.csv', 'text/csv;charset=utf-8')}>{t('dialog.exportCsv')}</button><button type="button" onClick={() => { setExportOpen(false); window.print(); }}>{t('dialog.exportPrint')}</button></div>
    </Modal>
    <Modal open={aboutOpen} title={t('dialog.aboutTitle')} onClose={() => setAboutOpen(false)}>
      <p>{t('dialog.aboutP1')}</p>
      <p>{t('dialog.aboutP2')}</p>
      <p>{t('dialog.aboutP3')}</p>
      <p>{t('dialog.aboutP4')}</p>
      <p>{t('dialog.aboutP5')}</p>
      <p>{t('dialog.aboutP6')}</p>
      <p>{t('dialog.localSaveDisclaimer')}</p>
      <p>{t('dialog.auditDisclaimer')}</p>
      <p>{t('dialog.aboutP7')}</p>
      <p>{t('dialog.aboutP8')}</p>
      <button type="button" className="primary" onClick={() => setAboutOpen(false)}>{t('dialog.close')}</button>
    </Modal>
    <CslImportDialog open={cslOpen} model={model} onClose={() => setCslOpen(false)} onApply={(next, text) => commit(next, text, { kind: 'csl-import', reason: text, actorLabel })} />
    <SnapshotDialog model={model} open={snapshotOpen} onClose={() => setSnapshotOpen(false)} onReplace={replaceFromSnapshot} actorLabel={actorLabel} />
    <FigureExportDialog model={model} open={figureOpen} onClose={() => setFigureOpen(false)} visibleIds={ids} selectedId={selectedId} focusId={selectedId} />
    <Modal open={Boolean(removal)} title={t('dialog.removalTitle')} onClose={() => setRemoval(null)}>
      <p>{t('dialog.removalBody')}</p>
      <ul>{removal?.effects.map(effect => <li key={`${effect.id}-${effect.reason}`}>{(effect.label || effect.id)} — {effect.reason}</li>)}</ul>
      <div className="actions"><button type="button" onClick={() => setRemoval(null)}>{t('dialog.cancel')}</button><button type="button" className="primary" onClick={confirmRemoval}>{t('dialog.removalConfirm')}</button></div>
    </Modal>
  </>;
}
