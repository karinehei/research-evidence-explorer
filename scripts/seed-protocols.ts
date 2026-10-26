import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultExpertDimensions, hydrateProposition, hydrateProtocol } from '../src/protocols.ts';
import { validate } from '../src/model.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(root, '../data/research.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const sharedValidationChecks = [
  {
    id: 'val_construct',
    label: 'Käsitteen tulkinta',
    focus: 'construct-interpretation',
    question: 'Tulkitaanko ulottuvuus ja ankkurit samoin kuin kirjatuissa käsitteissä?',
    note: 'Sopimus ei ole validiteettia. Interrater-sopimus ei korvaa konstruktivaliditeettia.'
  },
  {
    id: 'val_finnish',
    label: 'Suomenkielinen sanamuoto',
    focus: 'finnish-wording',
    question: 'Onko suomenkielinen luonnosmuotoilu yksiselitteinen arvioijille tässä tehtävässä?',
    note: 'Sanamuodon tarkistus on erillinen tarkistus, ei empiirinen tulos.'
  },
  {
    id: 'val_annotation',
    label: 'Annotoinnin johdonmukaisuus',
    focus: 'annotation-consistency',
    question: 'Pysyvätkö väite–katkelma- ja kattavuusmerkinnät johdonmukaisina saman tehtävän sisällä?',
    note: 'Johdonmukaisuus on erillinen tarkistus suhteessa asiantuntijaulottuvuuksiin.'
  },
  {
    id: 'val_evaluator',
    label: 'Arvioijan virheet',
    focus: 'evaluator-errors',
    question: 'Millaisia systemaattisia arvioijavirheitä protokolla ennakoi ja miten ne kirjataan?',
    note: 'Virheiden käsittely suunnitellaan etukäteen; havaintoja ei ole vielä kerätty.'
  },
  {
    id: 'val_task',
    label: 'Tehtävän soveltuvuus',
    focus: 'task-applicability',
    question: 'Soveltuuko rubriikki tähän tehtävätyyppiin vai vaatiiko se erillisen rajauksen?',
    note: 'Soveltuvuus on avoin validointikysymys, ei todettu pätevyys.'
  }
];

const separateAudits = [
  {
    id: 'audit_correctness',
    kind: 'correctness',
    statement: 'Oikeellisuus kirjataan erilliseen auditointitehtävään, ei asiantuntijaulottuvuuteen.',
    note: 'Ei yhdistetä koettuun luotettavuuteen eikä yhdistelmäpisteeseen.'
  },
  {
    id: 'audit_verification',
    kind: 'successful-verification',
    statement: 'Onnistunut tarkistus kirjataan erilliseen tehtävä-/aikatietueeseen.',
    note: 'Koettu tarkistettavuus ei ole onnistuneen tarkistuksen mittari.'
  }
];

const procedureBase = {
  blinding: 'Arvioija ei näe hypoteesin suuntaa eikä toisen näkymän / parin tulosta ennen omaa arviotaan, jos sokaistus on toteutettavissa.',
  randomisation: 'Näkymien / varianttien järjestys satunnaistetaan arvioijittain, kun vertailu sitä edellyttää.',
  repeatedObservations: 'Toistetut arviot samasta vastauksesta ja näkymästä kirjataan toistoina; niitä ei käsitellä automaattisesti riippumattomina.',
  disagreementHandling: 'Eroavuudet kirjataan; sovittelu ja kolmas arvioija määritellään ennen analyysiä. Sopimus ≠ validiteetti.',
  independenceNote: 'Jokaista tulevaa arviota ei käsitellä automaattisesti riippumattomana havaintona. Kysymys, tiedontarve, muunnelma ja arvioija säilytetään identiteetteinä.'
};

const statements = {
  p1: 'Onko kontekstin täysi tietoasiakattavuus yhteydessä asiantuntijan arvioimaan riittävyyteen, kun ennalta valittu hakumittari sekä toistuvat kysymykset ja arvioijat huomioidaan?',
  p2: 'Saako eksplisiittinen väite–katkelmalinkki korkeamman koetun tarkistettavuuden arvion kuin dokumenttiviite, kun vastaus ja näyttö pidetään samoina?',
  p3: 'Liittyykö olennaisen kontekstikattavuuden lasku vastauksen kattavuuden laskuun merkitysvastaavissa muunnelmapareissa?'
};

