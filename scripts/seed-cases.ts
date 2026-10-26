import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateConstructedCase } from '../src/cases.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(root, '../data/research.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const A = hydrateConstructedCase({
  id: 'A',
  kind: 'constructed',
  title: 'A · Tuettu väite, puuttuva poikkeus',
  task: 'Tehtävä edellyttää tavallisen yhteydenottokanavan sekä poikkeusehdon E ja sen kanavan tunnistamista.',
  taskReference: {
    statement: 'Tehtävä edellyttää tavallisen yhteydenottokanavan sekä poikkeusehdon E ja sen kanavan tunnistamista.',
    essentialQualifications: 'Poikkeusehto E ja kanava Y ehdossa E ovat olennaisia tietoasioita tavallisen kanavan X lisäksi.',
    temporalScope: 'Ei erillistä nykyhetken rajausta tässä esimerkissä.',
    acceptableSourceVersionIds: ['A_src_collection']
  },
  sourceSnapshots: [
    { id: 'A_src_collection', label: 'Kokoelman ohjeistus', version: 'constructed-v1', note: 'Rakennettu lähdevedos; ei empiirinen ajo.' }
  ],
  passages: [
    { id: 'A_p_f1', sourceSnapshotId: 'A_src_collection', locator: 'F1', text: 'Tavallinen kanava X.' }
  ],
  savedContexts: [
    { id: 'A_ctx', label: 'Annettu konteksti (vain F1)', passageIds: ['A_p_f1'], note: 'F2 ja F3 puuttuvat kontekstista.' }
  ],
  displayConditions: [
    { id: 'A_display', label: 'Perusvastausnäyttö', citationVisible: true, passageLocatorVisible: false, note: 'Väitetuki ja näyttö ovat erillisiä tarkastuksia.' }
  ],
  answerVariants: [
    {
      id: 'A_ans',
      label: 'Vastaus vain tavallisella kanavalla',
      text: 'Yhteydenottokanava on X.',
      displayConditionId: 'A_display',
      claimAnnotationIds: ['A_claim_s'],
      note: 'Täysin tuettu ilmaistu väite voi liittyä epätäydelliseen tehtävävastaukseen.'
    }
  ],
  claimAnnotations: [
    {
      id: 'A_claim_s',
      label: 'Ainoa tarkistettava väite',
      statement: 'Yhteydenottokanava on X.',
      support: 'full',
      evidenceRefs: ['A_p_f1'],
      reason: 'Vastauksen ainoa tarkistettava väite on tuettu (S). Tämä ei takaa tehtävän kattavuutta.',
      answerVariantIds: ['A_ans'],
      displayConditionIds: ['A_display']
    }
  ],
  facets: [
    {
      id: 'A_f1',
      label: 'F1 · Tavallinen kanava X',
      essential: true,
      collection: 'full',
      context: 'full',
      answer: 'full',
      evidenceRefs: ['A_p_f1'],
      reason: 'Saatavilla kokoelmassa; mukana kontekstissa ja vastauksessa.'
    },
    {
      id: 'A_f2',
      label: 'F2 · Poikkeusehto E',
      essential: true,
      collection: 'full',
      context: 'absent',
      answer: 'absent',
      evidenceRefs: [],
      reason: 'Saatavilla kokoelmassa; puuttuu kontekstista ja vastauksesta. Ensimmäinen havaittu menetys on kokoelman ja kontekstin välissä; teknistä syytä ei päätellä.'
    },
    {
      id: 'A_f3',
      label: 'F3 · Kanava Y ehdossa E',
      essential: true,
      collection: 'full',
      context: 'absent',
      answer: 'absent',
      evidenceRefs: [],
      reason: 'Saatavilla kokoelmassa; puuttuu kontekstista ja vastauksesta.'
    }
  ],
  columns: ['Tietoasia', 'Kokoelma', 'Konteksti', 'Vastaus'],
  rows: [
    ['F1 · Tavallinen kanava X', 'Saatavilla', 'Mukana', 'Mukana'],
    ['F2 · Poikkeusehto E', 'Saatavilla', 'Puuttuu', 'Puuttuu'],
    ['F3 · Kanava Y ehdossa E', 'Saatavilla', 'Puuttuu', 'Puuttuu']
  ],
  interpretation: 'Kokoelman kattavuus 3/3; kontekstin ja vastauksen kattavuus 1/3. Vastauksen ainoa tarkistettava väite on tuettu (S). Ensimmäinen havaittu menetys on kokoelman ja kontekstin välissä.',
  boundary: 'Puuttumisen syytä ei päätellä: tarkista järjestetty hakulista ja kontekstin muodostaminen. Asiantuntija-arvioita ei ole kerätty.',
  basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Case A',
  propositionIds: [],
  criterionIds: [],
  decisionIds: []
});

