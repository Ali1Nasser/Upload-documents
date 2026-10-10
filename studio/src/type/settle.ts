// Frame settle tracker (P7 review M8). Post-layout QA (title-safe, whole-word guards) must read the FINAL layout of a frame:
// after the fonts are loaded and after every useAutoFit has measured and shrunk its copy. useAutoFit registers each pending fit
// here (fitBegin when it takes its delayRender handle, fitEnd when it releases it). SpecPlayer / QaSelftest hold their own
// delayRender per frame and run the checks in `whenSettled()`, then continueRender.
import {continueRender, delayRender} from 'remotion';
import {fontsReady} from './fonts';

let pending = 0;
const waiters = new Set<() => void>();

export const fitBegin = (): void => {
  pending++;
};
export const fitEnd = (): void => {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    const ws = [...waiters];
    waiters.clear();
    ws.forEach((f) => f());
  }
};
export const fitsPending = (): number => pending;

/** Resolves once the fonts are ready and no auto-fit is pending (the DOM then holds the settled layout of this frame). */
export const whenSettled = (): Promise<void> =>
  fontsReady()
    .then(() => (typeof document === 'undefined' ? undefined : document.fonts.ready))
    .then(() => (pending === 0 ? undefined : new Promise<void>((res) => void waiters.add(res))))
    // one more macrotask: a fit released inside a layout effect may still schedule a re-render of a sibling in the same commit
    .then(() => new Promise<void>((res) => setTimeout(res, 0)))
    .then(() => (pending === 0 ? undefined : whenSettled()));

/**
 * Run `check` once per frame on the settled layout, holding the frame (delayRender) until it has run. Call from a layout effect
 * keyed on the frame; the returned cleanup releases the handle if the frame changes first (the check is then skipped).
 */
export const checkWhenSettled = (label: string, check: () => void): (() => void) => {
  if (typeof document === 'undefined') return () => undefined;
  const h = delayRender(`dc qa settle ${label}`);
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      continueRender(h);
    }
  };
  whenSettled().then(() => {
    if (done) return;
    try {
      check();
    } finally {
      finish();
    }
  });
  return finish;
};
