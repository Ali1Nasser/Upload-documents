import {continueRender, delayRender, staticFile} from 'remotion';
import {FONT} from '../tokens';

// ADR-003 T-A faces (all OFL, see public/fonts/FONTS.md). Variable fonts get a weight range.
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
export const loadLookdevFonts = (): void => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('lookdev fonts');
  Promise.all(
    FACES.map(([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight});
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('lookdev font load failed', e);
      continueRender(handle);
    });
};
