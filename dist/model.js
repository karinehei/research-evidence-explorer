(function (root) {
  'use strict';
  const kinds = ['source', 'concept', 'criterion', 'question'];
  const statuses = ['literature', 'adaptation', 'hypothesis'];
  const access = ['reported-full-text', 'reported-abstract', 'not-recorded', 'not-applicable'];
  const relations = ['motivates', 'operationalises', 'complements', 'questions', 'proposes'];
  const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  function validate(value) {
    const fail = msg => { throw new Error(msg); };
    const str = (x, label, max = 8000, nonempty = false) => { if (typeof x !== 'string' || x.length > max || (nonempty && !x.trim())) fail(label + ': virheellinen teksti.'); };
    if (!isObj(value) || value.schemaVersion !== 1) fail('Tuettu schemaVersion on 1.');
    if (!isObj(value.project)) fail('Projektin tiedot puuttuvat.');
    str(value.project.name, 'Projektin nimi', 120, true);
    str(value.project.description, 'Projektin kuvaus');
    if (!Array.isArray(value.nodes) || !value.nodes.length || value.nodes.length > 400) fail('Tarvitaan 1–400 kohdetta.');
    if (!Array.isArray(value.edges) || value.edges.length > 1200) fail('Yhteyksien määrä on virheellinen.');
    const ids = new Set();
    for (const n of value.nodes) {
      if (!isObj(n) || typeof n.id !== 'string' || !idPattern.test(n.id) || ids.has(n.id)) fail('Kohteen tunniste on virheellinen tai toistuu.');
      ids.add(n.id);
      if (!kinds.includes(n.kind) || !statuses.includes(n.status) || !access.includes(n.access)) fail('Tuntematon kohdetyyppi, väitteen tila tai lukemistieto.');
      for (const field of ['label','description','boundary','locator','basis','notes','url','unit']) str(n[field], field, field === 'label' ? 160 : 8000, field === 'label');
      if (n.url && !/^https?:\/\//i.test(n.url)) fail('Lähdelinkin tulee alkaa http:// tai https://.');
      if (n.position !== undefined && (!isObj(n.position) || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y) || Math.abs(n.position.x) > 20000 || Math.abs(n.position.y) > 20000)) fail('Virheellinen sijainti.');
    }
    const edgeIds = new Set();
    for (const e of value.edges) {
      if (!isObj(e) || typeof e.id !== 'string' || !idPattern.test(e.id) || edgeIds.has(e.id) || !ids.has(e.source) || !ids.has(e.target) || !relations.includes(e.relation) || !statuses.includes(e.status)) fail('Virheellinen yhteys tai puuttuva päätepiste.');
      edgeIds.add(e.id);
      for (const f of ['label','rationale','locator']) str(e[f], f, 8000);
    }
    if (!Array.isArray(value.cases) || value.cases.length > 20) fail('Virheelliset esimerkkitapaukset.');
    const caseIds = new Set();
    for (const c of value.cases) {
      if (!isObj(c) || typeof c.id !== 'string' || !idPattern.test(c.id) || caseIds.has(c.id) || c.kind !== 'constructed') fail('Esimerkin on oltava merkitty rakennetuksi.');
      caseIds.add(c.id);
      for (const f of ['title','task','interpretation','boundary','basis']) str(c[f], f);
      if (!Array.isArray(c.columns) || !c.columns.length || c.columns.length > 5 || !Array.isArray(c.rows) || c.rows.length > 20) fail('Virheellinen esimerkkitaulukko.');
      c.columns.forEach(x => str(x, 'Sarake', 160));
      c.rows.forEach(r => { if (!Array.isArray(r) || r.length !== c.columns.length) fail('Esimerkkirivin sarakemäärä ei täsmää.'); r.forEach(x => str(x, 'Solu')); });
    }
    return JSON.parse(JSON.stringify(value));
  }
  function neighbourhood(model, id) {
    const nodes = new Set([id]);
    const edges = model.edges.filter(e => e.source === id || e.target === id);
    edges.forEach(e => { nodes.add(e.source); nodes.add(e.target); });
    return { nodes, edges: new Set(edges.map(e => e.id)) };
  }
  function path(model, start, end) {
    if (!model.nodes.some(n => n.id === start) || !model.nodes.some(n => n.id === end)) return null;
    const queue = [{ nodes: [start], edges: [] }], visited = new Set([start]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], current = p.nodes[p.nodes.length - 1];
      if (current === end) return p;
      for (const e of model.edges.filter(e => e.source === current)) {
        if (!visited.has(e.target)) { visited.add(e.target); queue.push({ nodes: [...p.nodes,e.target], edges: [...p.edges,e.id] }); }
      }
    }
    return null;
  }
  const csvCell = x => { let s = String(x ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"'; };
  function csv(model) {
    const header = ['id','kind','label','status','unit','description','boundary','access','basis','locator','url','notes'];
    return '\uFEFF' + [header,...model.nodes.map(n => header.map(k => n[k]))].map(r => r.map(csvCell).join(',')).join('\r\n');
  }
  function dot(model, selected = null) {
    const quote = x => JSON.stringify(String(x));
    const nodes = selected ? model.nodes.filter(n => selected.has(n.id)) : model.nodes;
    const ids = new Set(nodes.map(n => n.id));
    const colors = {source:'#e8eef8',concept:'#e6f1ec',criterion:'#f5eddc',question:'#eee8f6'};
    const lines = ['digraph Research {','graph [rankdir=LR, bgcolor="white", label="Research Evidence Explorer — proposed conceptual mapping", labelloc=t];','node [shape=box, style="rounded,filled", fontname="Arial"];','edge [fontname="Arial", fontsize=10];'];
    for (const n of nodes) lines.push(`${quote(n.id)} [label=${quote(n.label + '\n[' + n.status + ']')}, fillcolor=${quote(colors[n.kind])}];`);
    for (const e of model.edges.filter(e => ids.has(e.source) && ids.has(e.target))) lines.push(`${quote(e.source)} -> ${quote(e.target)} [label=${quote(e.label)}, style=${quote(e.status === 'hypothesis' ? 'dotted' : e.status === 'adaptation' ? 'dashed' : 'solid')}];`);
    return lines.concat('}').join('\n');
  }
  const api = { validate, neighbourhood, path, csv, dot, kinds, statuses, access, relations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResearchModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