function enrichProposition(raw: Record<string, unknown>, extra: Record<string, unknown>) {
  if (extra.statement && raw.statement !== extra.statement) {
    throw new Error(`Statement drift for ${raw.id}: preserve existing wording.`);
  }
  return hydrateProposition({ ...raw, ...extra, statement: raw.statement });
}

data.propositions = data.propositions.map((raw: Record<string, unknown>) => {
  if (raw.id === 'p1') {
    return enrichProposition(raw, {
      statement: statements.p1,
      constructIds: ['sufficiency', 'task'],
      conceptualRationale: 'Kontekstin tietoasiakattavuus ja asiantuntijan arvioima riittävyys ovat erillisiä konstruktioita; yhteyttä ei ole vielä mitattu.',
      intendedClaimKind: 'association',
      intendedClaim: 'Tuleva assosiaatio: kontekstikattavuus × asiantuntijan arvioima riittävyys. Ei osoitettu positiivinen vaikutus.',
      proposedDesign: 'Assosiaatioasetelma ennalta valitulla hakumittarilla; toistuvat kysymykset ja arvioijat kirjataan. Ei kontrolloitua kausaalitestiä.',
      unit: 'Kysymys × kontekstitilanne × arvioija',
      counterexamples: 'Täysi kattavuus ilman riittävyysarviota; korkea riittävyysarvio vajavaisesta kontekstista; arvioijien erimielisyys.',
      evidenceNeeded: 'Kerätyt asiantuntija-arviot viidellä erillisellä ulottuvuudella sekä kattavuusmerkinnät; ei yhdistelmäpistettä.',
      protocolIds: ['proto_p1'],
      statementRevisions: []
    });
  }
  if (raw.id === 'p2') {
    return enrichProposition(raw, {
      statement: statements.p2,
      constructIds: ['transparency', 'verification', 'credibility'],
      conceptualRationale: 'Esitystapavertailu pitää vastauksen ja näytön vakioina; vain lähdenäkymä vaihtuu. Koettu tarkistettavuus ≠ onnistunut tarkistus.',
      intendedClaimKind: 'controlled-comparison',
      intendedClaim: 'Kontrolloitu esitystapavertailu (katkelmalinkki vs dokumenttiviite) koetulle tarkistettavuudelle. Ei vakiintunut positiivinen vaikutus.',
      proposedDesign: 'Sama vastaus ja sama näyttö; vertaa B_ans_doc/B_doc ja B_ans_pass/B_pass. Satunnaista näkymäjärjestys. Älä päättele oikeellisuutta arviosta.',
      unit: 'Vastaus × lähdenäkymä × arvioija',
      counterexamples: 'Näkymäero ilman arviomuutosta; arvio muuttuu mutta tarkistus ei onnistu; vastaus tai näyttö vuotaa ehtojen välillä.',
      evidenceNeeded: 'Parittaiset asiantuntija-arviot vakioidulla vastauksella/näytöllä; erillinen auditointi oikeellisuudelle ja onnistuneelle tarkistukselle.',
      protocolIds: ['proto_p2'],
      statementRevisions: []
    });
  }
  if (raw.id === 'p3') {
    return enrichProposition(raw, {
      statement: statements.p3,
      constructIds: ['sufficiency', 'task', 'robustness'],
      conceptualRationale: 'Merkitysvastaavat muunnelmaparit erottavat muotoilun vaikutuksen kattavuuteen; generoinnin kompensaatio on vastaesimerkki.',
      intendedClaimKind: 'paired-coverage',
      intendedClaim: 'Parittainen kattavuuden muutos merkitysvastaavissa kyselyissä. Ei vakiintunut kausaalivaikutus.',
      proposedDesign: 'Parita merkitysvastaavat kyselyt; mittaa kontekstin ja vastauksen kattavuuden muutokset samassa konfiguraatiossa. Älä nimeä vaikutusta morfologiaksi ilman erillistä perustelua.',
      unit: 'Tiedontarve × muunnelmapari',
      counterexamples: 'Kontekstikattavuus laskee mutta vastaus kompensoi; konteksti riittää mutta vastaus epäonnistuu; parit eivät ole merkitysvastaavia.',
      evidenceNeeded: 'Parittaiset kattavuusmerkinnät; muotoilujen vastaavuuden tarkistus; ei asiantuntijaulottuvuuksien yhdistelmäpistettä.',
      protocolIds: ['proto_p3'],
      statementRevisions: []
    });
  }
  if (raw.id === 'q_validity') {
    return enrichProposition(raw, {
      constructIds: ['credibility', 'verification'],
      conceptualRationale: 'Kriteerien validointi on avoin kysymys. Interrater-sopimus ei ole konstruktivaliditeettia.',
      intendedClaimKind: 'other',
      intendedClaim: 'Validointisuunnitelma: käsitteen tulkinta, sanamuoto, annotointi, arvioijavirheet ja tehtävän soveltuvuus.',
      proposedDesign: 'Kirjaa konkreettiset validointitarkistukset protokolliin. Älä päättele validiteettia pelkästä sopimuksesta tai korrelaatiosta.',
      unit: 'Kriteeri × arvioija × tehtävätyyppi',
      counterexamples: 'Korkea sopimus väärinymmärretyllä konstruktiolla; hyvä tehtäväkohtainen sopimus ilman yleistettävyyttä.',
      evidenceNeeded: 'Validointitarkistusten tulokset erillisinä tietueina; ei keksittyjä havaintoja tässä työtilassa.',
      protocolIds: ['proto_validity'],
      statementRevisions: []
    });
  }
  return hydrateProposition(raw);
});

