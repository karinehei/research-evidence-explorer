import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, validate } from '../src/model.ts';
import {
  PROTOCOL_DISCLAIMER, appendStatementRevision, claimKindLabel, exportAssessmentProtocol,
  reviseAnchor
} from '../src/protocols.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

const p1Statement = 'Onko kontekstin täysi tietoasiakattavuus yhteydessä asiantuntijan arvioimaan riittävyyteen, kun ennalta valittu hakumittari sekä toistuvat kysymykset ja arvioijat huomioidaan?';
const p2Statement = 'Saako eksplisiittinen väite–katkelmalinkki korkeamman koetun tarkistettavuuden arvion kuin dokumenttiviite, kun vastaus ja näyttö pidetään samoina?';
const p3Statement = 'Liittyykö olennaisen kontekstikattavuuden lasku vastauksen kattavuuden laskuun merkitysvastaavissa muunnelmapareissa?';

test('P1–P3 keep statements and distinct design kinds without established positive effects', () => {
  const p1 = model.propositions.find(item => item.id === 'p1')!;
  const p2 = model.propositions.find(item => item.id === 'p2')!;
  const p3 = model.propositions.find(item => item.id === 'p3')!;
  assert.equal(p1.statement, p1Statement);
  assert.equal(p2.statement, p2Statement);
  assert.equal(p3.statement, p3Statement);
  assert.equal(p1.intendedClaimKind, 'association');
  assert.equal(p2.intendedClaimKind, 'controlled-comparison');
  assert.equal(p3.intendedClaimKind, 'paired-coverage');
  assert.match(p1.intendedClaim, /assosiaatio/i);
  assert.match(p2.proposedDesign, /sama vastaus ja sama näyttö/i);
  assert.match(p3.proposedDesign, /merkitysvastaavat/i);
  assert.match(p1.intendedClaim, /Ei osoitettu/i);
  assert.match(p2.intendedClaim, /Ei vakiintunut/i);
  assert.match(p3.intendedClaim, /Ei vakiintunut/i);
  for (const item of [p1, p2, p3]) {
    assert.doesNotMatch(item.intendedClaim, /on osoitettu positiivinen|on vakiintunut positiivinen/i);
    assert.ok(item.criterionIds.length);
    assert.ok(item.protocolIds.length);
  }
});

test('linked protocol keeps five provisional expert dimensions and no invented observations', () => {
  const proto = model.protocols.find(item => item.id === 'proto_p2')!;
  assert.equal(proto.status, 'provisional-draft');
  assert.equal(proto.designKind, 'controlled-comparison');
  assert.equal(proto.dimensions.length, 5);
  assert.deepEqual(proto.dimensions.map(item => item.id).sort(), [
    'perceived_trustworthiness', 'perceived_verifiability', 'source_sufficiency', 'source_transparency', 'usefulness'
  ].sort());
  assert.ok(proto.dimensions.every(item => item.provisional === true));
  assert.ok(proto.dimensions.every(item => item.cannotAssessLabel.includes('ei voida arvioida')));
  assert.deepEqual(proto.observations, []);
  assert.equal(proto.compositeTrustScore, 'not-computed');
  assert.ok(proto.separateAudits.some(item => item.kind === 'correctness'));
  assert.ok(proto.separateAudits.some(item => item.kind === 'successful-verification'));
  assert.ok(proto.targets.some(item => item.answerVariantId === 'B_ans_doc' && item.displayConditionId === 'B_doc'));
  assert.ok(proto.targets.some(item => item.answerVariantId === 'B_ans_pass' && item.displayConditionId === 'B_pass'));
  assert.match(proto.procedure.independenceNote, /ei käsitellä automaattisesti riippumattomana/i);
});

test('validation checks cover five foci and agreement is not equated with construct validity', () => {
  const proto = model.protocols.find(item => item.id === 'proto_p1')!;
  const foci = new Set(proto.validationChecks.map(item => item.focus));
  assert.ok(foci.has('construct-interpretation'));
  assert.ok(foci.has('finnish-wording'));
  assert.ok(foci.has('annotation-consistency'));
  assert.ok(foci.has('evaluator-errors'));
  assert.ok(foci.has('task-applicability'));
  assert.ok(proto.validationChecks.some(item => /sopimus ei ole validiteettia|Interrater/i.test(item.note)));
  assert.match(claimKindLabel.association, /assosiaatio/i);
  assert.match(claimKindLabel['controlled-comparison'], /Kontrolloitu/i);
});

test('reviseAnchor requires rationale and export has no invented observations or composite trust score', () => {
  const proto = model.protocols.find(item => item.id === 'proto_p1')!;
  assert.throws(() => reviseAnchor(proto, 'usefulness', 'usefulness_a3', 'Uusi ankkuri', '   '), /perustelun/);
  const revised = reviseAnchor(proto, 'usefulness', 'usefulness_a3', 'Keskitaso — tarkennettu luonnosankkuri', 'Selkeytetään keskitasoa ilman validointiväitettä.');
  const anchor = revised.dimensions.find(item => item.id === 'usefulness')!.anchors.find(item => item.id === 'usefulness_a3')!;
  assert.equal(anchor.wording, 'Keskitaso — tarkennettu luonnosankkuri');
  assert.match(anchor.revisionRationale, /Selkeytetään/);
  assert.equal(revised.status, 'provisional-draft');
  assert.deepEqual(revised.observations, []);
  const copy = structuredClone(model);
  copy.protocols = copy.protocols.map(item => item.id === revised.id ? revised : item);
  const bundle = exportAssessmentProtocol(validate(copy), 'proto_p1');
  assert.equal(bundle?.exportType, 'assessment-protocol');
  assert.equal(bundle?.status, 'provisional-draft');
  assert.equal(bundle?.provisionalRubric, true);
  assert.deepEqual(bundle?.observations, []);
  assert.equal(bundle?.compositeTrustScore, 'not-computed');
  assert.equal(bundle?.inventedObservations, false);
  assert.match(bundle?.disclaimer || '', /alustava/);
  assert.match(PROTOCOL_DISCLAIMER, /yhdistelmäluottamuspistettä/i);
});

test('statement revision requires logged rationale', () => {
  const p1 = model.propositions.find(item => item.id === 'p1')!;
  assert.throws(() => appendStatementRevision(p1, 'Muutettu väite', ''), /perustelun/);
  const log = appendStatementRevision(p1, 'Muutettu väite', 'Testiperustelu vain yksikkötestissä.');
  assert.equal(log.at(-1)?.previousStatement, p1Statement);
  assert.equal(log.at(-1)?.rationale, 'Testiperustelu vain yksikkötestissä.');
});
