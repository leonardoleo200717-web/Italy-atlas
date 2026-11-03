/** Stringhe UI (predisposte per i18n, RNF-06: i nomi storici restano nei dati). */
import type { Certainty } from '../lib/schema';

export const CERTAINTY_LABEL: Record<Certainty, string> = {
  high: 'certezza alta',
  medium: 'certezza media · confine approssimato',
  low: 'certezza bassa · approssimato',
  disputed: 'controverso',
};

export const KIND_LABEL: Record<string, string> = {
  state: 'stato',
  empire: 'impero',
  kingdom: 'regno',
  duchy: 'ducato',
  republic: 'repubblica',
  commune: 'comune',
  signoria: 'signoria',
  fief: 'feudo',
  province: 'provincia',
  colony: 'colonia',
  people: 'popolo (area di insediamento prevalente)',
  league: 'lega / unione',
  composite: 'insieme composito',
  other: 'altro',
};

export const RELATION_LABEL: Record<string, string> = {
  vassal_of: 'vassallo di',
  imperial_vicariate: 'vicariato imperiale di',
  imperial_fief: 'feudo imperiale di',
  papal_fief: 'feudo papale di',
  province_of: 'parte costitutiva di',
  viceroyalty_of: 'viceregno di',
  personal_union: 'in unione personale con',
  protectorate: 'protettorato di',
  tributary: 'tributario di',
  client_state: 'stato cliente di',
  ally_foederatus: 'alleato/foederatus di',
  condominium: 'condominio con',
  military_occupation: 'occupato militarmente da',
  claim: 'rivendicato da',
  nominal_overlordship: 'sotto sovranità nominale di',
};

export const MODE_LABEL = { de_facto: 'de facto', de_jure: 'de jure' } as const;