const B = hydrateConstructedCase({
  id: 'B',
  kind: 'constructed',
  title: 'B · Sama näyttö, eri paikannettavuus',
  task: 'Tehtävänä on selvittää, lähetetäänkö ohjauspyynnöstä kuittaus. Sama väite ja sitä tukeva lähdekatkelma pidetään molemmissa näkymissä samoina.',
  taskReference: {
    statement: 'Tehtävänä on selvittää, lähetetäänkö ohjauspyynnöstä kuittaus. Sama väite ja sitä tukeva lähdekatkelma pidetään molemmissa näkymissä samoina.',
    essentialQualifications: 'Kuittauksen lähettäminen ohjauspyynnöstä.',
    temporalScope: 'Ei erillistä ajallista vaihtoehtoa tässä esimerkissä.',
    acceptableSourceVersionIds: ['B_src_doc']
  },
  sourceSnapshots: [
    { id: 'B_src_doc', label: 'Ohjausohje', version: 'constructed-v1', note: 'Sama lähdevedos molemmille näyttöehdoille.' }
  ],
  passages: [
    { id: 'B_p7', sourceSnapshotId: 'B_src_doc', locator: 'P7', text: 'Ohjauspyynnöstä lähetetään kuittaus.' }
  ],
  savedContexts: [
    { id: 'B_ctx', label: 'Sama annettu konteksti', passageIds: ['B_p7'], note: 'Näyttöehdot eivät muuta väitetukea.' }
  ],
  displayConditions: [
    {
      id: 'B_doc',
      label: 'Dokumenttiviite',
      citationVisible: true,
      passageLocatorVisible: false,
      note: 'Ei suoraa katkelmapaikaninta. Dokumenttiviitettä ei luokitella virheelliseksi, jos dokumentti sisältää tuen.'
    },
    {
      id: 'B_pass',
      label: 'Katkelmalinkki',
      citationVisible: true,
      passageLocatorVisible: true,
      note: 'P7 avautuu suoraan.'
    }
  ],
  answerVariants: [
    {
      id: 'B_ans_doc',
      label: 'Vastaus dokumenttiviitteellä',
      text: 'Ohjauspyynnöstä lähetetään kuittaus.',
      displayConditionId: 'B_doc',
      claimAnnotationIds: ['B_claim'],
      note: 'Sama väitetuki kuin katkelmalinkissä.'
    },
    {
      id: 'B_ans_pass',
      label: 'Vastaus katkelmalinkillä',
      text: 'Ohjauspyynnöstä lähetetään kuittaus.',
      displayConditionId: 'B_pass',
      claimAnnotationIds: ['B_claim'],
      note: 'Sama väitetuki kuin dokumenttiviitteessä.'
    }
  ],
  claimAnnotations: [
    {
      id: 'B_claim',
      label: 'Väitteen lähdetuki',
      statement: 'Ohjauspyynnöstä lähetetään kuittaus.',
      support: 'full',
      evidenceRefs: ['B_p7'],
      reason: 'Täysi tuki molemmissa näkymissä. Väitetuki ja näytön paikannettavuus eivät ole vaihdettavia vaiheita.',
      answerVariantIds: ['B_ans_doc', 'B_ans_pass'],
      displayConditionIds: ['B_doc', 'B_pass']
    }
  ],
  facets: [
    {
      id: 'B_f_support',
      label: 'Väitteen lähdetuki',
      essential: true,
      collection: 'full',
      context: 'full',
      answer: 'full',
      evidenceRefs: ['B_p7'],
      reason: 'Täysi tuki molemmissa näyttöehdoissa.'
    },
    {
      id: 'B_f_id',
      label: 'Lähteen tunniste ja versio',
      essential: true,
      collection: 'full',
      context: 'full',
      answer: 'full',
      evidenceRefs: ['B_src_doc'],
      reason: 'Näkyvissä molemmissa näkymissä.'
    },
    {
      id: 'B_f_pass',
      label: 'Tarkka lähdekatkelma',
      essential: false,
      collection: 'full',
      context: 'partial',
      answer: 'partial',
      evidenceRefs: ['B_p7'],
      reason: 'Dokumenttiviitteessä ei suoraa paikanninta; katkelmalinkissä P7 avautuu suoraan. Ero on näyttötarkkuudessa, ei väitetuessa.'
    }
  ],
  columns: ['Tarkastettava asia', 'Dokumenttiviite', 'Katkelmalinkki'],
  rows: [
    ['Väitteen lähdetuki', 'Täysi tuki', 'Täysi tuki'],
    ['Lähteen tunniste ja versio', 'Näkyvissä', 'Näkyvissä'],
    ['Tarkka lähdekatkelma', 'Ei suoraa paikanninta', 'P7 avautuu suoraan'],
    ['Koettu tarkistettavuus', 'Ei mitattu', 'Ei mitattu'],
    ['Tarkistamisen onnistuminen tai aika', 'Ei mitattu', 'Ei mitattu']
  ],
  interpretation: 'Ero koskee lähdenäytön tarkkuutta. Dokumenttiviitettä ei luokitella virheelliseksi, jos dokumentti sisältää tuen. P2 ehdottaa myöhempää koetun tarkistettavuuden vertailua.',
  boundary: 'Paikantimen puuttuminen ei osoita, ettei tarkistaminen voisi onnistua esimerkiksi dokumenttihaulla.',
  basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Case B',
  propositionIds: [],
  criterionIds: [],
  decisionIds: []
});

