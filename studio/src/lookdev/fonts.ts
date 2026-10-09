import {continueRender, delayRender, staticFile} from 'remotion';

// Look-dev candidate faces (all OFL, see public/fonts/FONTS.md). Variable fonts get a weight range.
const FACES: [family: string, file: string, weight: string][] = [
  ['LD-Alexandria', 'Alexandria-VF.ttf', '100 900'],
  ['LD-Readex', 'ReadexPro-VF.ttf', '160 700'],
  ['LD-PlexArabic', 'IBMPlexSansArabic-Regular.ttf', '400'],
  ['LD-PlexArabic', 'IBMPlexSansArabic-Medium.ttf', '500'],
  ['LD-PlexArabic', 'IBMPlexSansArabic-SemiBold.ttf', '600'],
  ['LD-PlexArabic', 'IBMPlexSansArabic-Bold.ttf', '700'],
  ['LD-InterTight', 'InterTight-VF.ttf', '100 900'],
  ['LD-SpaceGrotesk', 'SpaceGrotesk-VF.ttf', '300 700'],
  ['LD-JBMono', 'JetBrainsMono-VF.ttf', '100 800'],
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
