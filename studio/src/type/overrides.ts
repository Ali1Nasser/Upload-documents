// Display-text overrides (arabic-typographer r1). Canon and transcripts are never edited: the spec layer swaps the
// DISPLAY text of one word id or one canon label, and the override is logged here with its reason and status.
export type Override = {text: string; why: string; status: 'active' | 'pending-council'};

/** Keyed by word id (w:S1:…) or canon path (CH-34:labels_ar:0). */
export const DISPLAY_OVERRIDES: Readonly<Record<string, Override>> = Object.freeze({
  'w:S1:ar-natural:005968': {text: 'الـroadmap', why: "verbatim 'roadmap' after قسم; F4/F6 cards say 'قسم الـroadmap': one article form everywhere", status: 'active'},
  'CH-34:labels_ar:0': {
    text: '5 ثواني مقابل 57',
    why: "canon label carries MSA tanween 'ثوانٍ'; S1 narration says 'ثواني' (glossary line 762 also has the tanween; canon not edited)",
    status: 'pending-council', // egyptian-arabic Council lens must confirm before P8
  },
});

export const displayText = (key: string, verbatim: string): string => DISPLAY_OVERRIDES[key]?.text ?? verbatim;
