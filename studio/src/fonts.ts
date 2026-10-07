import {continueRender, delayRender, staticFile} from 'remotion';

/** Load a font from public/fonts and block rendering until it is ready. Call once at module scope of a composition. */
export const loadFont = (family: string, file: string, weight: string | number = 400): void => {
  const handle = delayRender(`font ${family} ${weight}`);
  const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight: String(weight)});
  face
    .load()
    .then(() => {
      document.fonts.add(face);
      continueRender(handle);
    })
    .catch((e) => {
      console.error('font load failed', family, file, e);
      continueRender(handle);
    });
};

export const loadPlexAR = (): void => {
  loadFont('PlexAR', 'PlexAR-400.ttf', 400);
  loadFont('PlexAR', 'PlexAR-500.ttf', 500);
  loadFont('PlexAR', 'PlexAR-600.ttf', 600);
  loadFont('PlexAR', 'PlexAR-700.ttf', 700);
  loadFont('PlexMonoAR', 'Mono-500.ttf', 500);
};
