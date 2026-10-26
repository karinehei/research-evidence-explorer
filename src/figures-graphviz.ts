import { spawnSync } from 'node:child_process';
import { DEFAULT_GRAPHVIZ_ENGINE } from './figures.ts';

const HINT =
  'Asenna Graphviz ja varmista, että `dot` on PATH-muuttujassa (Windows: `dot -V`). Tätä skriptiä ei muuteta PATH- tai tietoturva-asetuksia automaattisesti. DOT-tiedosto on silti kelvollinen ilman Graphvizia.';

export function detectGraphviz(): { available: boolean; version: string | null; hint: string } {
  try {
    const probe = spawnSync('dot', ['-V'], { encoding: 'utf8' });
    if (probe.error) return { available: false, version: null, hint: HINT };
    const version = `${probe.stdout || ''}${probe.stderr || ''}`.trim() || 'dot (version unknown)';
    return { available: probe.status === 0, version: probe.status === 0 ? version : null, hint: HINT };
  } catch {
    return { available: false, version: null, hint: HINT };
  }
}

export function renderDotWithGraphviz(
  dotSource: string,
  outputPath: string,
  format: 'svg' | 'pdf' | 'png',
  engine = DEFAULT_GRAPHVIZ_ENGINE
): { ok: boolean; claimedRendered: boolean; error: string; version: string | null } {
  const detected = detectGraphviz();
  if (!detected.available) {
    return {
      ok: false,
      claimedRendered: false,
      error: `Graphviz (${engine}) ei ole käytettävissä. PDF/SVG-renderöintiä ei väitetä tehdyksi. ${detected.hint}`,
      version: null
    };
  }
  const rendered = spawnSync(engine, [`-T${format}`, '-o', outputPath], { input: dotSource, encoding: 'utf8' });
  if (rendered.error || rendered.status !== 0) {
    return {
      ok: false,
      claimedRendered: false,
      error: rendered.stderr || rendered.error?.message || 'Graphviz-renderöinti epäonnistui.',
      version: detected.version
    };
  }
  return { ok: true, claimedRendered: true, error: '', version: detected.version };
}
