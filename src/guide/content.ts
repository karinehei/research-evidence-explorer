export type GuideLocale = 'fi' | 'en';
export type GuideSection = { id: string; title: string; blocks: GuideBlock[] };
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'step'; n: number; goal: string; action: string; result: string }
  | { type: 'note'; text: string };
export type GuideDoc = { title: string; intro: string; tocLabel: string; sections: GuideSection[] };

const en: GuideDoc = {
  title: 'How to use',
  intro: 'This guide is for researchers using the curated example to develop and inspect an evidence model. Work is saved in this browser. Finnish and English change the interface display; canonical research text remains Finnish, and an English view may show an original-language fallback notice.',
  tocLabel: 'Contents',
  sections: [
    {
      id: 'quickstart',
      title: 'Quick start: inspect evidence sufficiency',
      blocks: [
        { type: 'p', text: 'Use the curated example to follow one construct from the matrix into its recorded definitions, claims, procedure and inference limits.' },
        { type: 'step', n: 1, goal: 'Choose the display language.', action: 'Under Language, select Suomi or English.', result: 'Interface labels change. Research text may remain in Finnish with an original-language or missing-translation notice.' },
        { type: 'step', n: 2, goal: 'Open the criteria linked to Evidence sufficiency.', action: 'Select Appraisal matrix, then choose Evidence sufficiency under Research strand (construct). You can also open #matrix/sufficiency directly.', result: 'A Construct context: Evidence sufficiency banner appears above the filtered matrix.' },
        { type: 'step', n: 3, goal: 'Read the scope before interpreting rows.', action: 'Read the Construct context banner and the filter value.', result: 'Only criteria recorded against this construct are shown. Counts are recorded links, not quality, coverage or validation.' },
        { type: 'step', n: 4, goal: 'Open a criterion’s full recorded content.', action: 'Select Show details on a compact row.', result: 'The control becomes expanded and the row reveals its detail sections.' },
        { type: 'step', n: 5, goal: 'Separate foundations, claims, procedure and limits.', action: 'Inspect Definitions and conceptual basis; Source claims and justification links; Operational procedure; and Inference limits and validation needs.', result: 'The criterion’s basis, recorded support chain, proposed operation and permitted inference remain visibly separate.' },
        { type: 'step', n: 6, goal: 'Follow the recorded chain.', action: 'Inside the details, select a linked claim or construct, or use Inspect link (…). Then select Edit record if you need the full editor.', result: 'The selection updates while the construct context filter remains. The matrix does not keep a permanent inspector open; the link itself does not establish correctness or causality.' },
        { type: 'step', n: 7, goal: 'Distinguish literature from the study’s adaptation.', action: 'Read the epistemic tags and legend: Reported, not verified; Own adaptation; and Untested proposition.', result: 'Reported literature, researcher-defined operationalisation and untested proposals are not treated as the same kind of evidence.' },
        { type: 'step', n: 8, goal: 'Return without losing your workspace context.', action: 'Close the details, keep the construct filter, or select Show all criteria to clear only that filter. Compact/Full changes density; Edit record opens the selected record separately.', result: 'Closing details does not clear the workspace. Show all criteria removes the construct context and returns to all criteria.' },
      ],
    },
    {
      id: 'graph',
      title: 'A. Trace sources, constructs and criteria',
      blocks: [
        { type: 'ol', items: ['Open From sources to criteria.', 'Select a node to inspect its full text and direct links in the inspector.', 'Use Show chains for the selection for a focused view, or Show full map for the recorded map.', 'Open Trace a justification path, choose Start and End, then select Show path.'] },
        { type: 'note', text: 'Search and Evidence status can hide records. A path follows recorded directed links; it does not confirm a valid argument. Graph links are explanatory or proposed relationships, not causal effects.' },
      ],
    },
    {
      id: 'matrix',
      title: 'B. Appraise through the matrix',
      blocks: [
        { type: 'p', text: 'Appraisal matrix opens in Compact criterion view. Expand rows with Show details, use Research strand (construct), and open More filters for epistemic or appraisal state. Full shows the wide table.' },
        { type: 'ul', items: ['Criterion view organises criteria and their recorded chains.', 'Source view organises sources by recorded research role; roles are not rankings.', 'Argument view inspects a selected research decision and does not invent results.', 'Edit record opens a modal editor for the selected record.', 'Export matrix selection JSON and Export records CSV export the current data projection.'] },
      ],
    },
    {
      id: 'literature',
      title: 'C. Record literature and claims',
      blocks: [
        { type: 'ol', items: ['On the graph, select Add record and choose a source or another research record type.', 'For a source, record bibliographic identity, publication/version information, reported reading status and researcher notes.', 'Add each source claim manually. Record the claim, method or context, locator, limitations, provenance, methodological appraisal and notes.', 'Keep reported reading status separate from appraisal: reading status describes what planning documents reported, not source quality.'] },
        { type: 'note', text: 'A bibliographic record is not a full-text appraisal. Claims are not extracted automatically, and a claim marked as checked from the original source is set only by the researcher.' },
      ],
    },
    {
      id: 'csl',
      title: 'D. Import Zotero CSL-JSON',
      blocks: [
        { type: 'ol', items: ['Select Import Zotero CSL.', 'Choose a CSL-JSON file of at most 2 MB.', 'Review preview match tags such as DOI match, Identifier match or Possible duplicate (title/year).', 'For each item, choose Create new source, Skip or Link to existing.', 'Select Accept import to apply the preview, or Cancel/Close to leave the workspace unchanged.'] },
        { type: 'note', text: 'The import creates or links bibliographic sources and keeps attachment metadata. It does not invent claims, methods, reading status or appraisals.' },
      ],
    },
    {
      id: 'model',
      title: 'E. Develop the conceptual model',
      blocks: [
        { type: 'ul', items: ['For a construct, record its definition, object, unit, scope, competing definitions and selected boundary.', 'For a criterion, connect Construct references and record evidence requirement, assessor, unit, decision rule, permitted inference and Validation still to specify.', 'For a relationship, choose Link meaning explicitly and record Rationale and application boundary, evidence references and epistemic status.', 'A new link stays proposed until reviewed; an arrow does not mean causation.'] },
      ],
    },
    {
      id: 'cases',
      title: 'F. Use constructed cases A–C',
      blocks: [
        { type: 'ul', items: ['A · Supported claim, missing exception shows that a supported claim can coexist with missing essential task information.', 'B · Same evidence, different locatability keeps claim and evidence constant while the displayed locator differs; verification success and time are not measured.', 'C · Older source for a present-time task separates historical support from adequacy for a current task.'] },
        { type: 'p', text: 'Select Edit case to change the case fields and Save case to store them. The Constructed analytical example · Not a research result tag remains after editing and in export.' },
      ],
    },
    {
      id: 'propositions',
      title: 'G. Inspect propositions and protocols',
      blocks: [
        { type: 'p', text: 'Assumptions and questions keeps propositions, provisional assessment protocols and research decisions separate from reported findings.' },
        { type: 'ul', items: ['The five dimensions are Perceived trustworthiness, Usefulness, Source transparency, Source sufficiency (expert-rated), and Perceived verifiability.', 'Claim support, correctness, displayed citation, source currency and successful verification remain separate audits.', 'Protocol exports contain no invented observations or composite score. Draft anchors can be revised only with a recorded rationale.'] },
      ],
    },
    {
      id: 'saving',
      title: 'H. Save, undo and move work',
      blocks: [
        { type: 'ul', items: ['Saved in this browser means localStorage for this browser and site origin; it is not a server copy.', 'Export JSON creates a portable workspace. Snapshot / import exports or previews a versioned snapshot with hashes and history.', 'Undo restores a recent change in the open session and records the reversal in history. History and snapshots shows the local decision log.', 'When leaving a dirty form, Save and continue validates and saves, Discard changes leaves without saving, and Cancel keeps the draft and location.'] },
      ],
    },
    {
      id: 'exporting',
      title: 'I. Export data and figures',
      blocks: [
        { type: 'ul', items: ['The matrix provides JSON for its current selection and CSV for records.', 'Export view offers Workspace JSON, Snapshot (hashes), Reproducible figure, quick graph SVG, Graphviz DOT, records CSV and browser print.', 'Browser-layout SVG uses saved browser positions. Graphviz DOT is a text graph description; rendering SVG or PDF through Graphviz requires a local dot command. The browser does not render a Graphviz PDF.'] },
      ],
    },
    {
      id: 'interpretation',
      title: 'Interpretation boundaries',
      blocks: [
        { type: 'ul', items: ['A recorded connection does not establish causality.', 'A missing matrix entry means not recorded; it does not establish a research gap.', 'CSL metadata is not a full-text appraisal.', 'Claim support is not the same as correctness or evidence sufficiency.', 'Perceived verifiability is not observed verification success.', 'Cases A–C are constructed analytical examples, not research results.', 'A language switch changes display only; it does not translate or alter canonical research data.', 'An original-language fallback notice means no current English overlay is available, so the Finnish canonical text is shown.'] },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery and common problems',
      blocks: [
        { type: 'ul', items: ['Records missing from a view: clear Search, Evidence status, matrix filters or select Show all criteria.', 'No linked evidence: this means no link is recorded here, not that no evidence exists.', 'English translation unavailable: read the original-language fallback and switch to Suomi when needed.', 'Unsaved changes: use Save and continue, Discard changes or Cancel; a failed validation keeps the draft open.', 'Import rejected: correct the file, size, schema or references; the current workspace is preserved.', 'Browser storage fails: the change remains in memory for this session; use Export JSON before reload or close.', 'Graphviz missing: export DOT or browser-layout SVG; install a local dot command before CLI PDF rendering.', 'Moving to another computer: use Export JSON or export a snapshot, then import that file in the other browser.'] },
      ],
    },
  ],
};

const fi: GuideDoc = {
  title: 'Käyttöohje',
  intro: 'Ohje on tutkijalle, joka kehittää ja tarkastelee näyttömallia kuratoidun esimerkin avulla. Työ tallentuu tähän selaimeen. Suomi ja English vaihtavat käyttöliittymän esityskieltä; kanoninen tutkimusteksti säilyy suomenkielisenä, ja englanninkielisessä näkymässä voidaan näyttää alkuperäiskielen varailmoitus.',
  tocLabel: 'Sisällys',
  sections: [
    {
      id: 'quickstart',
      title: 'Pika-aloitus: tarkastele näytön riittävyyttä',
      blocks: [
        { type: 'p', text: 'Seuraa kuratoidussa esimerkissä yhtä käsitettä matriisista kirjattuihin määritelmiin, väitteisiin, menettelyyn ja päättelyn rajoihin.' },
        { type: 'step', n: 1, goal: 'Valitse esityskieli.', action: 'Valitse kohdasta Kieli painike Suomi tai English.', result: 'Käyttöliittymän tekstit vaihtuvat. Tutkimusteksti voi jäädä suomeksi, jolloin näet alkuperäiskieltä tai puuttuvaa käännöstä koskevan ilmoituksen.' },
        { type: 'step', n: 2, goal: 'Avaa Näytön riittävyyteen liittyvät kriteerit.', action: 'Valitse Arviointimatriisi ja sen jälkeen Tutkimusjuonne (käsite) -valikosta Näytön riittävyys. Voit myös avata suoraan #matrix/sufficiency.', result: 'Suodatetun matriisin yläpuolelle tulee Käsitekonteksti: Näytön riittävyys -banneri.' },
        { type: 'step', n: 3, goal: 'Lue rajaus ennen rivien tulkintaa.', action: 'Lue Käsitekonteksti-banneri ja suodattimen arvo.', result: 'Näet vain tähän käsitteeseen kirjatut kriteerit. Lukumäärät ovat kirjattuja linkkejä, eivät laatua, kattavuutta tai validointia.' },
        { type: 'step', n: 4, goal: 'Avaa kriteerin koko kirjattu sisältö.', action: 'Valitse tiiviiltä riviltä Näytä tiedot.', result: 'Painike merkitään laajennetuksi ja rivin tieto-osiot tulevat näkyviin.' },
        { type: 'step', n: 5, goal: 'Erota perusta, väitteet, menettely ja rajat.', action: 'Tarkastele osioita Määritelmät ja käsitteellinen perusta; Lähdeväitteet ja perustelukytkennät; Operatiivinen menettely; sekä Päättelyn rajat ja validointitarpeet.', result: 'Kriteerin perusta, kirjattu tukiketju, ehdotettu menettely ja sallittu päättely pysyvät erillään.' },
        { type: 'step', n: 6, goal: 'Seuraa kirjattua ketjua.', action: 'Valitse tietojen sisältä linkitetty väite tai käsite tai käytä painiketta Tarkastele yhteyttä (…). Avaa tarvittaessa koko editori painikkeella Muokkaa tietuetta.', result: 'Valinta päivittyy, mutta käsitekontekstin suodatin säilyy. Matriisissa ei ole pysyvää tarkastinta auki; linkki ei itsessään osoita oikeellisuutta tai kausaliteettia.' },
        { type: 'step', n: 7, goal: 'Erota kirjallisuus tutkimuskohtaisesta sovelluksesta.', action: 'Lue tiedollisen tilan tunnisteet ja selite: Raportoitu, ei varmennettu; Oma sovellus; ja Testaamaton oletus.', result: 'Raportoitua kirjallisuutta, tutkijan operationalisointia ja testaamattomia ehdotuksia ei käsitellä samanlaisena näyttönä.' },
        { type: 'step', n: 8, goal: 'Palaa menettämättä työtilan kontekstia.', action: 'Sulje tiedot, pidä käsitesuodatin tai valitse Näytä kaikki kriteerit, joka tyhjentää vain tämän suodattimen. Tiivis/Täysi vaihtaa tiheyttä; Muokkaa tietuetta avaa valitun tietueen erikseen.', result: 'Tietojen sulkeminen ei tyhjennä työtilaa. Näytä kaikki kriteerit poistaa käsitekontekstin ja palauttaa kaikki kriteerit.' },
      ],
    },
    {
      id: 'graph',
      title: 'A. Jäljitä lähteitä, käsitteitä ja kriteerejä',
      blocks: [
        { type: 'ol', items: ['Avaa Lähteistä kriteereihin.', 'Valitse solmu ja tarkastele sen koko tekstiä sekä suoria yhteyksiä tarkastimessa.', 'Rajaa näkymä painikkeella Näytä valitun kohteen ketjut tai avaa kirjattu kartta painikkeella Näytä koko kartta.', 'Avaa Jäljitä perusteluketju, valitse Lähtökohta ja Päätepiste ja paina Näytä ketju.'] },
        { type: 'note', text: 'Haku ja Näyttöä koskeva tila voivat piilottaa tietueita. Ketju seuraa kirjattuja suunnattuja yhteyksiä; se ei vahvista perustelun pätevyyttä. Graafin yhteydet ovat selittäviä tai ehdotettuja suhteita, eivät kausaalivaikutuksia.' },
      ],
    },
    {
      id: 'matrix',
      title: 'B. Arvioi matriisin avulla',
      blocks: [
        { type: 'p', text: 'Arviointimatriisi avautuu Tiivis-kriteerinäkymään. Laajenna rivejä painikkeella Näytä tiedot, käytä Tutkimusjuonne (käsite) -suodatinta ja avaa Lisäsuodattimet tiedollisen tai arviointitilan rajaamiseen. Täysi näyttää leveän taulukon.' },
        { type: 'ul', items: ['Kriteerinäkymä järjestää kriteerit ja niiden kirjatut ketjut.', 'Lähdenäkymä järjestää lähteet kirjatun tutkimusroolin mukaan; roolit eivät ole ranking.', 'Perustelunäkymä tarkastelee valittua tutkimuspäätöstä eikä keksi tuloksia.', 'Muokkaa tietuetta avaa valitun tietueen modaaliseen editoriin.', 'Vie matriisivalinta JSON ja Vie kohteet CSV vievät nykyisen tietoprojektion.'] },
      ],
    },
    {
      id: 'literature',
      title: 'C. Kirjaa kirjallisuus ja väitteet',
      blocks: [
        { type: 'ol', items: ['Valitse graafissa Lisää kohde ja valitse lähde tai muu tutkimuskohteen tyyppi.', 'Kirjaa lähteelle bibliografinen identiteetti, julkaisu- ja versiotiedot, raportoitu lukemistieto sekä tutkijan muistiinpanot.', 'Lisää jokainen lähdeväite käsin. Kirjaa väite, menetelmä tai konteksti, lähdekohta, rajaukset, alkuperä, menetelmällinen arviointi ja muistiinpanot.', 'Pidä raportoitu lukemistieto erillään arvioinnista: se kuvaa suunnitteluasiakirjoissa raportoitua lukemista, ei lähteen laatua.'] },
        { type: 'note', text: 'Bibliografinen tietue ei ole kokotekstiarvio. Väitteitä ei poimita automaattisesti, ja alkuperäislähteestä tarkastetuksi merkitsemisen tekee vain tutkija.' },
      ],
    },
    {
      id: 'csl',
      title: 'D. Tuo Zotero CSL-JSON',
      blocks: [
        { type: 'ol', items: ['Valitse Tuo Zotero CSL.', 'Valitse enintään 2 Mt:n CSL-JSON-tiedosto.', 'Tarkista esikatselun osumatunnisteet, kuten DOI-osumaa, Tunnisteosuma tai Mahdollinen kaksoiskappale (otsikko/vuosi).', 'Valitse kullekin tietueelle Luo uusi lähde, Ohita tai Linkitä olemassa olevaan.', 'Käytä Hyväksy tuonti -painiketta tai poistu painikkeella Peruuta/Sulje, jolloin työtila ei muutu.'] },
        { type: 'note', text: 'Tuonti luo tai linkittää bibliografisia lähteitä ja säilyttää liitteet metatietona. Se ei keksi väitteitä, menetelmiä, lukemistilaa tai arviointeja.' },
      ],
    },
    {
      id: 'model',
      title: 'E. Kehitä käsitteellistä mallia',
      blocks: [
        { type: 'ul', items: ['Kirjaa käsitteelle määritelmä, määritelmän kohde, yksikkö, ala, kilpailevat määritelmät ja valittu rajaus.', 'Liitä kriteeriin Käsiteviitteet ja kirjaa näyttövaatimus, arvioija, yksikkö, päätössääntö, sallittu päättely ja Täsmennettävä validointi.', 'Valitse yhteydelle Yhteyden merkitys erikseen ja kirjaa Perustelu ja soveltamisen rajaus, näyttöviitteet sekä tiedollinen tila.', 'Uusi yhteys pysyy ehdotuksena, kunnes se arvioidaan; nuoli ei tarkoita kausaliteettia.'] },
      ],
    },
    {
      id: 'cases',
      title: 'F. Käytä rakennettuja tapauksia A–C',
      blocks: [
        { type: 'ul', items: ['A · Tuettu väite, puuttuva poikkeus näyttää, että tuettu väite voi esiintyä samalla kun olennaista tehtävätietoa puuttuu.', 'B · Sama näyttö, eri paikannettavuus pitää väitteen ja näytön samoina mutta muuttaa näytettyä paikanninta; tarkistamisen onnistumista tai aikaa ei ole mitattu.', 'C · Vanha lähde nykyhetken tehtävässä erottaa historiallisen tuen riittävyydestä nykyiseen tehtävään.'] },
        { type: 'p', text: 'Valitse Muokkaa tapausta, muuta kenttiä ja tallenna painikkeella Tallenna tapaus. Tunniste Rakennettu analyyttinen esimerkki · Ei tutkimustulos säilyy muokkauksen jälkeen ja viennissä.' },
      ],
    },
    {
      id: 'propositions',
      title: 'G. Tarkastele propositioita ja protokollia',
      blocks: [
        { type: 'p', text: 'Oletukset ja kysymykset pitää propositiot, alustavat arviointiprotokollat ja tutkimuspäätökset erillään raportoiduista havainnoista.' },
        { type: 'ul', items: ['Viisi ulottuvuutta ovat Koettu luotettavuus, Hyödyllisyys, Lähteiden läpinäkyvyys, Lähteiden riittävyys ja Koettu tarkistettavuus.', 'Väitetuki, oikeellisuus, näytetty viite, lähteen ajantasaisuus ja onnistunut tarkistaminen ovat erillisiä auditointeja.', 'Protokollavienti ei sisällä keksittyjä havaintoja tai yhdistelmäpistettä. Luonnosankkureita voi muuttaa vain kirjatulla perustelulla.'] },
      ],
    },
    {
      id: 'saving',
      title: 'H. Tallenna, kumoa ja siirrä työ',
      blocks: [
        { type: 'ul', items: ['Tallennettu tähän selaimeen tarkoittaa tämän selaimen ja sivuston localStorage-tallennusta, ei palvelinkopiota.', 'Vie JSON luo siirrettävän työtilan. Tilannekuva / tuo vie tai esikatselee versioidun tilannekuvan tiivisteineen ja historioineen.', 'Kumoa palauttaa viimeaikaisen muutoksen avoimessa istunnossa ja kirjaa peruutuksen historiaan. Historia ja tilannekuvat näyttää paikallisen päätöslokin.', 'Kun poistut muuttuneesta lomakkeesta, Tallenna ja jatka validoi ja tallentaa, Hylkää muutokset poistuu tallentamatta ja Peruuta säilyttää luonnoksen sekä sijainnin.'] },
      ],
    },
    {
      id: 'exporting',
      title: 'I. Vie tietoja ja kuvioita',
      blocks: [
        { type: 'ul', items: ['Matriisi tarjoaa nykyisen valinnan JSON-viennin ja tietueiden CSV-viennin.', 'Vie näkymä tarjoaa työtila-JSON:n, tilannekuvan tiivisteineen, toistettavan kuvion, pikaisen graafi-SVG:n, Graphviz DOT:n, tietueiden CSV:n ja selaintulostuksen.', 'Selainasettelun SVG käyttää tallennettuja selainasemia. Graphviz DOT on tekstimuotoinen graafikuvaus; Graphviz-SVG:n tai PDF:n renderöinti vaatii paikallisen dot-komennon. Selain ei renderöi Graphviz-PDF:ää.'] },
      ],
    },
    {
      id: 'interpretation',
      title: 'Tulkinnan rajat',
      blocks: [
        { type: 'ul', items: ['Kirjattu yhteys ei osoita kausaliteettia.', 'Puuttuva matriisimerkintä tarkoittaa, ettei asiaa ole kirjattu; se ei osoita tutkimusaukkoa.', 'CSL-metatieto ei ole kokotekstiarvio.', 'Väitetuki ei ole sama asia kuin oikeellisuus tai näytön riittävyys.', 'Koettu tarkistettavuus ei ole havaittu tarkistamisen onnistuminen.', 'Tapaukset A–C ovat rakennettuja analyyttisiä esimerkkejä, eivät tutkimustuloksia.', 'Kielen vaihto muuttaa vain esitystä; se ei käännä tai muuta kanonista tutkimusaineistoa.', 'Alkuperäiskielen varailmoitus tarkoittaa, ettei ajantasaista englanninkielistä peittotekstiä ole, joten kanoninen suomenkielinen teksti näytetään.'] },
      ],
    },
    {
      id: 'recovery',
      title: 'Palautuminen ja tavalliset ongelmat',
      blocks: [
        { type: 'ul', items: ['Tietueita puuttuu näkymästä: tyhjennä Hae kohdetta, Näyttöä koskeva tila tai matriisin suodattimet tai valitse Näytä kaikki kriteerit.', 'Linkitettyä näyttöä ei ole: työtilaan ei ole kirjattu linkkiä; tämä ei tarkoita, ettei näyttöä ole olemassa.', 'Englanninkielistä käännöstä ei ole: lue alkuperäiskielen varailmoitus ja vaihda tarvittaessa Suomi-näkymään.', 'Tallentamattomat muutokset: käytä Tallenna ja jatka, Hylkää muutokset tai Peruuta; epäonnistunut validointi säilyttää luonnoksen.', 'Tuonti hylätään: korjaa tiedosto, koko, skeema tai viitteet; nykyinen työtila säilyy.', 'Selaintallennus epäonnistuu: muutos säilyy muistissa tämän istunnon ajan; käytä Vie JSON ennen sivun lataamista uudelleen tai sulkemista.', 'Graphviz puuttuu: vie DOT tai selainasettelun SVG; asenna paikallinen dot ennen CLI-PDF-renderöintiä.', 'Siirto toiselle tietokoneelle: käytä Vie JSON -toimintoa tai vie tilannekuva ja tuo tiedosto toisen selaimen työtilaan.'] },
      ],
    },
  ],
};

export function guideFor(locale: GuideLocale): GuideDoc {
  return locale === 'en' ? en : fi;
}
