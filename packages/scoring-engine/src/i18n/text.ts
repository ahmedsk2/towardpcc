/**
 * Minimal localizable text: English now, addressable by key for the future
 * Arabic layer (PRD §12) with zero runtime i18n dependency.
 */
export interface LocalizedText {
  readonly key: string;
  readonly en: string;
}

export function defineText(key: string, en: string): LocalizedText {
  return { key, en };
}
