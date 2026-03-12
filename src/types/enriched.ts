import type { Personen } from './app';

export type EnrichedPersonen = Personen & {
  kategorieName: string;
};
