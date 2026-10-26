import { useEffect, useRef, useState } from 'react';
import seed from '../data/research.json';
import { applyImport, csv, dot, graphNodes, load, locate, path, planRemoval, validate } from './model.ts';
import { formatHash, parseHash, type Route, type View } from './hash.ts';
import { visibleIds } from './graph.ts';
import { formatTrace, traceLimitation } from './trace.ts';
import { clone, newId } from './edit.ts';
import { graphSvg } from './svg.ts';
import { FlowMap, type FlowApi } from './FlowMap.tsx';
import { Inspector } from './Inspector.tsx';
import { CslImportDialog } from './CslImportDialog.tsx';
import { CasesView, MatrixView, QuestionsView } from './views.tsx';
import type { DirtyApi } from './draft.ts';
import type { Workspace } from './types.ts';

const KEY = 'research-evidence-explorer-v1';
const descriptions: Record<View, [string, string]> = {
  graph: ['Lähteistä arviointikriteereihin', 'Tutki, mihin käsitteet ja omat menetelmävalinnat perustuvat.'],
  matrix: ['Arviointimatriisi', 'Käsitteet, kriteerit, näyttö ja päätelmien rajat samassa näkymässä.'],
  cases: ['Tehtävästä näyttöön', 'Rakennetut tapaukset A–C erottavat kattavuuden, väitetuen ja näytön. Näkymä ei ole validoitu kausaalimalli.'],
  questions: ['Oletukset ja avoimet kysymykset', 'Säilytä ehdotetut suhteet erillään jo osoitetuista tuloksista.']
};

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

function openWorkspace(): { model: Workspace; warning: string } {
  const curated = load(seed) as Workspace;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { model: curated, warning: '' };
    return { model: load(JSON.parse(raw)) as Workspace, warning: '' };
  } catch {
    return { model: curated, warning: 'Paikallista tallennetta ei voitu lukea. Lähtömalli avattiin; tallenne säilyy koskemattomana seuraavaan muokkaukseen asti.' };
  }
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

type Mode = { type: 'record' } | { type: 'add-node' } | { type: 'add-edge'; sourceId: string };
type Removal = { id: string; model: Workspace; effects: { label?: string; id: string; reason: string }[] };

