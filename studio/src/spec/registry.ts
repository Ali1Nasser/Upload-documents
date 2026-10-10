// Family registry (P7.3). Family authors add ONE file per family and never edit a shared file:
//   studio/src/components/families/<family>.ts   default export FamilyModule {family, components: DcComponent[]}
//   studio/src/demos/<family>.tsx                default export DemoModule   {family, demos: DemoDef[]}
// Both folders are discovered at bundle time with require.context (webpack / rspack, used by the Remotion bundler).
import {CATALOG} from '../components/catalog';
import type {DcComponent, DemoDef, DemoModule, FamilyModule} from './types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Require {
      context(dir: string, deep?: boolean, re?: RegExp): {keys(): string[]; (id: string): {default?: unknown}};
    }
  }
}

const COMPONENTS = new Map<string, DcComponent>();
const DEMOS = new Map<string, DemoDef>();
const PROBLEMS: string[] = [];

const famCtx = require.context('../components/families', false, /^\.\/[a-z0-9-]+\.tsx?$/);
for (const k of famCtx.keys()) {
  const m = famCtx(k).default as FamilyModule | undefined;
  if (!m?.components) {
    PROBLEMS.push(`${k}: no default FamilyModule export`);
    continue;
  }
  for (const c of m.components) {
    if (!CATALOG[c.name]) PROBLEMS.push(`${k}: ${c.name} is not in the frozen catalog`);
    else if (COMPONENTS.has(c.name)) PROBLEMS.push(`${k}: ${c.name} registered twice`);
    else COMPONENTS.set(c.name, c);
  }
}
const demoCtx = require.context('../demos', false, /^\.\/[a-z0-9-]+\.tsx?$/);
for (const k of demoCtx.keys()) {
  const m = demoCtx(k).default as DemoModule | undefined;
  if (!m?.demos) {
    PROBLEMS.push(`${k}: no default DemoModule export`);
    continue;
  }
  for (const d of m.demos) {
    if (!CATALOG[d.name]) PROBLEMS.push(`${k}: demo ${d.name} is not a catalog component`);
    else DEMOS.set(d.name, d);
  }
}
if (PROBLEMS.length && typeof console !== 'undefined') console.error(`DC_REGISTRY ${JSON.stringify(PROBLEMS)}`);

export const getComponent = (name: string): DcComponent | undefined => COMPONENTS.get(name);
export const isImplemented = (name: string): boolean => COMPONENTS.has(name);
export const slotOf = (name: string) => COMPONENTS.get(name)?.slot;
export const getDemo = (name: string): DemoDef | undefined => DEMOS.get(name);
export const demoNames = (): string[] => [...DEMOS.keys()].sort();
export const implementedNames = (): string[] => [...COMPONENTS.keys()].sort();
export const registryProblems = (): string[] => [...PROBLEMS];
