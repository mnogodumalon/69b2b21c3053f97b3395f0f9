// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategoriename?: string;
    beschreibung?: string;
  };
}

export interface Personen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ist_aktiv?: boolean;
    status?: LookupValue;
    profilbild?: string;
    standort?: GeoLocation; // { lat, long, info }
    mitarbeiter_nummer?: number;
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    kategorie?: string;
  };
}

export const APP_IDS = {
  KATEGORIEN: '69b2b205010fa763ed3868da',
  PERSONEN: '69b2b20d0f2d44b284d757fc',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  personen: {
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "gesperrt", label: "Gesperrt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kategorien': {
    'kategoriename': 'string/text',
    'beschreibung': 'string/textarea',
  },
  'personen': {
    'ist_aktiv': 'bool',
    'status': 'lookup/select',
    'profilbild': 'file',
    'standort': 'geo',
    'mitarbeiter_nummer': 'number',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'kategorie': 'applookup/choice',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKategorien = StripLookup<Kategorien['fields']>;
export type CreatePersonen = StripLookup<Personen['fields']>;