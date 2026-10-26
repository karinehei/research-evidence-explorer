import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = '/research-evidence-explorer/';

async function openApp(page: Page, hash = '') {
  await page.goto(`${root}${hash}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function focusStaysIn(dialog: Locator, page: Page) {
  for (let step = 0; step < 8; step += 1) await page.keyboard.press('Tab');
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  for (let step = 0; step < 8; step += 1) await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
}

async function openNamedDialog(page: Page, button: string | RegExp, title: string) {
  const opener = page.getByRole('button', { name: button }).first();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2, name: title })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sulje' }).first()).toBeFocused();
  return { opener, dialog };
}

test('opens the core views under a repository subpath and keeps the route on reload', async ({ page }) => {
  await openApp(page);
  await expect(page).toHaveURL(/\/research-evidence-explorer\/#graph\/sufficiency/);
  const asset = await page.evaluate(() => [...document.scripts].some(script => script.src.includes('/research-evidence-explorer/assets/')));
  expect(asset).toBe(true);

  const views: Array<[string, string]> = [
    ['Lähteistä kriteereihin', 'Lähteistä arviointikriteereihin'],
    ['Arviointimatriisi', 'Arviointimatriisi'],
    ['Rakennetut tapaukset', 'Tehtävästä näyttöön'],
    ['Oletukset ja kysymykset', 'Oletukset ja avoimet kysymykset'],
    ['Historia ja tilannekuvat', 'Muokkaushistoria ja tilannekuvat']
  ];
  for (const [nav, heading] of views) {
    await page.getByRole('button', { name: nav }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  await page.goto(`${root}#matrix`);
  await page.reload();
  await expect(page).toHaveURL(/\/research-evidence-explorer\/#matrix/);
  await expect(page.getByRole('heading', { level: 1, name: 'Arviointimatriisi' })).toBeVisible();
  await expect(page.locator('table caption').first()).toContainText('Kriteeriorientoitunut matriisi');
  await expect(page.locator('th[scope="row"]').first()).toBeVisible();
});

test('dialogs are named, trap focus, cancel on Escape and restore focus', async ({ page }) => {
  await openApp(page);
  const about = await openNamedDialog(page, 'Tietomallista ja käytöstä', 'Jäljitettävä tutkimustyötila');
  await focusStaysIn(about.dialog, page);
  await page.keyboard.press('Escape');
  await expect(about.dialog).toBeHidden();
  await expect(about.opener).toBeFocused();

  const exported = await openNamedDialog(page, 'Vie näkymä', 'Vie nykyinen työ');
  await page.keyboard.press('Escape');
  await expect(exported.dialog).toBeHidden();
  await expect(exported.opener).toBeFocused();

  const csl = await openNamedDialog(page, 'Tuo Zotero CSL', 'Tuo Zotero CSL-JSON');
  await expect(csl.dialog.getByRole('button', { name: 'Hyväksy tuonti' })).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(csl.dialog).toBeHidden();
  await expect(page.locator('#message')).not.toContainText('tuotiin esikatselun jälkeen');

  const snapshot = await openNamedDialog(page, 'Tilannekuva / tuo', 'Tilannekuvat ja tuonti');
  await page.keyboard.press('Escape');
  await expect(snapshot.dialog).toBeHidden();

  await page.getByRole('button', { name: 'Vie näkymä' }).click();
  await page.getByRole('button', { name: 'Toistettava kuvio' }).click();
  const figure = page.getByRole('dialog', { name: 'Toistettava kuvion vienti' });
  await expect(figure).toBeVisible();
  await expect(figure.getByRole('button', { name: 'Sulje' }).first()).toBeFocused();
  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  await page.keyboard.press('Escape');
  await expect(figure).toBeHidden();
  expect(downloads).toBe(0);

  await page.getByRole('button', { name: 'Poista kohde ja sen yhteydet' }).click();
  const removal = page.getByRole('dialog', { name: 'Poisto irrottaa viitteet' });
  await expect(removal).toBeVisible();
  await expect(removal.getByRole('button', { name: 'Sulje' }).first()).toBeFocused();
  await expect(removal.getByRole('button', { name: 'Poista ja irrota viitteet' })).not.toBeFocused();
  await page.keyboard.press('Enter');
  await expect(removal).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Näytön riittävyys' })).toBeVisible();
});

test('case edits save, discard or cancel, and a failed check keeps the draft', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Rakennetut tapaukset' }).click();
  await page.getByRole('button', { name: /A · Tuettu/ }).click();
  await page.getByRole('button', { name: 'Muokkaa tapausta' }).click();
  const task = page.getByRole('textbox', { name: 'Tehtävä', exact: true });
  await task.fill('LUONNOS-PERU');
  const blocked = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(blocked).toBe(true);

  await page.goBack();
  const dirty = page.getByRole('dialog', { name: 'Tallentamattomia muutoksia' });
  await expect(dirty).toBeVisible();
  await expect(dirty.getByRole('button', { name: 'Hylkää muutokset' })).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dirty).toBeHidden();
  await expect(task).toHaveValue('LUONNOS-PERU');
  await expect(page).toHaveURL(/#cases\/A/);

  await page.getByRole('button', { name: /B · Sama näyttö/ }).click();
  await expect(dirty).toBeVisible();
  await page.getByRole('button', { name: 'Peruuta' }).click();
  await expect(task).toHaveValue('LUONNOS-PERU');
  await expect(page).toHaveURL(/#cases\/A/);

  await page.getByRole('button', { name: /B · Sama näyttö/ }).click();
  await page.getByRole('button', { name: 'Hylkää muutokset' }).click();
  await expect(page.locator('.cases-view h2').filter({ hasText: 'B · Sama näyttö' })).toBeVisible();
  await expect(page.getByText('LUONNOS-PERU')).toHaveCount(0);

  await page.getByRole('button', { name: /A · Tuettu/ }).click();
  await page.getByRole('button', { name: 'Muokkaa tapausta' }).click();
  await page.getByRole('textbox', { name: 'Tehtävä', exact: true }).fill('LUONNOS-TALLENNA');
  await page.getByRole('button', { name: 'Arviointimatriisi' }).click();
  await page.getByRole('button', { name: 'Tallenna ja jatka' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Arviointimatriisi' })).toBeVisible();
  await expect(page.locator('#message')).toContainText('Rakennettu tapaus tallennettiin');
  await expect(page.locator('#message')).toContainText('rakennettuna analyyttisenä esimerkkinä');
  await page.getByRole('button', { name: 'Rakennetut tapaukset' }).click();
  await page.getByRole('button', { name: /A · Tuettu/ }).click();
  await expect(page.getByText('LUONNOS-TALLENNA')).toBeVisible();
  await expect(page.locator('.cases-view').getByText('Rakennettu analyyttinen esimerkki · Ei tutkimustulos')).toBeVisible();
  await expect(page.locator('.cases-view').getByText('constructed-analytical-example').first()).toBeVisible();

  await page.getByRole('button', { name: 'Muokkaa tapausta' }).click();
  await page.getByRole('textbox', { name: 'Tehtävä', exact: true }).fill('x'.repeat(8001));
  await page.getByRole('button', { name: 'Tallenna tapaus' }).click();
  await expect(page.locator('#message')).toContainText('virheellinen teksti');
  await expect(page.locator('#message')).not.toContainText('tallennettiin');
  await expect(page.getByRole('textbox', { name: 'Tehtävä', exact: true })).toHaveValue('x'.repeat(8001));
  await page.getByRole('button', { name: 'Arviointimatriisi' }).click();
  await page.getByRole('button', { name: 'Tallenna ja jatka' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tehtävästä näyttöön' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tehtävä', exact: true })).toHaveValue('x'.repeat(8001));
  await expect(page.locator('#message')).not.toContainText('Rakennettu tapaus tallennettiin');
});

test('inspector edits can be saved and undone', async ({ page }) => {
  await openApp(page);
  const notes = page.getByLabel('Oma pohdinta tai seuraava tarkistus');
  await notes.fill('undo-note');
  await page.getByRole('button', { name: 'Lähteistä kriteereihin' }).click();
  const dirty = page.getByRole('dialog', { name: 'Tallentamattomia muutoksia' });
  await expect(dirty).toBeVisible();
  await page.getByRole('button', { name: 'Peruuta' }).click();
  await expect(notes).toHaveValue('undo-note');
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await expect(page.locator('.save-state')).toHaveText('Tallennettu tähän selaimeen');
  await expect(page.locator('#message')).toContainText('Käsitteen tiedot tallennettiin');
  await page.getByRole('button', { name: 'Kumoa' }).click();
  await expect(notes).toHaveValue('');
  await expect(page.locator('#message')).toContainText('kumottiin');
});

test('snapshot export and import preserve the workspace when the file is invalid or cancelled', async ({ page }) => {
  await openApp(page);
  const notes = page.getByLabel('Oma pohdinta tai seuraava tarkistus');
  await notes.fill('toinen');
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await page.getByRole('button', { name: 'Tilannekuva / tuo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tilannekuvat ja tuonti' });
  await dialog.getByLabel('Tuo tilannekuva / työtila').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{', 'utf8')
  });
  await expect(dialog).toContainText('säilyi');
  await page.keyboard.press('Escape');
  await expect(notes).toHaveValue('toinen');

  await notes.fill('smoke-note');
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await page.getByRole('button', { name: 'Tilannekuva / tuo' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Vie tilannekuva JSON' }).click();
  const download = await downloadPromise;
  const saved = path.join(os.tmpdir(), `research-snapshot-${Date.now()}.json`);
  await download.saveAs(saved);
  const snapshot = JSON.parse(fs.readFileSync(saved, 'utf8'));
  expect(snapshot.schemaVersion).toBe(2);
  expect(snapshot.contentHash).toMatch(/^sha256:/);
  expect(snapshot.workspace.constructs.find((item: { id: string }) => item.id === 'sufficiency').notes).toBe('smoke-note');

  await page.keyboard.press('Escape');
  await notes.fill('toinen');
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await page.getByRole('button', { name: 'Tilannekuva / tuo' }).click();
  await page.getByLabel('Tuo tilannekuva / työtila').setInputFiles(saved);
  await expect(page.getByRole('button', { name: 'Hyväksy korvaava tuonti' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hyväksy korvaava tuonti' })).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(notes).toHaveValue('toinen');
  await expect(page.locator('#message')).not.toContainText('Tilannekuva tuotiin');

  await page.getByRole('button', { name: 'Tilannekuva / tuo' }).click();
  await page.getByLabel('Tuo tilannekuva / työtila').setInputFiles(saved);
  await page.getByRole('button', { name: 'Hyväksy korvaava tuonti' }).click();
  await page.goto(`${root}#graph/sufficiency`);
  await expect(page.getByLabel('Oma pohdinta tai seuraava tarkistus')).toHaveValue('smoke-note');
});

test('SVG download completes and contains a labelled figure', async ({ page }) => {
  await openApp(page, '#graph/sufficiency');
  await page.getByRole('button', { name: 'Vie näkymä' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pikainen graafi-SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
  const saved = path.join(os.tmpdir(), `research-map-${Date.now()}.svg`);
  await download.saveAs(saved);
  const svg = fs.readFileSync(saved, 'utf8');
  expect(svg.length).toBeGreaterThan(500);
  expect(svg).toMatch(/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  expect(svg).toMatch(/<\/svg>\s*$/);
  expect(svg).not.toMatch(/<foreignObject\b/i);
  expect(svg).toMatch(/Näytön riittävyys/);
  expect(svg).toMatch(/Selite/);
});

test('graph keyboard moves a selected node and full labels are not hover-only', async ({ page }) => {
  await openApp(page, '#graph/sufficiency');
  await expect(page.locator('.keyboard-help')).toContainText('nuolet siirtävät valittua kohdetta');
  await expect(page.locator('.keyboard-help')).toContainText('ei poista kohdetta');
  const node = page.locator('.react-flow__node').filter({ hasText: 'Näytön riittävyys' }).first();
  await expect(node).toHaveAttribute('aria-label', /Näytön riittävyys/);
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Näytön riittävyys' })).toBeVisible();
  const flowX = () => node.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41);
  const before = await flowX();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(flowX).toBeGreaterThan(before + 1);
  await expect.poll(flowX).toBeGreaterThan(before + 1);
  await page.keyboard.press('Backspace');
  await expect(node).toBeVisible();
  const summary = page.locator('summary').filter({ hasText: 'Näkyvät kohteet tekstinä' });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Näytön riittävyys/ }).last()).toBeVisible();
});

test('filter changes are announced without repeating on selection', async ({ page }) => {
  await openApp(page, '#matrix');
  const live = page.locator('#matrix-filter-status');
  await expect(live).toContainText('kriteerinäkymä');
  const before = await live.textContent();
  await page.locator('.matrix-toolbar').getByLabel('Tutkimusjuonne (käsite)').selectOption({ label: 'Näytön riittävyys' });
  await expect(live).not.toHaveText(before || '');
  const filtered = await live.textContent();
  await page.locator('.matrix-view th[scope="row"] button').first().click();
  await expect(live).toHaveText(filtered || '');

  await page.goto(`${root}#graph/sufficiency`);
  const graphLive = page.locator('#graph-filter-status');
  await page.getByLabel('Näyttöä koskeva tila').selectOption('hypothesis');
  await expect(graphLive).toContainText('Kartan suodatus:');
  const graphText = await graphLive.textContent();
  await page.locator('.react-flow__node').first().click();
  await expect(graphLive).toHaveText(graphText || '');
});

test('narrow and wide layouts do not overflow the page, and dialogs stay on screen', async ({ page }) => {
  await openApp(page, '#matrix');
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: 'Lähteistä kriteereihin' }).click();
    await page.getByRole('button', { name: 'Arviointimatriisi' }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    const action = await page.getByRole('button', { name: 'Vie JSON' }).boundingBox();
    expect(action).toBeTruthy();
    expect(action!.x).toBeGreaterThanOrEqual(0);
    expect(action!.x + action!.width).toBeLessThanOrEqual(width + 1);
    await expect(page.locator('.table-wrap').first()).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'Tietomallista ja käytöstä' }).click();
  const dialog = page.getByRole('dialog', { name: 'Jäljitettävä tutkimustyötila' });
  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  expect(box!.y + box!.height).toBeLessThanOrEqual(641);
  await expect(dialog.getByRole('button', { name: 'Sulje' }).first()).toBeVisible();
});

test('reduced motion and forced colors keep controls visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await openApp(page);
  const sample = page.getByRole('button', { name: 'Vie JSON' });
  const style = await sample.evaluate(element => {
    const computed = getComputedStyle(element);
    return { transition: computed.transitionDuration, border: computed.borderTopWidth, adjust: computed.forcedColorAdjust };
  });
  const transitionMs = style.transition.split(',').reduce((max, part) => {
    const value = part.trim();
    const amount = value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
    return Math.max(max, amount);
  }, 0);
  expect(transitionMs).toBeLessThan(1);
  expect(style.adjust).toBe('none');
  expect(parseFloat(style.border)).toBeGreaterThan(0);
  await expect(sample).toBeVisible();
  await expect(page.locator('.record-card').first()).toBeVisible();
});

test('a storage failure leaves the edit in memory and does not claim it was saved', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (String(key) === 'research-evidence-explorer-v1') throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await openApp(page);
  const notes = page.getByLabel('Oma pohdinta tai seuraava tarkistus');
  await notes.fill('muisti-testi');
  await page.getByRole('button', { name: 'Tallenna muutokset' }).click();
  await expect(page.locator('#message')).toContainText('vain muistissa');
  await expect(page.locator('#message')).toContainText('Paikallinen tallennus ei onnistunut');
  await expect(page.locator('#message')).not.toContainText('tallennettiin');
  await expect(page.locator('.save-state')).toHaveText('Muutokset vain muistissa');
  await expect(notes).toHaveValue('muisti-testi');
  expect(await page.evaluate(() => localStorage.getItem('research-evidence-explorer-v1'))).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Oma pohdinta tai seuraava tarkistus')).toHaveValue('');
});
