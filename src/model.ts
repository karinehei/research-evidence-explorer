// @ts-nocheck
// Runtime schema checks are the contract for both the browser and the command line.
import { hydrateConstructedCase } from './cases.ts';
import { hydrateProposition, hydrateProtocol } from './protocols.ts';
import { failCoded } from './model-errors.ts';
const SCHEMA = 2;
  const facetStates = ['full', 'partial', 'absent', 'conflicting', 'unresolved'];
  const claimKinds = ['association', 'controlled-comparison', 'paired-coverage', 'other'];
  const validationFoci = ['construct-interpretation', 'finnish-wording', 'annotation-consistency', 'evaluator-errors', 'task-applicability'];
  const propositionKeys = [
    'id', 'label', 'statement', 'boundary', 'unit', 'criterionIds', 'constructIds', 'conceptualRationale',
    'intendedClaimKind', 'intendedClaim', 'proposedDesign', 'counterexamples', 'evidenceNeeded', 'protocolIds',
    'statementRevisions', 'epistemicStatus', 'reviewState', 'basis', 'locator', 'notes', 'position'
  ];
  const protocolKeys = [
    'id', 'kind', 'label', 'status', 'propositionIds', 'criterionIds', 'constructIds', 'designKind', 'designSummary',
    'dimensions', 'separateAudits', 'targets', 'identities', 'procedure', 'validationChecks', 'observations',
    'compositeTrustScore', 'basis', 'notes'
  ];
  const caseKeys = [
    'id', 'kind', 'analyticLabel', 'title', 'task', 'taskReference', 'facets', 'sourceSnapshots', 'passages',
    'savedContexts', 'answerVariants', 'claimAnnotations', 'displayConditions', 'unmeasured',
    'columns', 'rows', 'interpretation', 'boundary', 'basis', 'propositionIds', 'criterionIds', 'decisionIds'
  ];
  const legacyKinds = ['source', 'concept', 'criterion', 'question'];
  const legacyStatuses = ['literature', 'adaptation', 'hypothesis'];
  const access = ['reported-full-text', 'reported-abstract', 'not-recorded', 'not-applicable'];
  const relations = ['motivates', 'operationalises', 'complements', 'questions', 'proposes'];
  const kinds = ['source', 'construct', 'criterion', 'proposition'];
  const epistemic = ['reported', 'adaptation', 'hypothesis'];
  const reviewStates = ['imported', 'proposed', 'reviewed'];
  const publication = ['not-recorded', 'preprint', 'published', 'in-press', 'manuscript', 'not-applicable'];
  const provenance = ['imported-summary', 'primary-inspection'];
  const appraisal = ['not-appraised', 'appraised'];
  const researchRoles = ['not-recorded', 'conceptual', 'technical', 'empirical', 'tool-workflow'];
  const legacyId = /^[a-zA-Z0-9_-]{1,80}$/;
  const idPattern = /^[a-zA-Z0-9_-]{1,120}$/;
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const clone = x => JSON.parse(JSON.stringify(x));
  const epistemicFrom = status => status === 'literature' ? 'reported' : status;
  const doiFromUrl = url => {
    const match = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i.exec(url || '');
    return match ? match[1] : '';
  };

  function validateLegacy(value) {
    const fail = msg => { throw new Error(msg); };
    const str = (x, label, max = 8000, nonempty = false) => {
      if (typeof x !== 'string' || x.length > max || (nonempty && !x.trim())) failCoded('invalidText', { field: label }, label + ': virheellinen teksti.');
    };
    if (!isObj(value) || value.schemaVersion !== 1) fail('Tuettu schemaVersion on 1.');
    if (!isObj(value.project)) fail('Projektin tiedot puuttuvat.');
    str(value.project.name, 'Projektin nimi', 120, true);
    str(value.project.description, 'Projektin kuvaus');
    if (!Array.isArray(value.nodes) || !value.nodes.length || value.nodes.length > 400) fail('Tarvitaan 1–400 kohdetta.');
    if (!Array.isArray(value.edges) || value.edges.length > 1200) fail('Yhteyksien määrä on virheellinen.');
    const ids = new Set();
    for (const n of value.nodes) {
      if (!isObj(n) || typeof n.id !== 'string' || !legacyId.test(n.id) || ids.has(n.id)) fail('Kohteen tunniste on virheellinen tai toistuu.');
      ids.add(n.id);
      if (!legacyKinds.includes(n.kind) || !legacyStatuses.includes(n.status) || !access.includes(n.access)) fail('Tuntematon kohdetyyppi, väitteen tila tai lukemistieto.');
      for (const field of ['label', 'description', 'boundary', 'locator', 'basis', 'notes', 'url', 'unit']) str(n[field], field, field === 'label' ? 160 : 8000, field === 'label');
      if (n.url && !/^https?:\/\//i.test(n.url)) failCoded('invalidUrl', {}, 'Lähdelinkin tulee alkaa http:// tai https://.');
      if (n.position !== undefined && (!isObj(n.position) || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y) || Math.abs(n.position.x) > 20000 || Math.abs(n.position.y) > 20000)) failCoded('invalidPosition', { field: 'Sijainti' }, 'Virheellinen sijainti.');
    }
    const edgeIds = new Set();
    for (const e of value.edges) {
      if (!isObj(e) || typeof e.id !== 'string' || !legacyId.test(e.id) || edgeIds.has(e.id) || ids.has(e.id) || !ids.has(e.source) || !ids.has(e.target) || !relations.includes(e.relation) || !legacyStatuses.includes(e.status)) fail('Virheellinen yhteys tai puuttuva päätepiste.');
      edgeIds.add(e.id);
      for (const f of ['label', 'rationale', 'locator']) str(e[f], f, 8000);
    }
    if (!Array.isArray(value.cases) || value.cases.length > 20) fail('Virheelliset esimerkkitapaukset.');
    const caseIds = new Set();
    for (const c of value.cases) {
      if (!isObj(c) || typeof c.id !== 'string' || !legacyId.test(c.id) || caseIds.has(c.id) || ids.has(c.id) || edgeIds.has(c.id) || c.kind !== 'constructed') fail('Esimerkin on oltava merkitty rakennetuksi.');
      caseIds.add(c.id);
      for (const f of ['title', 'task', 'interpretation', 'boundary', 'basis']) str(c[f], f);
      if (!Array.isArray(c.columns) || !c.columns.length || c.columns.length > 5 || !Array.isArray(c.rows) || c.rows.length > 20) fail('Virheellinen esimerkkitaulukko.');
      c.columns.forEach(x => str(x, 'Sarake', 160));
      c.rows.forEach(r => { if (!Array.isArray(r) || r.length !== c.columns.length) fail('Esimerkkirivin sarakemäärä ei täsmää.'); r.forEach(x => str(x, 'Solu')); });
    }
    return clone(value);
  }

  function migrate(value) {
    const legacy = validateLegacy(value);
    const nodes = legacy.nodes;
    const edges = legacy.edges;
    const byId = new Map(nodes.map(n => [n.id, n]));
    const reserved = new Set([...nodes.map(n => n.id), ...edges.map(e => e.id), ...legacy.cases.map(c => c.id), 'decision_schema1_import']);
    const position = n => n.position ? { x: n.position.x, y: n.position.y } : undefined;
    const withPosition = (record, n) => { const p = position(n); if (p) record.position = p; return record; };
    const sources = [];
    const claims = [];
    for (const n of nodes.filter(n => n.kind === 'source')) {
      const claimId = 'claim_' + n.id;
      if (!idPattern.test(claimId) || reserved.has(claimId)) throw new Error('Tuodun yhteenvedon tunnistetta ei voitu muodostaa ilman törmäystä: ' + n.id);
      reserved.add(claimId);
      sources.push(withPosition({
        id: n.id, label: n.label, citation: n.label, year: '', publicationStatus: 'not-recorded', versionOf: '',
        doi: doiFromUrl(n.url), url: n.url, access: n.access, accessNote: '', notes: n.notes
      }, n));
      // A schema 1 description is the planning-document summary, not a newly inspected primary claim.
      claims.push({
        id: claimId, sourceId: n.id, statement: n.description, methodContext: '', locator: n.locator, limitations: n.boundary,
        provenance: 'imported-summary', appraisal: 'not-appraised', basis: n.basis, epistemicStatus: epistemicFrom(n.status),
        reviewState: 'imported', notes: ''
      });
    }
    const constructs = nodes.filter(n => n.kind === 'concept').map(n => withPosition({
      id: n.id, label: n.label, definition: n.description, object: '', unit: n.unit, scope: '', competingDefinitions: '',
      boundary: n.boundary, epistemicStatus: epistemicFrom(n.status), reviewState: 'imported', basis: n.basis, locator: n.locator, notes: n.notes
    }, n));
    const criteria = nodes.filter(n => n.kind === 'criterion').map(n => {
      const constructIds = edges.filter(e => e.relation === 'operationalises' && e.target === n.id && byId.get(e.source)?.kind === 'concept').map(e => e.source).sort();
      return withPosition({
        id: n.id, label: n.label, constructIds, evidenceRequirements: n.description, assessor: '', decisionRule: '',
        permittedInference: n.boundary,
        validationNeed: constructIds.length ? '' : 'Schema 1 -kriteerillä ei ollut operationalises-yhteyttä käsitteeseen. Käsiteviite on täsmennettävä.',
        unit: n.unit, epistemicStatus: epistemicFrom(n.status), reviewState: 'imported', basis: n.basis, locator: n.locator, notes: n.notes
      }, n);
    });
    const propositions = nodes.filter(n => n.kind === 'question').map(n => withPosition(hydrateProposition({
      id: n.id, label: n.label, statement: n.description, boundary: n.boundary, unit: n.unit,
      criterionIds: edges.filter(e => e.relation === 'proposes' && e.target === n.id && byId.get(e.source)?.kind === 'criterion').map(e => e.source).sort(),
      epistemicStatus: epistemicFrom(n.status), reviewState: 'imported', basis: n.basis, locator: n.locator, notes: n.notes
    }), n));
    const relationships = edges.map(e => {
      const sourceIds = [e.source, e.target].filter(id => byId.get(id)?.kind === 'source').sort();
      return {
        id: e.id, meaning: e.relation, source: e.source, target: e.target, label: e.label, rationale: e.rationale, locator: e.locator,
        claimIds: sourceIds.map(id => 'claim_' + id).sort(), sourceIds, epistemicStatus: epistemicFrom(e.status), reviewState: 'imported', reviewNote: ''
      };
    });
    const cases = legacy.cases.map(c => hydrateConstructedCase({ ...clone(c), propositionIds: [], criterionIds: [], decisionIds: [] }));
    const decisions = [{
      id: 'decision_schema1_import',
      label: 'Schema 1 -tuonti',
      statement: 'Jokainen schema 1 -kirjallisuusmerkintä jaettiin lähteeksi ja eksplisiittisesti merkityksi tuoduksi yhteenvedoksi. Yhteenvetoa ei käsitelty alkuperäislähteestä tarkastettuna väitteenä.',
      scope: 'Säilytetty lähtöaineisto',
      rationale: 'Julkaisun tilaa ei päätelty preprint-tiedosta, osoitteesta tai vuodesta. Lukemistasosta ei päätelty menetelmällistä laatua. Alkuperäinen asiakirja säilyy kentässä legacy.document.',
      epistemicStatus: 'adaptation',
      reviewState: 'imported',
      recordIds: []
    }];
    return validate({
      schemaVersion: 2,
      project: clone(legacy.project),
      sources, claims, constructs, criteria, relationships, propositions, protocols: [], cases, decisions,
      recordRevisions: [], editLog: [],
      legacy: { schemaVersion: 1, preservedBeforeReplacement: true, document: legacy }
    });
  }

  function validate(value) {
    const fail = msg => { throw new Error(msg); };
    const str = (x, label, max = 8000, nonempty = false) => {
      if (typeof x !== 'string' || x.length > max || (nonempty && !x.trim())) failCoded('invalidText', { field: label }, label + ': virheellinen teksti.');
    };
    const oneOf = (x, allowed, label) => {
      if (!allowed.includes(x)) failCoded('invalidValue', { field: label }, label + ': virheellinen arvo.');
    };
    const keys = (obj, allowed, label) => {
      if (!isObj(obj)) failCoded('invalidRecord', { field: label }, label + ': virheellinen tietue.');
      for (const key of Object.keys(obj)) if (!allowed.includes(key)) failCoded('unknownField', { field: label, key }, label + ': tuntematon kenttä ' + key + '.');
    };
    const position = (record, label) => {
      if (record.position === undefined) return;
      if (!isObj(record.position) || !Number.isFinite(record.position.x) || !Number.isFinite(record.position.y) || Math.abs(record.position.x) > 20000 || Math.abs(record.position.y) > 20000) {
        failCoded('invalidPosition', { field: label }, label + ': virheellinen sijainti.');
      }
    };
    const idList = (list, label, allowed) => {
      if (!Array.isArray(list)) failCoded('invalidRefList', { field: label }, label + ': virheellinen viitelista.');
      const seen = new Set();
      for (const id of list) {
        if (typeof id !== 'string' || !idPattern.test(id) || seen.has(id) || !allowed.has(id)) {
          failCoded('invalidReference', { field: label }, label + ': virheellinen viite.');
        }
        seen.add(id);
      }
    };
    if (!isObj(value) || value.schemaVersion !== 2) failCoded('schemaVersionUnsupported', { version: 2 }, 'Tuettu schemaVersion on 2.');
    if (!Array.isArray(value.protocols)) value = { ...value, protocols: [] };
    if (!Array.isArray(value.recordRevisions)) value = { ...value, recordRevisions: [] };
    if (!Array.isArray(value.editLog)) value = { ...value, editLog: [] };
    keys(value, ['schemaVersion', 'project', 'sources', 'claims', 'constructs', 'criteria', 'relationships', 'propositions', 'protocols', 'cases', 'decisions', 'recordRevisions', 'editLog', 'legacy'], 'Työtila');
    keys(value.project, ['name', 'description'], 'Projekti');
    str(value.project.name, 'Projektin nimi', 120, true);
    str(value.project.description, 'Projektin kuvaus');
    for (const [key, max] of [['sources', 400], ['claims', 400], ['constructs', 400], ['criteria', 400], ['relationships', 1200], ['propositions', 400], ['protocols', 40], ['cases', 20], ['decisions', 40]]) {
      if (!Array.isArray(value[key]) || value[key].length > max) failCoded('collectionCountInvalid', { key }, 'Kokoelman ' + key + ' määrä on virheellinen.');
    }
    if (!Array.isArray(value.recordRevisions) || value.recordRevisions.length > 2000) fail('Versiolaskurin määrä on virheellinen.');
    if (!Array.isArray(value.editLog) || value.editLog.length > 500) fail('Muokkaushistorian määrä on virheellinen.');
    const graphCount = value.sources.length + value.constructs.length + value.criteria.length + value.propositions.length;
    if (graphCount < 1 || graphCount > 400) failCoded('graphCountInvalid', {}, 'Tarvitaan 1–400 lähdettä, käsitettä, kriteeriä tai propositiota.');
    const ids = new Set();
    const take = (id, label) => {
      if (typeof id !== 'string' || !idPattern.test(id) || ids.has(id)) failCoded('invalidId', { field: label }, label + ': tunniste on virheellinen tai toistuu.');
      ids.add(id);
    };
    const attachmentMeta = (list, label) => {
      if (!Array.isArray(list) || list.length > 40) fail(label + ': liitetietojen määrä on virheellinen.');
      for (const item of list) {
        keys(item, ['title', 'path', 'linkMode', 'contentType'], label + ' (liite)');
        str(item.title, label + ' (liitteen nimi)', 400); str(item.path, label + ' (liitteen polku)', 2000); str(item.linkMode, label + ' (liitetapa)', 120); str(item.contentType, label + ' (mediatyyppi)', 200);
      }
    };
    const bibliographicImport = (record, label) => {
      if (record.bibliographicImport === undefined) return;
      const bib = record.bibliographicImport;
      keys(bib, ['importedAt', 'provider', 'itemKey', 'citationKey', 'original', 'attachments', 'flags'], label + ' (tuonti)');
      str(bib.importedAt, label + ' (tuontiaika)', 80, true); str(bib.itemKey, label + ' (tuonnin tunniste)', 200); str(bib.citationKey, label + ' (viitetunniste)', 200);
      if (bib.provider !== 'zotero-csl-json') fail(label + ': tuonnin lähde on virheellinen.');
      if (bib.original === undefined) fail(label + ': alkuperäinen bibliografinen tietue puuttuu.');
      try {
        const packed = JSON.stringify(bib.original);
        if (packed.length > 100000) fail(label + ': alkuperäinen bibliografinen tietue on liian suuri.');
      } catch {
        fail(label + ': alkuperäinen bibliografinen tietue ei ole JSONia.');
      }
      attachmentMeta(bib.attachments, label);
      if (!Array.isArray(bib.flags) || bib.flags.length > 40) fail(label + ': tuonnin lippujen määrä on virheellinen.');
      for (const flag of bib.flags) str(flag, label + ' (tuonnin lippu)', 400, true);
    };
    for (const s of value.sources) {
      keys(s, ['id', 'label', 'citation', 'year', 'publicationStatus', 'versionOf', 'doi', 'url', 'access', 'accessNote', 'notes', 'nextCheck', 'researchRole', 'bibliographicImport', 'position'], 'Lähde');
      take(s.id, 'Lähde');
      str(s.label, 'Lähteen nimi', 160, true); str(s.citation, 'Viite', 8000); str(s.year, 'Vuosi', 40); str(s.versionOf, 'Versio', 120); str(s.doi, 'DOI', 200); str(s.url, 'URL'); str(s.accessNote, 'Lukemistiedon tarkenne'); str(s.notes, 'Muistiinpanot');
      if (s.nextCheck !== undefined) str(s.nextCheck, 'Seuraava tarkistus');
      if (s.researchRole !== undefined) oneOf(s.researchRole, researchRoles, 'Lähteen rooli');
      oneOf(s.publicationStatus, publication, 'Julkaisun tila'); oneOf(s.access, access, 'Lukemistieto');
      if (s.url && !/^https?:\/\//i.test(s.url)) failCoded('invalidUrl', {}, 'Lähdelinkin tulee alkaa http:// tai https://.');
      if (s.doi && !/^10\.\d{4,9}\/\S+$/.test(s.doi)) failCoded('invalidDoi', {}, 'DOI on virheellinen.');
      bibliographicImport(s, 'Lähde');
      position(s, 'Lähde');
    }
    const sourceIds = new Set(value.sources.map(s => s.id));
    for (const s of value.sources) if (s.versionOf && (!sourceIds.has(s.versionOf) || s.versionOf === s.id)) {
      failCoded('sourceVersionMissingOrSelf', {}, 'Lähteen versio viittaa puuttuvaan tai samaan lähteeseen.');
    }
    for (const s of value.sources) {
      const seen = new Set();
      let current = s.versionOf;
      while (current) {
        if (seen.has(current)) failCoded('sourceVersionCycle', {}, 'Lähteen versioyhteys muodostaa silmukan.');
        seen.add(current);
        current = value.sources.find(x => x.id === current).versionOf;
      }
    }
    for (const c of value.claims) {
      keys(c, ['id', 'sourceId', 'statement', 'methodContext', 'locator', 'limitations', 'provenance', 'appraisal', 'basis', 'epistemicStatus', 'reviewState', 'notes', 'position'], 'Lähdeväite');
      position(c, 'Lähdeväite');
      take(c.id, 'Lähdeväite');
      if (!sourceIds.has(c.sourceId)) failCoded('claimMissingSource', { what: 'lähteeseen' }, 'Lähdeväite viittaa puuttuvaan lähteeseen.');
      str(c.statement, 'Väite'); str(c.methodContext, 'Menetelmä ja konteksti'); str(c.locator, 'Lähdekohta'); str(c.limitations, 'Rajaus'); str(c.basis, 'Perusta'); str(c.notes, 'Muistiinpanot');
      oneOf(c.provenance, provenance, 'Väitteen alkuperä'); oneOf(c.appraisal, appraisal, 'Arviointi'); oneOf(c.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(c.reviewState, reviewStates, 'Arvioinnin tila');
    }
    for (const c of value.constructs) {
      keys(c, ['id', 'label', 'definition', 'object', 'unit', 'scope', 'competingDefinitions', 'boundary', 'epistemicStatus', 'reviewState', 'basis', 'locator', 'notes', 'position'], 'Käsite');
      take(c.id, 'Käsite');
      str(c.label, 'Käsitteen nimi', 160, true); str(c.definition, 'Määritelmä'); str(c.object, 'Kohde'); str(c.unit, 'Yksikkö'); str(c.scope, 'Ala'); str(c.competingDefinitions, 'Kilpailevat määritelmät'); str(c.boundary, 'Rajaus'); str(c.basis, 'Perusta'); str(c.locator, 'Lähdekohta'); str(c.notes, 'Muistiinpanot');
      oneOf(c.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(c.reviewState, reviewStates, 'Arvioinnin tila');
      position(c, 'Käsite');
    }
    const constructIds = new Set(value.constructs.map(c => c.id));
    for (const c of value.criteria) {
      keys(c, ['id', 'label', 'constructIds', 'evidenceRequirements', 'assessor', 'decisionRule', 'permittedInference', 'validationNeed', 'unit', 'epistemicStatus', 'reviewState', 'basis', 'locator', 'notes', 'position'], 'Kriteeri');
      take(c.id, 'Kriteeri');
      str(c.label, 'Kriteerin nimi', 160, true); idList(c.constructIds, 'Käsiteviite', constructIds);
      str(c.evidenceRequirements, 'Näyttövaatimus'); str(c.assessor, 'Arvioija'); str(c.decisionRule, 'Päätössääntö'); str(c.permittedInference, 'Sallittu päättely'); str(c.validationNeed, 'Validointitarve'); str(c.unit, 'Yksikkö'); str(c.basis, 'Perusta'); str(c.locator, 'Lähdekohta'); str(c.notes, 'Muistiinpanot');
      oneOf(c.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(c.reviewState, reviewStates, 'Arvioinnin tila');
      position(c, 'Kriteeri');
    }
    const criterionIds = new Set(value.criteria.map(c => c.id));
    const propositions = value.propositions.map(p => hydrateProposition(p));
    for (const p of propositions) {
      keys(p, propositionKeys, 'Propositio');
      take(p.id, 'Propositio');
      str(p.label, 'Proposition nimi', 160, true); str(p.statement, 'Väite'); str(p.boundary, 'Rajaus'); str(p.unit, 'Yksikkö'); idList(p.criterionIds, 'Kriteeriviite', criterionIds);
      idList(p.constructIds, 'Proposition käsiteviite', constructIds);
      str(p.conceptualRationale, 'Käsitteellinen perustelu'); str(p.intendedClaim, 'Ehdotettu väitelaji'); str(p.proposedDesign, 'Ehdotettu asetelma');
      str(p.counterexamples, 'Mahdolliset vastaesimerkit'); str(p.evidenceNeeded, 'Tarvittava näyttö');
      oneOf(p.intendedClaimKind, claimKinds, 'Väitelaji');
      if (!Array.isArray(p.protocolIds) || p.protocolIds.length > 40) fail('Proposition protokolla viitteet ovat virheellisiä.');
      if (!Array.isArray(p.statementRevisions) || p.statementRevisions.length > 40) fail('Proposition muutosloki on virheellinen.');
      for (const rev of p.statementRevisions) {
        keys(rev, ['revisedAt', 'previousStatement', 'rationale'], 'Muutosloki');
        str(rev.revisedAt, 'Muutosajankohta', 80); str(rev.previousStatement, 'Edellinen väite'); str(rev.rationale, 'Muutoksen perustelu');
      }
      str(p.basis, 'Perusta'); str(p.locator, 'Lähdekohta'); str(p.notes, 'Muistiinpanot');
      oneOf(p.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(p.reviewState, reviewStates, 'Arvioinnin tila');
      position(p, 'Propositio');
    }
    const propositionIds = new Set(propositions.map(p => p.id));
    const protocols = value.protocols.map(p => hydrateProtocol(p));
    for (const proto of protocols) {
      keys(proto, protocolKeys, 'Protokolla');
      take(proto.id, 'Protokolla');
      if (proto.kind !== 'assessment-protocol') fail('Protokollan tyyppi on virheellinen.');
      if (proto.status !== 'provisional-draft') fail('Protokolla merkitään provisional-draft kunnes validointinäyttö on kirjattu.');
      str(proto.label, 'Protokollan nimi', 160, true); str(proto.designSummary, 'Asetelman kuvaus'); str(proto.basis, 'Perusta'); str(proto.notes, 'Muistiinpanot');
      oneOf(proto.designKind, claimKinds, 'Protokollan väitelaji');
      idList(proto.propositionIds, 'Protokollan propositio', propositionIds);
      idList(proto.criterionIds, 'Protokollan kriteeri', criterionIds);
      idList(proto.constructIds, 'Protokollan käsite', constructIds);
      if (!Array.isArray(proto.dimensions) || !proto.dimensions.length || proto.dimensions.length > 20) fail('Protokollan ulottuvuudet ovat virheellisiä.');
      const dimIds = new Set();
      for (const dim of proto.dimensions) {
        keys(dim, ['id', 'label', 'draftWording', 'anchors', 'assessorInstructions', 'cannotAssessLabel', 'cannotAssessGuidance', 'provisional'], 'Ulottuvuus');
        if (!idPattern.test(dim.id) || dimIds.has(dim.id)) fail('Ulottuvuuden tunniste on virheellinen.');
        dimIds.add(dim.id);
        if (dim.provisional !== true) fail('Asiantuntijaulottuvuus on merkitty alustavaksi kunnes validointi tukee vahvempaa kieltä.');
        str(dim.label, 'Ulottuvuuden nimi', 160, true); str(dim.draftWording, 'Luonnosmuotoilu'); str(dim.assessorInstructions, 'Arvioijan ohje');
        str(dim.cannotAssessLabel, 'Ei voida arvioida -merkintä', 160, true); str(dim.cannotAssessGuidance, 'Ei voida arvioida -ohje');
        if (!Array.isArray(dim.anchors) || !dim.anchors.length || dim.anchors.length > 20) fail('Ulottuvuuden ankkurit ovat virheellisiä.');
        for (const anchor of dim.anchors) {
          keys(anchor, ['id', 'category', 'wording', 'revisionRationale'], 'Ankkuri');
          if (!idPattern.test(anchor.id)) fail('Ankkurin tunniste on virheellinen.');
          str(anchor.category, 'Ankkurin luokka', 40, true); str(anchor.wording, 'Ankkurin sanamuoto'); str(anchor.revisionRationale, 'Ankkurin muutoksen perustelu');
        }
      }
      if (!Array.isArray(proto.separateAudits) || proto.separateAudits.length > 20) fail('Erilliset auditointitehtävät ovat virheellisiä.');
      for (const audit of proto.separateAudits) {
        keys(audit, ['id', 'kind', 'statement', 'note'], 'Auditointi');
        if (!idPattern.test(audit.id)) fail('Auditoinnin tunniste on virheellinen.');
        oneOf(audit.kind, ['correctness', 'successful-verification'], 'Auditoinnin tyyppi');
        str(audit.statement, 'Auditoinnin kuvaus'); str(audit.note, 'Auditoinnin huomio');
      }
      if (!Array.isArray(proto.targets) || proto.targets.length > 40) fail('Protokollan kohteet ovat virheellisiä.');
      for (const target of proto.targets) {
        keys(target, ['caseId', 'answerVariantId', 'displayConditionId', 'note'], 'Protokollan kohde');
        str(target.caseId, 'Tapauksen tunniste', 120); str(target.answerVariantId, 'Vastausvariantti', 120); str(target.displayConditionId, 'Näyttöehto', 120); str(target.note, 'Kohteen huomio');
      }
      keys(proto.identities, ['questionIds', 'informationNeedIds', 'queryVariantIds', 'raterIds'], 'Protokollan identiteetit');
      for (const key of ['questionIds', 'informationNeedIds', 'queryVariantIds', 'raterIds']) {
        if (!Array.isArray(proto.identities[key]) || proto.identities[key].length > 40) fail('Protokollan identiteettilista on virheellinen.');
        proto.identities[key].forEach(id => str(id, 'Identiteetti', 120));
      }
      keys(proto.procedure, ['blinding', 'randomisation', 'repeatedObservations', 'disagreementHandling', 'independenceNote'], 'Protokollan menettely');
      for (const key of ['blinding', 'randomisation', 'repeatedObservations', 'disagreementHandling', 'independenceNote']) str(proto.procedure[key], 'Menettely');
      if (!Array.isArray(proto.validationChecks) || proto.validationChecks.length > 40) fail('Validointikysymykset ovat virheellisiä.');
      for (const check of proto.validationChecks) {
        keys(check, ['id', 'label', 'focus', 'question', 'note'], 'Validointikysymys');
        if (!idPattern.test(check.id)) fail('Validointikysymyksen tunniste on virheellinen.');
        str(check.label, 'Validointikysymyksen nimi', 160, true); str(check.question, 'Validointikysymys'); str(check.note, 'Validointihuomio');
        oneOf(check.focus, validationFoci, 'Validointikohde');
      }
      if (!Array.isArray(proto.observations) || proto.observations.length !== 0) fail('Protokolla ei saa sisältää keksittyjä havaintoja.');
      if (proto.compositeTrustScore !== 'not-computed') fail('Yhdistelmäluottamuspistettä ei lasketa.');
    }
    for (const p of propositions) {
      for (const id of p.protocolIds) if (!protocols.some(proto => proto.id === id)) {
        failCoded('missingReference', { what: 'protokolla' }, 'Proposition protokolla viite puuttuu.');
      }
    }
    const graphIds = new Set([...value.sources, ...value.constructs, ...value.criteria, ...propositions].map(r => r.id));
    const claimIds = new Set(value.claims.map(c => c.id));
    for (const r of value.relationships) {
      keys(r, ['id', 'meaning', 'source', 'target', 'label', 'rationale', 'locator', 'claimIds', 'sourceIds', 'epistemicStatus', 'reviewState', 'reviewNote'], 'Yhteys');
      take(r.id, 'Yhteys');
      if (!graphIds.has(r.source) || !graphIds.has(r.target)) failCoded('relationshipEndpointMissing', {}, 'Yhteyden päätepiste puuttuu.');
      oneOf(r.meaning, relations, 'Yhteyden merkitys');
      str(r.label, 'Yhteyden nimi'); str(r.rationale, 'Perustelu'); str(r.locator, 'Lähdekohta'); str(r.reviewNote, 'Arvioinnin muistiinpano');
      idList(r.claimIds, 'Väiteviite', claimIds); idList(r.sourceIds, 'Lähdeviite', sourceIds);
      oneOf(r.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(r.reviewState, reviewStates, 'Arvioinnin tila');
    }
    for (const raw of value.cases) {
      if (!isObj(raw) || raw.kind !== 'constructed') fail('Esimerkin on oltava merkitty rakennetuksi. Empiirinen tapaus vaatii erillisen tietuetyypin ja ajon provenienssin.');
    }
    const cases = value.cases.map(c => hydrateConstructedCase(c));
    for (const c of cases) {
      keys(c, caseKeys, 'Esimerkki');
      take(c.id, 'Esimerkki');
      if (c.kind !== 'constructed') fail('Esimerkin on oltava merkitty rakennetuksi. Empiirinen tapaus vaatii erillisen tietuetyypin ja ajon provenienssin.');
      if (c.analyticLabel !== 'constructed-analytical-example') fail('Esimerkin on säilytettävä merkintä constructed-analytical-example.');
      for (const f of ['title', 'task', 'interpretation', 'boundary', 'basis']) str(c[f], f);
      if (!Array.isArray(c.columns) || !c.columns.length || c.columns.length > 5 || !Array.isArray(c.rows) || c.rows.length > 20) fail('Virheellinen esimerkkitaulukko.');
      c.columns.forEach(x => str(x, 'Sarake', 160));
      c.rows.forEach(row => { if (!Array.isArray(row) || row.length !== c.columns.length) fail('Esimerkkirivin sarakemäärä ei täsmää.'); row.forEach(x => str(x, 'Solu')); });
      keys(c.taskReference, ['statement', 'essentialQualifications', 'temporalScope', 'acceptableSourceVersionIds'], 'Tehtäväviite');
      str(c.taskReference.statement, 'Tehtäväviite'); str(c.taskReference.essentialQualifications, 'Olennaiset rajaukset'); str(c.taskReference.temporalScope, 'Ajallinen ala');
      if (!Array.isArray(c.taskReference.acceptableSourceVersionIds) || c.taskReference.acceptableSourceVersionIds.length > 40) fail('Hyväksyttävät lähdeversiot ovat virheellisiä.');
      if (!Array.isArray(c.facets) || c.facets.length > 40) fail('Tietoasialista on virheellinen.');
      const facetIds = new Set();
      for (const facet of c.facets) {
        keys(facet, ['id', 'label', 'essential', 'collection', 'context', 'answer', 'evidenceRefs', 'reason'], 'Tietoasia');
        if (!idPattern.test(facet.id) || facetIds.has(facet.id)) fail('Tietoasian tunniste on virheellinen.');
        facetIds.add(facet.id);
        str(facet.label, 'Tietoasian nimi', 160, true); str(facet.reason, 'Tietoasian perustelu');
        if (typeof facet.essential !== 'boolean') fail('Tietoasian olennaisuus on virheellinen.');
        oneOf(facet.collection, facetStates, 'Kokoelman tila'); oneOf(facet.context, facetStates, 'Kontekstin tila'); oneOf(facet.answer, facetStates, 'Vastauksen tila');
        if (!Array.isArray(facet.evidenceRefs) || facet.evidenceRefs.length > 40) fail('Tietoasian näyttöviitteet ovat virheellisiä.');
        facet.evidenceRefs.forEach(ref => str(ref, 'Näyttöviite', 200));
      }
      if (!Array.isArray(c.sourceSnapshots) || c.sourceSnapshots.length > 40) fail('Lähdevedokset ovat virheellisiä.');
      const snapshotIds = new Set();
      for (const snap of c.sourceSnapshots) {
        keys(snap, ['id', 'label', 'version', 'note'], 'Lähdevedos');
        if (!idPattern.test(snap.id) || snapshotIds.has(snap.id)) fail('Lähdevedoksen tunniste on virheellinen.');
        snapshotIds.add(snap.id);
        str(snap.label, 'Lähdevedoksen nimi', 160, true); str(snap.version, 'Lähdeversio', 160); str(snap.note, 'Lähdevedoksen huomio');
      }
      c.taskReference.acceptableSourceVersionIds.forEach(id => { if (!snapshotIds.has(id)) fail('Hyväksyttävä lähdeversio puuttuu vedoksista.'); });
      if (!Array.isArray(c.passages) || c.passages.length > 80) fail('Katkelmat ovat virheellisiä.');
      const passageIds = new Set();
      for (const passage of c.passages) {
        keys(passage, ['id', 'sourceSnapshotId', 'locator', 'text'], 'Katkelma');
        if (!idPattern.test(passage.id) || passageIds.has(passage.id)) fail('Katkelman tunniste on virheellinen.');
        passageIds.add(passage.id);
        if (passage.sourceSnapshotId && !snapshotIds.has(passage.sourceSnapshotId)) fail('Katkelman lähdevedos puuttuu.');
        str(passage.locator, 'Katkelman paikannin', 400); str(passage.text, 'Katkelman teksti');
      }
      if (!Array.isArray(c.savedContexts) || c.savedContexts.length > 40) fail('Tallennetut kontekstit ovat virheellisiä.');
      for (const ctx of c.savedContexts) {
        keys(ctx, ['id', 'label', 'passageIds', 'note'], 'Tallennettu konteksti');
        if (!idPattern.test(ctx.id)) fail('Kontekstin tunniste on virheellinen.');
        str(ctx.label, 'Kontekstin nimi', 160, true); str(ctx.note, 'Kontekstin huomio');
        idList(ctx.passageIds, 'Kontekstin katkelma', passageIds);
      }
      if (!Array.isArray(c.displayConditions) || c.displayConditions.length > 20) fail('Näyttöehdot ovat virheellisiä.');
      const displayIds = new Set();
      for (const display of c.displayConditions) {
        keys(display, ['id', 'label', 'citationVisible', 'passageLocatorVisible', 'note'], 'Näyttöehto');
        if (!idPattern.test(display.id) || displayIds.has(display.id)) fail('Näyttöehdon tunniste on virheellinen.');
        displayIds.add(display.id);
        str(display.label, 'Näyttöehdon nimi', 160, true); str(display.note, 'Näyttöehdon huomio');
        if (typeof display.citationVisible !== 'boolean' || typeof display.passageLocatorVisible !== 'boolean') fail('Näyttöehdon näkyvyys on virheellinen.');
      }
      if (!Array.isArray(c.answerVariants) || c.answerVariants.length > 20) fail('Vastausvariantit ovat virheellisiä.');
      const answerIds = new Set();
      for (const answer of c.answerVariants) {
        keys(answer, ['id', 'label', 'text', 'displayConditionId', 'claimAnnotationIds', 'note'], 'Vastausvariantti');
        if (!idPattern.test(answer.id) || answerIds.has(answer.id)) fail('Vastausvariantin tunniste on virheellinen.');
        answerIds.add(answer.id);
        str(answer.label, 'Vastausvariantin nimi', 160, true); str(answer.text, 'Vastausvariantin teksti'); str(answer.note, 'Vastausvariantin huomio');
        if (answer.displayConditionId && !displayIds.has(answer.displayConditionId)) fail('Vastausvariantin näyttöehto puuttuu.');
        if (!Array.isArray(answer.claimAnnotationIds) || answer.claimAnnotationIds.length > 40) fail('Vastausvariantin väiteviitteet ovat virheellisiä.');
      }
      if (!Array.isArray(c.claimAnnotations) || c.claimAnnotations.length > 40) fail('Väiteannotaatiot ovat virheellisiä.');
      const claimAnnIds = new Set();
      for (const ann of c.claimAnnotations) {
        keys(ann, ['id', 'label', 'statement', 'support', 'evidenceRefs', 'reason', 'answerVariantIds', 'displayConditionIds'], 'Väiteannotaatio');
        if (!idPattern.test(ann.id) || claimAnnIds.has(ann.id)) fail('Väiteannotaation tunniste on virheellinen.');
        claimAnnIds.add(ann.id);
        str(ann.label, 'Väiteannotaation nimi', 160, true); str(ann.statement, 'Väiteannotaation teksti'); str(ann.reason, 'Väiteannotaation perustelu');
        oneOf(ann.support, facetStates, 'Väitetuki');
        if (!Array.isArray(ann.evidenceRefs) || ann.evidenceRefs.length > 40) fail('Väiteannotaation näyttöviitteet ovat virheellisiä.');
        ann.evidenceRefs.forEach(ref => str(ref, 'Näyttöviite', 200));
        idList(ann.answerVariantIds, 'Väiteannotaation vastaus', answerIds);
        idList(ann.displayConditionIds, 'Väiteannotaation näyttö', displayIds);
      }
      for (const answer of c.answerVariants) idList(answer.claimAnnotationIds, 'Vastausvariantin väite', claimAnnIds);
      keys(c.unmeasured, ['verificationSuccess', 'verificationTime', 'expertRatings'], 'Mittaamattomat');
      for (const key of ['verificationSuccess', 'verificationTime', 'expertRatings']) {
        if (c.unmeasured[key] !== 'not-measured') fail('Asiantuntija-arvoja tai tarkistusmittareita ei saa keksiä; merkitse not-measured.');
      }
    }
    for (const d of value.decisions) {
      keys(d, ['id', 'label', 'statement', 'scope', 'rationale', 'epistemicStatus', 'reviewState', 'recordIds'], 'Tutkimuspäätös');
      take(d.id, 'Tutkimuspäätös');
      str(d.label, 'Päätöksen nimi', 160, true); str(d.statement, 'Päätös'); str(d.scope, 'Ala'); str(d.rationale, 'Perustelu');
      oneOf(d.epistemicStatus, epistemic, 'Tiedollinen tila'); oneOf(d.reviewState, reviewStates, 'Arvioinnin tila');
    }
    const decisionIds = new Set(value.decisions.map(d => d.id));
    for (const c of cases) {
      idList(c.propositionIds, 'Esimerkin propositio', propositionIds);
      idList(c.criterionIds, 'Esimerkin kriteeri', criterionIds);
      idList(c.decisionIds, 'Esimerkin päätös', decisionIds);
    }
    for (const d of value.decisions) idList(d.recordIds, 'Päätöksen viite', ids);
    const revisionSeen = new Set();
    for (const rev of value.recordRevisions) {
      keys(rev, ['recordId', 'revision'], 'Versiolaskuri');
      str(rev.recordId, 'Versiolaskurin tietue', 120, true);
      if (revisionSeen.has(rev.recordId)) fail('Versiolaskurin tunniste toistuu.');
      revisionSeen.add(rev.recordId);
      if (!Number.isInteger(rev.revision) || rev.revision < 0 || rev.revision > 1000000) fail('Versiolaskurin arvo on virheellinen.');
    }
    const editKinds = ['create', 'update', 'delete', 'undo', 'import', 'csl-import', 'layout', 'other'];
    const editIds = new Set();
    for (const entry of value.editLog) {
      keys(entry, ['id', 'at', 'kind', 'summary', 'reason', 'actorLabel', 'recordIds', 'before', 'after', 'reversesEventId', 'note'], 'Muokkaustapahtuma');
      if (typeof entry.id !== 'string' || !idPattern.test(entry.id) || editIds.has(entry.id) || ids.has(entry.id)) fail('Muokkaustapahtuman tunniste on virheellinen tai toistuu.');
      editIds.add(entry.id);
      oneOf(entry.kind, editKinds, 'Muokkaustapahtuman tyyppi');
      str(entry.at, 'Muokkausajankohta', 80, true);
      str(entry.summary, 'Muokkauksen yhteenveto');
      str(entry.reason, 'Muokkauksen syy');
      str(entry.actorLabel, 'Tutkijan nimiö');
      str(entry.reversesEventId, 'Kumottu tapahtuma', 120);
      str(entry.note, 'Muokkauksen huomio');
      if (!Array.isArray(entry.recordIds) || entry.recordIds.length > 400) fail('Muokkaustapahtuman viitelista on virheellinen.');
      entry.recordIds.forEach(id => str(id, 'Muokkauksen tietueviite', 120));
      if (entry.reversesEventId && entry.kind !== 'undo') fail('Vain kumoustapahtuma voi viitata kumottuun tapahtumaan.');
    }
    if (value.legacy !== undefined) {
      keys(value.legacy, ['schemaVersion', 'preservedBeforeReplacement', 'document'], 'Alkuperäinen tuonti');
      if (value.legacy.schemaVersion !== 1 || value.legacy.preservedBeforeReplacement !== true) fail('Alkuperäinen tuonti on virheellinen.');
      validateLegacy(value.legacy.document);
    }
    const next = clone(value);
    next.propositions = propositions;
    next.protocols = protocols;
    next.cases = cases;
    next.recordRevisions = value.recordRevisions;
    next.editLog = value.editLog;
    return next;
  }

  function load(value) {
    if (!isObj(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)) {
      failCoded('schemaVersionUnsupportedFile', {}, 'Tiedoston schemaVersion ei ole tuettu. Tuettuja versioita ovat 1 ja 2.');
    }
    return value.schemaVersion === 1 ? migrate(value) : validate(value);
  }

  function applyImport(current, incoming) {
    if (!isObj(current)) failCoded('workspaceMissing', {}, 'Nykyinen työtila puuttuu.');
    try { return { ok: true, model: load(incoming), error: '', errorObject: null }; }
    catch (error) { return { ok: false, model: current, error: error instanceof Error ? error.message : String(error), errorObject: error }; }
  }

  function graphNodes(model) {
    const firstClaim = new Map();
    for (const claim of model.claims) if (!firstClaim.has(claim.sourceId)) firstClaim.set(claim.sourceId, claim);
    const nodes = [];
    for (const s of model.sources) {
      const claim = firstClaim.get(s.id);
      nodes.push({ id: s.id, kind: 'source', label: s.label, status: claim ? claim.epistemicStatus : '', description: claim ? claim.statement : '', boundary: claim ? claim.limitations : '', notes: s.notes, locator: claim ? claim.locator : '', position: s.position, access: s.access, url: s.url, unit: '', basis: claim ? claim.basis : '', reviewState: claim ? claim.reviewState : '' });
    }
    for (const c of model.constructs) nodes.push({ id: c.id, kind: 'construct', label: c.label, status: c.epistemicStatus, description: c.definition, boundary: c.boundary, notes: c.notes, locator: c.locator, position: c.position, access: 'not-applicable', url: '', unit: c.unit, basis: c.basis, reviewState: c.reviewState });
    for (const c of model.criteria) nodes.push({ id: c.id, kind: 'criterion', label: c.label, status: c.epistemicStatus, description: c.evidenceRequirements, boundary: c.permittedInference, notes: c.notes, locator: c.locator, position: c.position, access: 'not-applicable', url: '', unit: c.unit, basis: c.basis, reviewState: c.reviewState });
    for (const p of model.propositions) nodes.push({ id: p.id, kind: 'proposition', label: p.label, status: p.epistemicStatus, description: p.statement, boundary: p.boundary, notes: p.notes, locator: p.locator, position: p.position, access: 'not-applicable', url: '', unit: p.unit, basis: p.basis, reviewState: p.reviewState });
    return nodes;
  }

  function locate(model, id) {
    for (const [key, kind] of [['sources', 'source'], ['claims', 'claim'], ['constructs', 'construct'], ['criteria', 'criterion'], ['relationships', 'relationship'], ['propositions', 'proposition'], ['protocols', 'protocol'], ['cases', 'case'], ['decisions', 'decision']]) {
      const record = (model[key] || []).find(r => r.id === id);
      if (record) return { key, kind, record };
    }
    return null;
  }

  function allIds(model) {
    const recordIds = ['sources', 'claims', 'constructs', 'criteria', 'relationships', 'propositions', 'protocols', 'cases', 'decisions'].flatMap(key => (model[key] || []).map(r => r.id));
    const editIds = (model.editLog || []).map(entry => entry.id);
    return recordIds.concat(editIds);
  }

  function relationshipDraft(fields = {}) {
    return {
      id: fields.id, meaning: fields.meaning || 'motivates', source: fields.source, target: fields.target, label: fields.label || '',
      rationale: fields.rationale || '', locator: fields.locator || '', claimIds: Array.isArray(fields.claimIds) ? fields.claimIds.slice() : [],
      sourceIds: Array.isArray(fields.sourceIds) ? fields.sourceIds.slice() : [], epistemicStatus: fields.epistemicStatus || 'adaptation',
      reviewState: fields.reviewState === 'reviewed' ? 'reviewed' : 'proposed', reviewNote: fields.reviewNote || ''
    };
  }

  function planRemoval(model, id) {
    const found = locate(model, id);
    if (!found) failCoded('recordNotFound', {}, 'Kohdetta ei löydy.');
    if (['source', 'construct', 'criterion', 'proposition'].includes(found.kind) && graphNodes(model).length <= 1) {
      failCoded('lastRecordCannotRemove', {}, 'Viimeistä kohdetta ei voi poistaa.');
    }
    const next = clone(model);
    const effects = [];
    const drop = new Set([id]);
    const effect = (recordId, label, reason, kind, code) => effects.push({ id: recordId, label, reason, kind, code });
    if (found.kind === 'source') {
      for (const claim of next.claims) if (claim.sourceId === id) {
        drop.add(claim.id);
        effect(claim.id, claim.statement.slice(0, 80) || claim.id, 'Lähteen yhteenveto poistetaan.', 'evidence', 'removal.deleteEvidence');
      }
      next.claims = next.claims.filter(c => c.sourceId !== id);
      next.sources = next.sources.filter(s => s.id !== id);
    } else if (found.kind === 'claim') next.claims = next.claims.filter(c => c.id !== id);
    else if (found.kind === 'construct') next.constructs = next.constructs.filter(c => c.id !== id);
    else if (found.kind === 'criterion') next.criteria = next.criteria.filter(c => c.id !== id);
    else if (found.kind === 'proposition') next.propositions = next.propositions.filter(p => p.id !== id);
    else if (found.kind === 'protocol') next.protocols = (next.protocols || []).filter(p => p.id !== id);
    else if (found.kind === 'case') next.cases = next.cases.filter(c => c.id !== id);
    else if (found.kind === 'decision') next.decisions = next.decisions.filter(d => d.id !== id);
    else if (found.kind === 'relationship') {
      next.relationships = next.relationships.filter(r => r.id !== id);
      return { model: validate(next), effects, needsConfirmation: false };
    }
    next.relationships = next.relationships.filter(r => {
      if (drop.has(r.source) || drop.has(r.target)) {
        effect(r.id, r.label || r.id, 'Yhteys päättyy poistettavaan kohteeseen, joten se poistetaan.', 'incident-link', 'removal.endsRelationship');
        return false;
      }
      const claimsBefore = r.claimIds.length, sourcesBefore = r.sourceIds.length;
      r.claimIds = r.claimIds.filter(x => !drop.has(x));
      r.sourceIds = r.sourceIds.filter(x => !drop.has(x));
      if (r.claimIds.length !== claimsBefore || r.sourceIds.length !== sourcesBefore) {
        effect(r.id, r.label || r.id, 'Yhteyden lähde- tai väiteviite irrotetaan.', 'reference', 'removal.detachReference');
      }
      return true;
    });
    const gap = 'Käsiteviite poistettiin; viite on täsmennettävä.';
    for (const c of next.criteria) {
      if (!c.constructIds.some(x => drop.has(x))) continue;
      c.constructIds = c.constructIds.filter(x => !drop.has(x));
      if (!c.constructIds.length && !c.validationNeed.includes(gap)) c.validationNeed = (c.validationNeed ? c.validationNeed.trim() + ' ' : '') + gap;
      if (c.constructIds.length) effect(c.id, c.label, 'Käsiteviite irrotetaan.', 'reference', 'removal.detachConstructRef');
      else effect(c.id, c.label, 'Ainoa käsiteviite irrotetaan. Kriteeri säilyy, mutta viite on täsmennettävä.', 'reference', 'removal.detachSoleConstructRef');
    }
    for (const p of next.propositions) {
      let changed = false;
      if (p.criterionIds.some(x => drop.has(x))) { p.criterionIds = p.criterionIds.filter(x => !drop.has(x)); changed = true; }
      if ((p.constructIds || []).some(x => drop.has(x))) { p.constructIds = p.constructIds.filter(x => !drop.has(x)); changed = true; }
      if ((p.protocolIds || []).some(x => drop.has(x))) { p.protocolIds = p.protocolIds.filter(x => !drop.has(x)); changed = true; }
      if (changed) effect(p.id, p.label, 'Proposition viite irrotetaan.', 'reference', 'removal.detachPropositionRef');
    }
    for (const proto of (next.protocols || [])) {
      let changed = false;
      for (const key of ['propositionIds', 'criterionIds', 'constructIds']) if ((proto[key] || []).some(x => drop.has(x))) { proto[key] = proto[key].filter(x => !drop.has(x)); changed = true; }
      if (changed) effect(proto.id, proto.label, 'Protokollan viite irrotetaan.', 'reference', 'removal.detachProtocolRef');
    }
    for (const s of next.sources) if (drop.has(s.versionOf)) { s.versionOf = ''; effect(s.id, s.label, 'Versioviite irrotetaan.', 'reference', 'removal.detachVersionRef'); }
    for (const c of next.cases) {
      let changed = false;
      for (const key of ['propositionIds', 'criterionIds', 'decisionIds']) if (c[key].some(x => drop.has(x))) { c[key] = c[key].filter(x => !drop.has(x)); changed = true; }
      if (changed) effect(c.id, c.title, 'Rakennetun esimerkin viite irrotetaan.', 'reference', 'removal.detachCaseRef');
    }
    for (const d of next.decisions) {
      if (!d.recordIds.some(x => drop.has(x))) continue;
      d.recordIds = d.recordIds.filter(x => !drop.has(x));
      effect(d.id, d.label, 'Tutkimuspäätöksen viite irrotetaan.', 'reference', 'removal.detachDecisionRef');
    }
    return { model: validate(next), effects, needsConfirmation: effects.some(e => e.kind !== 'incident-link') };
  }

  function neighbourhood(model, id) {
    const nodes = new Set([id]);
    const edges = model.relationships.filter(e => e.source === id || e.target === id);
    edges.forEach(e => { nodes.add(e.source); nodes.add(e.target); });
    return { nodes, edges: new Set(edges.map(e => e.id)) };
  }

  function path(model, start, end) {
    const ids = new Set(graphNodes(model).map(n => n.id));
    if (!ids.has(start) || !ids.has(end)) return null;
    const queue = [{ nodes: [start], edges: [] }], visited = new Set([start]);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i], here = current.nodes[current.nodes.length - 1];
      if (here === end) return current;
      for (const e of model.relationships.filter(e => e.source === here)) {
        if (!visited.has(e.target)) { visited.add(e.target); queue.push({ nodes: [...current.nodes, e.target], edges: [...current.edges, e.id] }); }
      }
    }
    return null;
  }

  const csvCell = x => { let s = String(x ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  function csv(model) {
    const columns = ['recordType', 'id', 'label', 'epistemicStatus', 'reviewState', 'publicationStatus', 'access', 'provenance', 'appraisal', 'meaning', 'claimIds', 'sourceIds', 'links', 'unit', 'text', 'boundary', 'basis', 'locator', 'doi', 'url', 'notes', 'researchRole'];
    const row = fields => columns.map(key => fields[key] || '');
    const rows = [columns];
    for (const s of model.sources) rows.push(row({ recordType: 'source', id: s.id, label: s.label, publicationStatus: s.publicationStatus, access: s.access, links: s.versionOf, text: s.citation, doi: s.doi, url: s.url, notes: s.notes, researchRole: s.researchRole || 'not-recorded' }));
    for (const c of model.claims) rows.push(row({ recordType: 'claim', id: c.id, label: c.id, epistemicStatus: c.epistemicStatus, reviewState: c.reviewState, provenance: c.provenance, appraisal: c.appraisal, links: c.sourceId, text: c.statement, boundary: c.limitations, basis: c.basis, locator: c.locator, notes: c.notes }));
    for (const c of model.constructs) rows.push(row({ recordType: 'construct', id: c.id, label: c.label, epistemicStatus: c.epistemicStatus, reviewState: c.reviewState, unit: c.unit, text: c.definition, boundary: c.boundary, basis: c.basis, locator: c.locator, notes: c.notes }));
    for (const c of model.criteria) rows.push(row({ recordType: 'criterion', id: c.id, label: c.label, epistemicStatus: c.epistemicStatus, reviewState: c.reviewState, links: c.constructIds.join(' '), unit: c.unit, text: c.evidenceRequirements, boundary: c.permittedInference, basis: c.basis, locator: c.locator, notes: c.notes }));
    for (const p of model.propositions) rows.push(row({ recordType: 'proposition', id: p.id, label: p.label, epistemicStatus: p.epistemicStatus, reviewState: p.reviewState, links: [...(p.criterionIds || []), ...(p.constructIds || []), ...(p.protocolIds || [])].join(' '), unit: p.unit, text: p.statement, boundary: p.boundary, basis: p.basis, locator: p.locator, notes: p.notes }));
    for (const proto of (model.protocols || [])) rows.push(row({ recordType: 'protocol', id: proto.id, label: proto.label, links: [...proto.propositionIds, ...proto.criterionIds].join(' '), text: proto.designSummary, boundary: proto.designKind, basis: proto.basis, notes: proto.status }));
    for (const r of model.relationships) rows.push(row({ recordType: 'relationship', id: r.id, label: r.label, epistemicStatus: r.epistemicStatus, reviewState: r.reviewState, meaning: r.meaning, claimIds: (r.claimIds || []).join(' '), sourceIds: (r.sourceIds || []).join(' '), links: r.source + ' ' + r.target, text: r.rationale, boundary: r.reviewNote, locator: r.locator }));
    for (const c of model.cases) rows.push(row({ recordType: 'case', id: c.id, label: c.title, links: [...c.propositionIds, ...c.criterionIds, ...c.decisionIds].join(' '), text: c.task, boundary: c.boundary, basis: c.basis }));
    for (const d of model.decisions) rows.push(row({ recordType: 'decision', id: d.id, label: d.label, epistemicStatus: d.epistemicStatus, reviewState: d.reviewState, links: d.recordIds.join(' '), text: d.statement, boundary: d.scope, basis: d.rationale }));
    return '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  function dot(model, selected = null) {
    const quote = x => JSON.stringify(String(x));
    const nodes = graphNodes(model).filter(n => !selected || selected.has(n.id));
    const ids = new Set(nodes.map(n => n.id));
    const colors = { source: '#e8eef8', construct: '#e6f1ec', criterion: '#f5eddc', proposition: '#eee8f6' };
    const lines = ['digraph Research {', 'graph [rankdir=LR, bgcolor="white", label="Research Evidence Explorer — proposed conceptual mapping", labelloc=t];', 'node [shape=box, style="rounded,filled", fontname="Arial"];', 'edge [fontname="Arial", fontsize=10];'];
    for (const n of nodes) lines.push(`${quote(n.id)} [label=${quote(n.label + '\n[' + (n.status || 'no-claim') + ']')}, fillcolor=${quote(colors[n.kind])}];`);
    for (const e of model.relationships.filter(e => ids.has(e.source) && ids.has(e.target))) lines.push(`${quote(e.source)} -> ${quote(e.target)} [label=${quote(e.label)}, style=${quote(e.epistemicStatus === 'hypothesis' ? 'dotted' : e.epistemicStatus === 'adaptation' ? 'dashed' : 'solid')}];`);
    return lines.concat('}').join('\n');
  }


export {
  SCHEMA, kinds, epistemic, reviewStates, publication, access, provenance, appraisal, researchRoles, relations,
  validateLegacy, migrate, validate, load, applyImport, graphNodes, locate, allIds, relationshipDraft, planRemoval,
  neighbourhood, path, csv, dot
};
