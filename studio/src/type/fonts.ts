// P7 font loader (ADR-003 T-A faces from public/fonts, all OFL; hashes frozen in harness/state/freeze.json).
// Call loadFonts() once at module scope of a composition module; rendering is blocked until every face is ready.
import {continueRender, delayRender, staticFile} from 'remotion';
import {FONT} from '../tokens';

const FACES: [family: string, file: string, weight: string][] = [
  [FONT.arDisplay.family, 'Alexandria-VF.ttf', '100 900'],
  [FONT.label.family, 'IBMPlexSansArabic-Regular.ttf', '400'],
  [FONT.label.family, 'IBMPlexSansArabic-Medium.ttf', '500'],
  [FONT.label.family, 'IBMPlexSansArabic-SemiBold.ttf', '600'],
  [FONT.label.family, 'IBMPlexSansArabic-Bold.ttf', '700'],
  [FONT.lat.family, 'InterTight-VF.ttf', '100 900'],
  [FONT.mono.family, 'JetBrainsMono-VF.ttf', '100 800'],
];

let started = false;
let ready: Promise<void> | null = null;
export const loadFonts = (): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve();
  if (started && ready) return ready;
  started = true;
  const handle = delayRender('dc fonts');
  ready = Promise.all(
    FACES.map(([family, file, weight]) => new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight}).load().then((f) => void document.fonts.add(f))),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('DC_FONT_FAIL', String(e));
      continueRender(handle);
    });
  return ready;
};
export const fontsReady = (): Promise<void> => ready ?? Promise.resolve();
