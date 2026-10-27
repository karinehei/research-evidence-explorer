# Research Evidence Explorer — Käyttöohje

Ohje on tutkijalle, joka kehittää ja tarkastelee näyttömallia kuratoidun esimerkin avulla. Työ tallentuu tähän selaimeen. `Suomi` ja `English` vaihtavat käyttöliittymän esityskieltä; kanoninen tutkimusteksti säilyy suomenkielisenä, ja englanninkielisessä näkymässä voidaan näyttää alkuperäiskielen varailmoitus.

## Sisällys

- [Pika-aloitus](#quickstart)
- [A. Jäljitä lähteitä, käsitteitä ja kriteerejä](#graph)
- [B. Arvioi matriisin avulla](#matrix)
- [C. Kirjaa kirjallisuus ja väitteet](#literature)
- [D. Tuo Zotero CSL-JSON](#csl)
- [E. Kehitä käsitteellistä mallia](#model)
- [F. Käytä rakennettuja tapauksia A–C](#cases)
- [G. Tarkastele propositioita ja protokollia](#propositions)
- [H. Tallenna, kumoa ja siirrä työ](#saving)
- [I. Vie tietoja ja kuvioita](#exporting)
- [Tulkinnan rajat](#interpretation)
- [Palautuminen ja tavalliset ongelmat](#recovery)

<a id="quickstart"></a>
## Pika-aloitus: tarkastele näytön riittävyyttä

Seuraa kuratoidussa esimerkissä yhtä käsitettä matriisista kirjattuihin määritelmiin, väitteisiin, menettelyyn ja päättelyn rajoihin.

1. **Tavoite — Valitse esityskieli.** **Toiminta:** Valitse kohdasta `Kieli` painike `Suomi` tai `English`. **Mitä näet:** Käyttöliittymän tekstit vaihtuvat. Tutkimusteksti voi jäädä suomeksi, jolloin näet alkuperäiskieltä tai puuttuvaa käännöstä koskevan ilmoituksen.
2. **Tavoite — Avaa Näytön riittävyyteen liittyvät kriteerit.** **Toiminta:** Valitse `Arviointimatriisi` ja sen jälkeen `Tutkimusjuonne (käsite)` -valikosta `Näytön riittävyys`. Voit myös avata suoraan `#matrix/sufficiency`. **Mitä näet:** `Käsitekonteksti: Näytön riittävyys` -bannerin suodatetun matriisin yläpuolella.
3. **Tavoite — Lue rajaus ennen rivien tulkintaa.** **Toiminta:** Lue `Käsitekonteksti`-banneri ja suodattimen arvo. **Mitä näet:** Vain tähän käsitteeseen kirjatut kriteerit. Lukumäärät ovat kirjattuja linkkejä, eivät laatua, kattavuutta tai validointia.
4. **Tavoite — Avaa kriteerin koko kirjattu sisältö.** **Toiminta:** Valitse tiiviiltä riviltä `Näytä tiedot`. **Mitä näet:** Painike merkitään laajennetuksi ja tieto-osiot tulevat näkyviin.
5. **Tavoite — Erota perusta, väitteet, menettely ja rajat.** **Toiminta:** Tarkastele osioita `Määritelmät ja käsitteellinen perusta`, `Lähdeväitteet ja perustelukytkennät`, `Operatiivinen menettely` sekä `Päättelyn rajat ja validointitarpeet`. **Mitä näet:** Perusta, kirjattu tukiketju, ehdotettu menettely ja sallittu päättely pysyvät erillään.
6. **Tavoite — Seuraa kirjattua ketjua.** **Toiminta:** Valitse tietojen sisältä linkitetty väite tai käsite tai käytä painiketta `Tarkastele yhteyttä (…)`. Avaa tarvittaessa koko editori painikkeella `Muokkaa tietuetta`. **Mitä näet:** Valinta päivittyy, mutta käsitekontekstin suodatin säilyy. Matriisissa ei ole pysyvää tarkastinta auki; linkki ei itsessään osoita oikeellisuutta tai kausaliteettia.
7. **Tavoite — Erota kirjallisuus tutkimuskohtaisesta sovelluksesta.** **Toiminta:** Lue tunnisteet ja selite: `Raportoitu, ei varmennettu`, `Oma sovellus` ja `Testaamaton oletus`. **Mitä näet:** Raportoitu kirjallisuus, tutkijan operationalisointi ja testaamattomat ehdotukset pysyvät erillään.
8. **Tavoite — Palaa menettämättä työtilan kontekstia.** **Toiminta:** Sulje tiedot, pidä suodatin tai valitse `Näytä kaikki kriteerit`, joka tyhjentää vain tämän suodattimen. `Tiivis`/`Täysi` vaihtaa tiheyttä; `Muokkaa tietuetta` avaa valitun tietueen erikseen. **Mitä näet:** Tietojen sulkeminen säilyttää työtilan; `Näytä kaikki kriteerit` palauttaa kaikki kriteerit.

<a id="graph"></a>
## A. Jäljitä lähteitä, käsitteitä ja kriteerejä

1. Avaa `Lähteistä kriteereihin`.
2. Valitse solmu ja tarkastele sen koko tekstiä sekä suoria yhteyksiä tarkastimessa.
3. Rajaa painikkeella `Näytä valitun kohteen ketjut` tai avaa kirjattu kartta painikkeella `Näytä koko kartta`.
4. Avaa `Jäljitä perusteluketju`, valitse `Lähtökohta` ja `Päätepiste` ja paina `Näytä ketju`.

Haku ja `Näyttöä koskeva tila` voivat piilottaa tietueita. Ketju seuraa kirjattuja suunnattuja yhteyksiä; se ei vahvista perustelun pätevyyttä. Graafin yhteydet ovat selittäviä tai ehdotettuja suhteita, eivät kausaalivaikutuksia.

<a id="matrix"></a>
## B. Arvioi matriisin avulla

`Arviointimatriisi` avautuu `Tiivis`-kriteerinäkymään. Laajenna rivejä painikkeella `Näytä tiedot`, käytä `Tutkimusjuonne (käsite)` -suodatinta ja avaa `Lisäsuodattimet`. `Täysi` näyttää leveän taulukon.

- `Kriteerinäkymä` järjestää kriteerit ja niiden kirjatut ketjut.
- `Lähdenäkymä` järjestää lähteet kirjatun tutkimusroolin mukaan; roolit eivät ole ranking.
- `Perustelunäkymä` tarkastelee valittua tutkimuspäätöstä eikä keksi tuloksia.
- `Muokkaa tietuetta` avaa valitun tietueen modaaliseen editoriin.
- `Vie matriisivalinta JSON` ja `Vie kohteet CSV` vievät nykyisen projektion.

<a id="literature"></a>
## C. Kirjaa kirjallisuus ja väitteet

1. Valitse graafissa `Lisää kohde` ja valitse lähde tai muu tutkimuskohteen tyyppi.
2. Kirjaa lähteelle bibliografinen identiteetti, julkaisu- ja versiotiedot, raportoitu lukemistieto sekä tutkijan muistiinpanot.
3. Lisää jokainen lähdeväite käsin. Kirjaa väite, menetelmä tai konteksti, lähdekohta, rajaukset, alkuperä, menetelmällinen arviointi ja muistiinpanot.
4. Pidä raportoitu lukemistieto erillään arvioinnista: se kuvaa suunnitteluasiakirjoissa raportoitua lukemista, ei lähteen laatua.

Bibliografinen tietue ei ole kokotekstiarvio. Väitteitä ei poimita automaattisesti, ja alkuperäislähteestä tarkastetuksi merkitsemisen tekee vain tutkija.

<a id="csl"></a>
## D. Tuo Zotero CSL-JSON

1. Valitse `Tuo Zotero CSL`.
2. Valitse enintään 2 Mt:n CSL-JSON-tiedosto.
3. Tarkista tunnisteet, kuten `DOI-osumaa`, `Tunnisteosuma` tai `Mahdollinen kaksoiskappale (otsikko/vuosi)`.
4. Valitse `Luo uusi lähde`, `Ohita` tai `Linkitä olemassa olevaan`.
5. Valitse `Hyväksy tuonti` tai poistu painikkeella `Peruuta`/`Sulje`, jolloin työtila ei muutu.

Tuonti luo tai linkittää bibliografisia lähteitä ja säilyttää liitteet metatietona. Se ei keksi väitteitä, menetelmiä, lukemistilaa tai arviointeja.

<a id="model"></a>
## E. Kehitä käsitteellistä mallia

- Kirjaa käsitteelle määritelmä, määritelmän kohde, yksikkö, ala, kilpailevat määritelmät ja valittu rajaus.
- Liitä kriteeriin `Käsiteviitteet` ja kirjaa näyttövaatimus, arvioija, yksikkö, päätössääntö, sallittu päättely ja `Täsmennettävä validointi`.
- Valitse yhteydelle `Yhteyden merkitys` erikseen ja kirjaa `Perustelu ja soveltamisen rajaus`, näyttöviitteet sekä tiedollinen tila.
- Uusi yhteys pysyy ehdotuksena, kunnes se arvioidaan; nuoli ei tarkoita kausaliteettia.

<a id="cases"></a>
## F. Käytä rakennettuja tapauksia A–C

- `A · Tuettu väite, puuttuva poikkeus` näyttää, että tuettu väite voi esiintyä samalla kun olennaista tehtävätietoa puuttuu.
- `B · Sama näyttö, eri paikannettavuus` pitää väitteen ja näytön samoina mutta muuttaa näytettyä paikanninta; tarkistamisen onnistumista tai aikaa ei ole mitattu.
- `C · Vanha lähde nykyhetken tehtävässä` erottaa historiallisen tuen riittävyydestä nykyiseen tehtävään.

Valitse `Muokkaa tapausta`, muuta kenttiä ja tallenna painikkeella `Tallenna tapaus`. Tunniste `Rakennettu analyyttinen esimerkki · Ei tutkimustulos` säilyy muokkauksen jälkeen ja viennissä.

<a id="propositions"></a>
## G. Tarkastele propositioita ja protokollia

`Oletukset ja kysymykset` pitää propositiot, alustavat protokollat ja tutkimuspäätökset erillään raportoiduista havainnoista.

- Viisi ulottuvuutta: Koettu luotettavuus, Hyödyllisyys, Lähteiden läpinäkyvyys, Lähteiden riittävyys ja Koettu tarkistettavuus.
- Väitetuki, oikeellisuus, näytetty viite, lähteen ajantasaisuus ja onnistunut tarkistaminen pysyvät erillisinä auditointeina.
- Protokollavienti ei sisällä keksittyjä havaintoja tai yhdistelmäpistettä. Luonnosankkurin muutos vaatii kirjatun perustelun.

<a id="saving"></a>
## H. Tallenna, kumoa ja siirrä työ

- `Tallennettu tähän selaimeen` tarkoittaa tämän selaimen ja sivuston localStorage-tallennusta, ei palvelinkopiota.
- `Vie JSON` luo siirrettävän työtilan. `Tilannekuva / tuo` vie tai esikatselee version tiivisteineen ja historioineen.
- `Kumoa` palauttaa viimeaikaisen muutoksen avoimessa istunnossa ja kirjaa peruutuksen. `Historia ja tilannekuvat` näyttää paikallisen päätöslokin.
- Muuttuneessa lomakkeessa `Tallenna ja jatka` validoi ja tallentaa, `Hylkää muutokset` poistuu tallentamatta ja `Peruuta` säilyttää luonnoksen sekä sijainnin.

<a id="exporting"></a>
## I. Vie tietoja ja kuvioita

- Matriisi tarjoaa nykyisen valinnan JSON-viennin ja tietueiden CSV-viennin.
- `Vie näkymä` tarjoaa työtila-JSON:n, tilannekuvan, toistettavan kuvion, pikaisen graafi-SVG:n, Graphviz DOT:n, tietueiden CSV:n ja selaintulostuksen.
- Selainasettelun SVG käyttää tallennettuja selainasemia. Graphviz DOT on tekstimuotoinen kuvaus; Graphviz-SVG:n tai PDF:n renderöinti vaatii paikallisen `dot`-komennon. Selain ei renderöi Graphviz-PDF:ää.

<a id="interpretation"></a>
## Tulkinnan rajat

- Yhteys ≠ kausaliteetti.
- Puuttuva matriisimerkintä ≠ tutkimusaukko.
- CSL-metatieto ≠ kokotekstiarvio.
- Väitetuki ≠ oikeellisuus ≠ näytön riittävyys.
- Koettu tarkistettavuus ≠ havaittu tarkistamisen onnistuminen.
- Tapaukset A–C ovat rakennettuja analyyttisiä esimerkkejä.
- Kielen vaihto muuttaa vain esitystä, ei kanonista tutkimusaineistoa.
- Alkuperäiskielen varailmoitus tarkoittaa, ettei ajantasaista englanninkielistä peittotekstiä ole, joten suomenkielinen kanoninen teksti näytetään.

<a id="recovery"></a>
## Palautuminen ja tavalliset ongelmat

- **Tietueita piilossa:** tyhjennä haku, `Näyttöä koskeva tila` tai matriisin suodattimet tai valitse `Näytä kaikki kriteerit`.
- **Ei linkitettyä näyttöä:** linkkiä ei ole kirjattu tähän; tämä ei osoita, ettei näyttöä ole.
- **Englanninkielistä käännöstä ei ole:** lue varailmoitus ja vaihda tarvittaessa `Suomi`-näkymään.
- **Tallentamattomat muutokset:** käytä `Tallenna ja jatka`, `Hylkää muutokset` tai `Peruuta`; epäonnistunut validointi säilyttää luonnoksen.
- **Tuonti hylätään:** korjaa tiedosto, koko, skeema tai viitteet; nykyinen työtila säilyy.
- **Selaintallennus epäonnistuu:** muutos säilyy muistissa tämän istunnon ajan; käytä `Vie JSON` ennen uudelleenlatausta tai sulkemista.
- **Graphviz puuttuu:** vie DOT tai selainasettelun SVG; asenna paikallinen `dot` ennen CLI-PDF-renderöintiä.
- **Toinen tietokone:** käytä `Vie JSON` -toimintoa tai tilannekuvaa ja tuo tiedosto toisen selaimen työtilaan.
