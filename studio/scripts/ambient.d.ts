// Ambient types for the P7 driver (pixelmatch 5 ships no .d.ts).
declare module 'pixelmatch' {
  export default function pixelmatch(a: Uint8Array, b: Uint8Array, out: Uint8Array | null, w: number, h: number, o?: {threshold?: number; includeAA?: boolean}): number;
}