data.protocols = [
  hydrateProtocol({
    id: 'proto_p1',
    kind: 'assessment-protocol',
    label: 'P1 · Assosiaatioprotokolla (alustava)',
    propositionIds: ['p1'],
    criterionIds: ['expert', 'facets', 'ranking'],
    constructIds: ['sufficiency', 'task'],
    designKind: 'association',
    designSummary: 'Tuleva yhteystarkastelu kontekstikattavuuden ja asiantuntijan arvioiman riittävyyden välillä. Ei kontrolloitu kausaalitesti eikä osoitettu vaikutus.',
    dimensions: defaultExpertDimensions(),
    separateAudits,
    targets: [
      {
        caseId: 'A',
        answerVariantId: 'A_ans',
        displayConditionId: 'A_display',
        note: 'Tuleva arvio viittaisi tallennettuun vastaukseen ja lähdenäkymään; havaintoja ei ole kerätty.'
      }
    ],
    identities: {
      questionIds: ['p1'],
      informationNeedIds: ['need_p1_context_sufficiency'],
      queryVariantIds: ['qv_p1_placeholder'],
      raterIds: ['rater_slot_a', 'rater_slot_b']
    },
    procedure: procedureBase,
    validationChecks: sharedValidationChecks,
    observations: [],
    compositeTrustScore: 'not-computed',
    basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Expert rubric and future propositions',
    notes: 'Alustava rubriikki. Ei inventoituja havaintoja.'
  }),
  hydrateProtocol({
    id: 'proto_p2',
    kind: 'assessment-protocol',
    label: 'P2 · Esitystapavertailu (alustava)',
    propositionIds: ['p2'],
    criterionIds: ['display', 'expert'],
    constructIds: ['transparency', 'verification', 'credibility'],
    designKind: 'controlled-comparison',
    designSummary: 'Kontrolloitu esitystapavertailu: sama vastaus ja sama näyttö; vertaa dokumenttiviitettä ja katkelmalinkkiä. Ei vakiintunut positiivinen vaikutus.',
    dimensions: defaultExpertDimensions(),
    separateAudits,
    targets: [
      {
        caseId: 'B',
        answerVariantId: 'B_ans_doc',
        displayConditionId: 'B_doc',
        note: 'Dokumenttiviitenäkymä; vastaus/näyttö vakioidaan suhteessa katkelmalinkkiin.'
      },
      {
        caseId: 'B',
        answerVariantId: 'B_ans_pass',
        displayConditionId: 'B_pass',
        note: 'Katkelmalinkkinäkymä; vastaus/näyttö vakioidaan suhteessa dokumenttiviitteeseen.'
      }
    ],
    identities: {
      questionIds: ['p2'],
      informationNeedIds: ['need_p2_verifiability_display'],
      queryVariantIds: ['qv_p2_shared_answer'],
      raterIds: ['rater_slot_a', 'rater_slot_b']
    },
    procedure: {
      ...procedureBase,
      randomisation: 'Dokumenttiviite- ja katkelmalinkkinäkymien järjestys satunnaistetaan arvioijittain. Vastaus ja näyttö pidetään samoina.'
    },
    validationChecks: sharedValidationChecks,
    observations: [],
    compositeTrustScore: 'not-computed',
    basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Case B presentation contrast',
    notes: 'Kohteet viittaavat tapauksen B tallennettuihin vastauksiin ja näyttöehtoihin.'
  }),
  hydrateProtocol({
    id: 'proto_p3',
    kind: 'assessment-protocol',
    label: 'P3 · Parittainen kattavuus (alustava)',
    propositionIds: ['p3'],
    criterionIds: ['facets', 'pairs'],
    constructIds: ['sufficiency', 'task', 'robustness'],
    designKind: 'paired-coverage',
    designSummary: 'Parittaiset merkitysvastaavat kyselyt ja niiden kontekstin/vastauksen kattavuuden muutokset. Ei vakiintunut vaikutus.',
    dimensions: defaultExpertDimensions(),
    separateAudits,
    targets: [
      {
        caseId: 'A',
        answerVariantId: 'A_ans',
        displayConditionId: 'A_display',
        note: 'Paikkamerkki tulevalle parivertailulle; parin toista muunnelmaa ei ole vielä tallennettu erillisenä vastauksena.'
      }
    ],
    identities: {
      questionIds: ['p3'],
      informationNeedIds: ['need_p3_paired_coverage'],
      queryVariantIds: ['qv_p3_form_a', 'qv_p3_form_b'],
      raterIds: ['rater_slot_a', 'rater_slot_b']
    },
    procedure: procedureBase,
    validationChecks: sharedValidationChecks,
    observations: [],
    compositeTrustScore: 'not-computed',
    basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Paired meaning-equivalent queries',
    notes: 'Kattavuusmuutokset kirjataan parittain; asiantuntijaulottuvuudet pysyvät erillisinä.'
  }),
  hydrateProtocol({
    id: 'proto_validity',
    kind: 'assessment-protocol',
    label: 'Kriteerien validointiprotokolla (alustava)',
    propositionIds: ['q_validity'],
    criterionIds: ['currency', 'support', 'expert'],
    constructIds: ['credibility', 'verification'],
    designKind: 'other',
    designSummary: 'Avoimet validointitarkistukset. Interrater-sopimus ei ole konstruktivaliditeettia. Ei kerättyjä havaintoja.',
    dimensions: defaultExpertDimensions(),
    separateAudits,
    targets: [],
    identities: {
      questionIds: ['q_validity'],
      informationNeedIds: ['need_rubric_validation'],
      queryVariantIds: [],
      raterIds: ['rater_slot_a', 'rater_slot_b']
    },
    procedure: procedureBase,
    validationChecks: sharedValidationChecks,
    observations: [],
    compositeTrustScore: 'not-computed',
    basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Remaining validation needs',
    notes: 'Linkittää validointikysymykset konkreettisiin tarkistuksiin ilman inventoituja tuloksia.'
  })
];

const checked = validate(data);
fs.writeFileSync(dataPath, JSON.stringify(checked, null, 2) + '\n');
console.log('Seeded protocols:', checked.protocols.map((p: { id: string }) => p.id).join(', '));
console.log('P1–P3 statements unchanged:',
  checked.propositions.find((p: { id: string }) => p.id === 'p1').statement === statements.p1,
  checked.propositions.find((p: { id: string }) => p.id === 'p2').statement === statements.p2,
  checked.propositions.find((p: { id: string }) => p.id === 'p3').statement === statements.p3
);
