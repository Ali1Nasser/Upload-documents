// AT-11 fixture constants (shared by the composition and the node driver; no React here).
/** Canon / look-dev strings with a tatweel join (arabic_r3 OCR set + CH-34 `6 الـAI` + caps acronyms with I). */
export const AT11_LABELS = ['الترتيب داخل الـpartition', 'قسم الـroadmap', 'قسم الـidempotency', '6 الـAI', 'الـAPI', 'الـKPI'] as const;
export const AT11_SIZES = [34, 32] as const;
export const AT11_START = 8; // every label starts its reveal on this frame (24 fps)
/** Output suffix of the current engine's AT-11 run: `_rv1` = ADR-011 Q2 RV1 (first visible step ON the anchor frame). The
 * reviewed RV2 set (no suffix) stays in reports/p7/at11/ for comparison; a new onset convention gets a new suffix. */
export const AT11_TAG = '_rv1';