export function App() {
  const opened = useState(openWorkspace)[0];
  const [model, setModel] = useState(opened.model);
  const [route, setRoute] = useState(readRoute);
  const [edgeId, setEdgeId] = useState('');
  const [mode, setMode] = useState<Mode>({ type: 'record' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState({ text: opened.warning, error: Boolean(opened.warning) });
  const [saveState, setSaveState] = useState('Paikallinen työtila');
  const [undoCount, setUndoCount] = useState(0);
  const [trace, setTrace] = useState<{ nodes: string[]; edges: string[] } | null>(null);
  const [traceText, setTraceText] = useState('Ketju seuraa suunnattuja yhteyksiä; se ei vahvista perustelujen pätevyyttä.');
  const [traceStart, setTraceStart] = useState('blueprint24');
  const [traceEnd, setTraceEnd] = useState('p1');
  const [fitToken, setFitToken] = useState(0);
  const [guardTick, setGuardTick] = useState(0);
  const [dirtyOpen, setDirtyOpen] = useState(false);
  const [dirtyKind, setDirtyKind] = useState<'navigate' | 'undo'>('navigate');
  const [exportOpen, setExportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cslOpen, setCslOpen] = useState(false);
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
  const fileRef = useRef<HTMLInputElement>(null);
  modelRef.current = model;
  routeRef.current = route;
  const selectedId = resolveId(route, model);
  const selectedKind = locate(model, selectedId)?.kind || '';
  const focusable = ['source', 'claim', 'construct', 'criterion', 'proposition'].includes(selectedKind);
  const showMap = route.scope === 'map' || !focusable;
  const ids = visibleIds(model, !showMap, focusable ? selectedId : 'sufficiency', query, status);
  if (route.view === 'graph') { graphReady.current = true; visibleRef.current = ids; }
  const records = [...model.sources, ...model.constructs, ...model.criteria, ...model.propositions];

  function commit(next: Workspace, success = ''): boolean {
    try {
      const clean = validate(next) as Workspace;
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
        setSaveState('Tallennettu tähän selaimeen');
        if (success) setMessage({ text: success, error: false });
      } catch {
        storedRef.current = false;
        setSaveState('Paikallinen tallennus ei onnistunut');
        setMessage({ text: 'Paikallinen tallennus ei onnistunut. Vie JSON säilyttääksesi muutokset.', error: true });
      }
      return true;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Muutos hylättiin.', error: true });
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
    return () => window.removeEventListener('hashchange', onHash);
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
    modelRef.current = previous;
    setModel(previous);
    setEdgeId('');
    setMode({ type: 'record' });
    setTrace(null);
    try {
      localStorage.setItem(KEY, JSON.stringify(previous));
      storedRef.current = true;
      setSaveState('Tallennettu tähän selaimeen');
      setMessage({ text: 'Edellinen muutos kumottiin.', error: false });
    } catch {
      storedRef.current = false;
      setSaveState('Paikallinen tallennus ei onnistunut');
      setMessage({ text: 'Edellinen muutos kumottiin. Paikallinen tallennus ei onnistunut. Vie JSON säilyttääksesi työtilan.', error: true });
    }
    if (route.id && !locate(previous, route.id)) location.hash = formatHash(route.view, resolveId({ ...route, id: '' }, previous), route.scope);
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
        const quiet = kind === 'relationship' ? 'Yhteys poistettiin. Toiminnon voi kumota.' : plan.effects.some(effect => effect.reason.includes('päättyy')) ? 'Kohde poistettiin yhteyksineen. Toiminnon voi kumota.' : 'Kohde poistettiin. Toiminnon voi kumota.';
        if (!plan.needsConfirmation) { if (commit(plan.model, quiet)) setEdgeId(''); return; }
        setRemoval({ id, model: plan.model, effects: plan.effects });
      } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Poisto ei onnistunut.', error: true }); }
    });
  }

  function confirmRemoval() {
    const pendingRemoval = removal;
    setRemoval(null);
    if (!pendingRemoval) return;
    if (!commit(pendingRemoval.model, 'Kohde poistettiin ja viitteet irrotettiin yhdessä toiminnossa. Toiminnon voi kumota.')) return;
    setEdgeId('');
    if (!locate(modelRef.current, selectedId)) assignHash(formatHash(route.view, resolveId({ ...route, id: '' }, modelRef.current), route.scope));
  }

  function addClaim(sourceId: string) {
    guarded(() => {
      const copy = clone(modelRef.current);
      const id = newId(copy, 'claim');
      copy.claims.push({ id, sourceId, statement: '', methodContext: '', locator: '', limitations: '', provenance: 'imported-summary', appraisal: 'not-appraised', basis: '', epistemicStatus: 'reported', reviewState: 'proposed', notes: '' });
      if (commit(copy, 'Tuotu yhteenveto lisättiin. Se ei ole alkuperäisvarmennus.')) selectRecord(id);
    });
  }

  function addDecision() {
    guarded(() => {
      const copy = clone(modelRef.current);
      const id = newId(copy, 'decision');
      copy.decisions.push({ id, label: 'Uusi päätös', statement: '', scope: '', rationale: '', epistemicStatus: 'adaptation', reviewState: 'proposed', recordIds: [] });
      if (commit(copy, 'Tutkimuspäätös lisättiin ehdotuksena.')) selectRecord(id);
    });
  }

  async function importFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { setMessage({ text: 'Tiedosto ylittää 2 Mt:n tuontirajan.', error: true }); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); }
    catch (error) { setMessage({ text: `Tuonti hylättiin; nykyinen työtila säilyi. ${error instanceof Error ? error.message : 'Tiedosto ei ole JSONia.'}`, error: true }); return; }
    const apply = () => {
      const result = applyImport(modelRef.current, parsed);
      if (!result.ok) { setMessage({ text: `Tuonti hylättiin; nykyinen työtila säilyi. ${result.error}`, error: true }); return; }
      const before = undoRef.current.length;
      if (!commit(result.model as Workspace)) return;
      if (!storedRef.current) return;
      setMessage({ text: undoRef.current.length === before ? 'Tuonti vastasi nykyistä työtilaa. Muutoksia ei tehty.' : 'Työtila tuotiin ja tarkastettiin. Edellisen työtilan voi palauttaa Kumoa-toiminnolla.', error: false });
      setEdgeId('');
      setMode({ type: 'record' });
      const first = (graphNodes(modelRef.current)[0]?.id as string) || 'sufficiency';
      assignHash(formatHash('graph', first, 'map'));
    };
    guarded(apply);
  }

  function exportDot() {
    if (!graphReady.current) { setMessage({ text: 'DOT-vienti käyttää graafissa näkyvää rajausta. Avaa kartta ja vie uudelleen.', error: true }); return; }
    if (route.view !== 'graph') setMessage({ text: 'DOT-vienti käyttää graafin viimeksi näkyvissä ollutta rajausta.', error: false });
    download((dot as (workspace: Workspace, selected?: Set<string>) => string)(model, visibleRef.current), 'research-map.dot', 'text/vnd.graphviz');
  }

  function exportSvg() {
    if (route.view !== 'graph') { setMessage({ text: 'SVG-vienti koskee graafia. Muita näkymiä voi tulostaa tai tallentaa PDF:nä selaimessa.', error: true }); return; }
    download(graphSvg(model, ids, selectedId), 'research-map.svg', 'image/svg+xml;charset=utf-8');
  }

  const [title, description] = descriptions[route.view];
  return <><a className="skip" href="#workspace">Siirry sisältöön</a>
    <header className="topbar"><div className="identity"><span className="mark" aria-hidden="true">R</span><div><strong>Research Evidence Explorer</strong><span>Finnish healthcare RAG · Käsitteellisen mallin työtila</span></div></div>
      <div className="top-actions"><span role="status">{saveState}</span><button type="button" disabled={!undoCount} onClick={() => { if (guard.current?.isDirty()) { setDirtyKind('undo'); setDirtyOpen(true); setGuardTick(value => value + 1); } else performUndo(); }}>Kumoa</button><button type="button" className="primary" onClick={() => download(JSON.stringify(model, null, 2), 'research-workspace.json', 'application/json')}>Vie JSON</button><button type="button" onClick={() => fileRef.current?.click()}>Tuo JSON</button><button type="button" onClick={() => guarded(() => setCslOpen(true))}>Tuo Zotero CSL</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file); }} /></div></header>
    <div className="shell"><aside className="sidebar"><div className="section-label">TUTKIMUSTYÖTILA</div><nav aria-label="Näkymät">{([['graph', '01', 'Lähteistä kriteereihin'], ['matrix', '02', 'Arviointimatriisi'], ['cases', '03', 'Rakennetut tapaukset'], ['questions', '04', 'Oletukset ja kysymykset']] as const).map(([view, number, label]) => <button type="button" key={view} className={route.view === view ? 'nav active' : 'nav'} aria-current={route.view === view ? 'page' : undefined} onClick={() => assignHash(formatHash(view, selectedId, view === 'graph' ? route.scope : 'focus'))}>{number} <span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="section-label">TUTKIMUKSEN VAIHE</div><strong>Käsitteellinen kehittäminen</strong><p>Omat sovellukset ja testaamattomat oletukset on erotettu kirjallisuuden sisällöstä.</p><button type="button" className="quiet" onClick={() => setAboutOpen(true)}>Tietomallista ja käytöstä</button></div></aside>
      <main id="workspace"><div className="page-head"><div><div className="eyebrow">VUODEN 1 ARTIKKELI</div><h1>{title}</h1><p>{description}</p></div><button type="button" onClick={() => setExportOpen(true)}>Vie näkymä</button></div>
        <div id="message" role="status" aria-live="polite" className={message.error ? 'error' : ''}>{message.text}</div>
        {route.view === 'graph' && <div className="toolbar"><label>Hae kohdetta<input type="search" value={query} placeholder="Esim. riittävyys tai Järvelin" onChange={event => { setQuery(event.target.value); setTrace(null); }} /></label><label>Näyttöä koskeva tila<select value={status} onChange={event => { setStatus(event.target.value); setTrace(null); }}><option value="all">Kaikki tilat</option><option value="reported">Raportoitu, ei itsenäisesti varmennettu</option><option value="adaptation">Oma sovellus</option><option value="hypothesis">Testaamaton oletus</option></select></label><button type="button" onClick={() => assignHash(formatHash('graph', selectedId, route.scope === 'map' ? 'focus' : 'map'))}>{route.scope === 'map' ? 'Näytä valitun kohteen ketjut' : 'Näytä koko kartta'}</button><button type="button" onClick={() => flowApi.current?.zoomIn()}>Lähennä</button><button type="button" onClick={() => flowApi.current?.zoomOut()}>Loitonna</button><button type="button" onClick={() => flowApi.current?.fit()}>Sovita näkymään</button><button type="button" onClick={() => flowApi.current?.home()}>Alkuun</button><button type="button" onClick={() => { const copy = clone(model); for (const key of ['sources', 'claims', 'constructs', 'criteria', 'propositions'] as const) copy[key].forEach(record => { delete record.position; }); commit(copy, 'Sarakkeiden järjestys palautettiin.'); setFitToken(value => value + 1); }}>Jäsennä sarakkeisiin</button><button type="button" onClick={() => guarded(() => { setEdgeId(''); setMode({ type: 'add-node' }); })}>Lisää kohde</button></div>}
        <div className={route.view === 'graph' ? 'graph-workspace' : 'split-workspace'}>
          {route.view === 'graph' && <section className="graph-area" aria-label="Lähteiden ja kriteerien yhteyskaavio"><div className="lane-heads"><span>Lähteet</span><span>Lähdeväitteet</span><span>Käsitteet</span><span>Arviointikriteerit</span><span>Avoimet kysymykset</span></div>
            <FlowMap model={model} ids={ids} selectedId={edgeId ? '' : selectedId} selectedEdge={edgeId} trace={trace} fitToken={fitToken} guardTick={guardTick} api={flowApi} onSelectNode={selectRecord} onSelectEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onMove={(id, position) => { const copy = clone(modelRef.current); const found = locate(copy, id) as { record?: { position?: { x: number; y: number } } } | null; if (found?.record) found.record.position = position; commit(copy); }} />
            <div className="legend"><span><i className="line solid" />Raportoitu, ei varmennettu</span><span><i className="line dashed" />Oma sovellus</span><span><i className="line dotted" />Testaamaton oletus</span><span><i className="line membership" />Lähdeviite, ei kausaalinuoli</span></div>
            <div className="graph-foot">Yhteydet kuvaavat perusteluja ja ehdotuksia. Viivatyyppi, väri ja teksti kertovat tiedollisen tilan. Graafi ei osoita syy-seuraussuhteita.</div></section>}
          {route.view === 'matrix' && <MatrixView model={model} selectedId={selectedId} onSelect={selectRecord} onEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onCsv={() => download(csv(model), 'research-records.csv', 'text/csv;charset=utf-8')} />}
          {route.view === 'cases' && <CasesView model={model} selectedId={selectedId} onSelect={selectRecord} onSave={commit} />}
          {route.view === 'questions' && <QuestionsView model={model} selectedId={selectedId} onSelect={selectRecord} onTrace={id => assignHash(formatHash('graph', id, 'focus'))} onAddDecision={addDecision} />}
          <Inspector model={model} selectedId={selectedId} edgeId={edgeId} mode={mode} guard={guard} onSave={commit} onMessage={text => setMessage({ text, error: true })} onOpen={selectRecord} onEdge={id => guarded(() => { setMode({ type: 'record' }); setEdgeId(id); })} onAddEdge={sourceId => guarded(() => { setEdgeId(''); setMode({ type: 'add-edge', sourceId }); })} onAddClaim={addClaim} onRemove={requestRemove} />
        </div>
        {route.view === 'graph' && <details className="trace"><summary>Jäljitä perusteluketju</summary><p>{traceLimitation}</p><div className="trace-controls"><label>Lähtökohta<select value={traceStart} onChange={event => setTraceStart(event.target.value)}>{records.map(record => <option key={record.id} value={record.id}>{record.label}</option>)}</select></label><label>Päätepiste<select value={traceEnd} onChange={event => setTraceEnd(event.target.value)}>{records.map(record => <option key={record.id} value={record.id}>{record.label}</option>)}</select></label><button type="button" onClick={() => { setQuery(''); setStatus('all'); setFitToken(value => value + 1); const result = path(model, traceStart, traceEnd) as { nodes: string[]; edges: string[] } | null; setTrace(result); setTraceText(formatTrace(model, result)); if (route.scope !== 'map') assignHash(formatHash('graph', selectedId, 'map')); }}>Näytä ketju</button><button type="button" onClick={() => { setTrace(null); setTraceText('Ketju seuraa suunnattuja yhteyksiä; se ei vahvista perustelujen pätevyyttä.'); }}>Tyhjennä valinta</button></div><p aria-live="polite">{traceText}</p></details>}
        <footer>Työversio · Lähtöaineisto: käyttäjän kirjallisuusmatriisi ja artikkelisuunnitelma 26.10.2026 · Ei alkuperäislähteiden uutta kokotekstiarviointia</footer>
      </main></div>
    {dirtyOpen && <dialog open className="modal"><h2>{dirtyKind === 'undo' ? 'Kumoaminen hylkää lomakkeen muutokset' : 'Tallentamattomia muutoksia'}</h2><p>{dirtyKind === 'undo' ? 'Lomakkeessa on muutoksia, joita ei ole tallennettu. Kumoaminen hylkää ne.' : 'Lomakkeessa on muutoksia, joita ei ole tallennettu. Siirtyminen hylkää ne, jos et tallenna.'}</p><div className="actions">{dirtyKind === 'navigate' && <button type="button" className="primary" onClick={() => { const ok = guard.current?.save() ?? false; if (!ok) { setDirtyOpen(false); return; } setDirtyOpen(false); finishPending(); }}>Tallenna ja jatka</button>}<button type="button" onClick={() => { guard.current?.reset(); setDirtyOpen(false); if (dirtyKind === 'undo') performUndo(); else finishPending(); }}>{dirtyKind === 'undo' ? 'Hylkää ja kumoa' : 'Hylkää muutokset'}</button><button type="button" onClick={() => { pending.current = null; attempted.current = ''; setDirtyOpen(false); }}>Peruuta</button></div></dialog>}
    {exportOpen && <dialog open><div className="dialog-head"><h2>Vie nykyinen työ</h2><button type="button" aria-label="Sulje" onClick={() => setExportOpen(false)}>×</button></div><p>JSON säilyttää muokkaukset. Kuvaviennit kuvaavat nykyistä näkyvää graafia.</p><div className="export-options"><button type="button" onClick={() => download(JSON.stringify(model, null, 2), 'research-workspace.json', 'application/json')}>Työtila JSON</button><button type="button" onClick={exportSvg}>Graafi SVG</button><button type="button" onClick={exportDot}>Graafi Graphviz DOT</button><button type="button" onClick={() => download(csv(model), 'research-records.csv', 'text/csv;charset=utf-8')}>Kohteet CSV</button><button type="button" onClick={() => { setExportOpen(false); window.print(); }}>Tulosta nykyinen näkymä</button></div></dialog>}
    {aboutOpen && <dialog open><div className="dialog-head"><h2>Jäljitettävä tutkimustyötila</h2><button type="button" aria-label="Sulje" onClick={() => setAboutOpen(false)}>×</button></div><p>Tämä aloitusmalli sisältää valikoituja, käsin jäsennettyjä yhteyksiä kahdesta toimittamastasi asiakirjasta. Se ei ole koko kirjallisuusmatriisin automaattinen muunnos eikä valmis katsaus.</p><p>Schema 2 erottaa lähteen, tuodun yhteenvedon ja tutkijan päätöksen. Kirjallisuusmerkintä ei ole itsenäinen varmennus. Preprint- tai kokotekstitieto ei ole laadunarvio.</p><p>Lukemistieto tarkoittaa asiakirjoissa raportoitua tarkastelutasoa. Alkuperäisiä tutkimuksia ei ole arvioitu uudelleen tätä työtilaa varten. Tyhjä yhteys ei osoita tutkimusaukkoa.</p><p>Zotero CSL-JSON -tuonti on tutkijan käynnistämä ja esikatsellaan ennen hyväksyntää. Se voi luoda lähteitä, mutta ei keksi väitteitä, menetelmiä tai lukemistilaa. Liitteet säilytetään vain metatietona. Ulkoista tekoälypalvelua ei käytetä, eikä yksityisiä muistiinpanoja lähetetä.</p><p>Kehitysversio käynnistyy paikallisella palvelimella komennolla npm run dev. Julkaistu versio on Vite-koonti, jota palvelee paikallinen palvelin tai GitHub Pages. Selain ei avaa moduulikoontia suoraan tiedostona.</p><p>Muokkaukset tallentuvat tämän selaimen paikalliseen muistiin. Jos tallennus epäonnistuu, Vie JSON säilyttää työn. Tiedoston tuonti korvaa työtilan vasta tarkastuksen jälkeen.</p><p>Lisää kohteita ja yhteyksiä graafissa. Yhteydelle valitaan merkitys erikseen. Matriisi muodostuu samoista tiedoista. Tapaukset A–C ovat rakennettuja esimerkkejä; asiantuntija-arvioita tai tutkimustuloksia ei ole keksitty.</p><button type="button" className="primary" onClick={() => setAboutOpen(false)}>Sulje</button></dialog>}
    {cslOpen && <CslImportDialog model={model} onClose={() => setCslOpen(false)} onApply={(next, text) => { commit(next, text); }} />}
    {removal && <dialog open><div className="dialog-head"><h2>Poisto irrottaa viitteet</h2><button type="button" aria-label="Sulje" onClick={() => setRemoval(null)}>×</button></div><p>Poisto ja viitteiden irrotus tehdään yhtenä kumottavana toiminnona. Peruuta, jos nykyinen työtila säilytetään.</p><ul>{removal.effects.map(effect => <li key={`${effect.id}-${effect.reason}`}>{(effect.label || effect.id)} — {effect.reason}</li>)}</ul><div className="actions"><button type="button" onClick={() => setRemoval(null)}>Peruuta</button><button type="button" className="primary" onClick={confirmRemoval}>Poista ja irrota viitteet</button></div></dialog>}
  </>;
}
