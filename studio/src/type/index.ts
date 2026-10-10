// P7 typography engine entry. Frozen rules: ./arabic.ts and ./overrides.ts (hash-locked). New P7 modules beside them.
export * from './arabic';
export {displayText, DISPLAY_OVERRIDES} from './overrides';
export * from './words';
export * from './safe';
export * from './reveal';
export * from './qa';
export {loadFonts, fontsReady} from './fonts';
export {MixedText, KText, LabelRow, useAutoFit, LAT_SCALE} from './Text';
export type {KTextProps, MixedTextProps, LabelRowProps, FitOpts} from './Text';
