import { figureBrowserSvg } from './figures.ts';
import type { Workspace } from './types.ts';

/** Quick browser-layout SVG for the current visible selection. Prefer buildFigureBundle for reproducible manuscript exports with manifest. */
export function graphSvg(model: Workspace, ids: Set<string>, selectedId = ''): string {
  return figureBrowserSvg(model, ids, {
    selectedId,
    title: 'Ehdotettu lähde–käsite–kriteeri-kartta (näkyvä valinta)',
    caption: 'Näkyvä suodatettu näkymä. Viivatyyppi, väri ja teksti ilmaisevat tiedollisen tilan. Ei kausaalipäätelmää; ei automaattista tieteellistä johtopäätöstä.'
  });
}