const C = hydrateConstructedCase({
  id: 'C',
  kind: 'constructed',
  title: 'C · Vanha lähde nykyhetken tehtävässä',
  task: 'Kysymys pyytää nykyistä yhteydenottokanavaa. D3-2024 nimeää kanavan X; sen korvaava D3-2026 nimeää kanavan Y. Kontekstissa on vain vanha versio.',
  taskReference: {
    statement: 'Kysymys pyytää nykyistä yhteydenottokanavaa. D3-2024 nimeää kanavan X; sen korvaava D3-2026 nimeää kanavan Y. Kontekstissa on vain vanha versio.',
    essentialQualifications: 'Nykyinen yhteydenottokanava tehtävän ajankohtana.',
    temporalScope: 'Nykyhetki; historiallinen väite ei riitä nykytehtävään ilman erillistä ajallista tukea.',
    acceptableSourceVersionIds: ['C_d3_2026']
  },
  sourceSnapshots: [
    { id: 'C_d3_2024', label: 'D3-2024', version: '2024', note: 'Vanha versio; korvattu. Historiallinen väite voi saada tukea tästä vedoksesta.' },
    { id: 'C_d3_2026', label: 'D3-2026', version: '2026', note: 'Nykytehtävään hyväksyttävä versio; nimeää kanavan Y.' }
  ],
  passages: [
    { id: 'C_p_old', sourceSnapshotId: 'C_d3_2024', locator: 'D3-2024', text: 'Kanava on X.' },
    { id: 'C_p_new', sourceSnapshotId: 'C_d3_2026', locator: 'D3-2026', text: 'Kanava on Y.' }
  ],
  savedContexts: [
    { id: 'C_ctx_old', label: 'Konteksti vain vanhalla versiolla', passageIds: ['C_p_old'], note: 'Nykyviite D3-2026 ei ole kontekstissa.' }
  ],
  displayConditions: [
    {
      id: 'C_disp',
      label: 'Vastausnäyttö',
      citationVisible: true,
      passageLocatorVisible: true,
      note: 'Erillinen lähdeauditointi kirjataan kontekstituesta erillään.'
    }
  ],
  answerVariants: [
    {
      id: 'C_a3a',
      label: 'Historiallinen väite A3a',
      text: 'Vuoden 2024 ohjeessa kanava on X.',
      displayConditionId: 'C_disp',
      claimAnnotationIds: ['C_claim_a3a'],
      note: 'Tuettu historiallisesti; nykytehtävän kattavuus puuttuu.'
    },
    {
      id: 'C_a3b',
      label: 'Nykyhetken väite A3b',
      text: 'Nykyinen kanava on X.',
      displayConditionId: 'C_disp',
      claimAnnotationIds: ['C_claim_a3b'],
      note: 'Nykyisyysväite vaatii erillisen ajallisen tuen ja nykyviiteauditoinnin.'
    }
  ],
  claimAnnotations: [
    {
      id: 'C_claim_a3a',
      label: 'Tuki vanhasta kontekstista (A3a)',
      statement: 'Vuoden 2024 ohjeessa kanava on X.',
      support: 'full',
      evidenceRefs: ['C_p_old'],
      reason: 'Historiallinen väite tuettu annetusta vanhasta kontekstista. Nykyinen kanava puuttuu tehtävän kannalta.',
      answerVariantIds: ['C_a3a'],
      displayConditionIds: ['C_disp']
    },
    {
      id: 'C_claim_a3b',
      label: 'Tuki vanhasta kontekstista (A3b)',
      statement: 'Nykyinen kanava on X.',
      support: 'absent',
      evidenceRefs: ['C_p_old'],
      reason: 'Nykyisyysväite ei saa tukea vanhasta kontekstista; epäselvä jos soveltuvuus ratkaisematta. Erillinen lähdeauditointi: vanha versio korvattu.',
      answerVariantIds: ['C_a3b'],
      displayConditionIds: ['C_disp']
    }
  ],
  facets: [
    {
      id: 'C_f_answer',
      label: 'Vastaus nykytehtävään',
      essential: true,
      collection: 'partial',
      context: 'absent',
      answer: 'conflicting',
      evidenceRefs: ['C_p_old', 'C_p_new'],
      reason: 'A3a: nykyinen kanava puuttuu. A3b: nykyinen kanava esitetään väärin suhteessa annettuun nykyviitteeseen.'
    },
    {
      id: 'C_f_support',
      label: 'Tuki annetusta vanhasta kontekstista',
      essential: true,
      collection: 'full',
      context: 'full',
      answer: 'partial',
      evidenceRefs: ['C_p_old'],
      reason: 'A3a tuettu; A3b ilman nykyisyystukea.'
    },
    {
      id: 'C_f_audit',
      label: 'Erillinen lähdeauditointi',
      essential: true,
      collection: 'full',
      context: 'unresolved',
      answer: 'unresolved',
      evidenceRefs: ['C_d3_2024', 'C_d3_2026'],
      reason: 'Vanha versio korvattu molemmissa varianteissa; kirjataan erikseen kontekstituesta.'
    }
  ],
  columns: ['Arvioinnin kohde', 'Historiallinen väite A3a', 'Nykyhetken väite A3b'],
  rows: [
    ['Vastaus', 'Vuoden 2024 ohjeessa kanava on X.', 'Nykyinen kanava on X.'],
    ['Tuki annetusta vanhasta kontekstista', 'Historiallinen väite tuettu', 'Nykyisyysväite ei saa tukea; epäselvä jos soveltuvuus ratkaisematta'],
    ['Nykyisen tehtävän kattavuus', 'Nykyinen kanava puuttuu', 'Nykyinen kanava esitetään väärin suhteessa annettuun nykyviitteeseen'],
    ['Erillinen lähdeauditointi', 'Vanha versio korvattu', 'Vanha versio korvattu']
  ],
  interpretation: 'Historiallinen väite voi olla tuettu ja tosiasiallisesti oikea mutta nykyhetken tehtävään riittämätön. Nykyisyysväite vaatii erillisen ajallisen tuen. Riippumattoman nykyviitteen ristiriita kirjataan erikseen kontekstituesta.',
  boundary: 'Älä käytä yleisluokitusta ”täysin lähteisiin ankkuroitu mutta väärä” tutkimatta väitteen sanamuotoa ja ajallista rajausta. Ei päätelmää kliinisestä turvallisuudesta.',
  basis: 'Year_1_RAG_Conceptual_Article_Brief (2).docx — Case C',
  propositionIds: [],
  criterionIds: [],
  decisionIds: []
});

const cases = [A, B, C];
data.cases = cases;
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(cases.map(item => ({ id: item.id, facets: item.facets.length, answers: item.answerVariants.length }))));
