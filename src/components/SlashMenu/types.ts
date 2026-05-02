export interface SlashItem {
  /** Stable id for keys / analytics */
  id: string;
  /** Display label (Korean or English) */
  label: string;
  /** Optional secondary description shown beneath the label */
  description?: string;
  /** Optional emoji or short tag rendered as the leading icon */
  icon?: string;
  /** Extra keywords to match (e.g., latin synonyms for korean-only labels) */
  keywords?: string[];
  /**
   * Either a literal string to insert, or a function that returns the string
   * to insert at runtime (e.g., today's date).
   */
  insert: string | (() => string);
  /**
   * If true, after insertion the selection will be placed where `|` appears
   * in the inserted text (the `|` itself is removed). Default: place caret
   * after the inserted text.
   */
  cursorMarker?: boolean;
}

export interface SlashGroup {
  id: string;
  label: string;
  items: SlashItem[];
}
