/** Canonical form of a pattern tag. Tags arrive spelled several ways (the
 *  upload form writes "Audio Reactive", seeded built-ins use "audio-reactive",
 *  moderators type whatever they like), so every comparison and every display
 *  goes through this one form. */
export function tagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

/** A pattern's tags in canonical form, with spelling variants collapsed. */
export function tagKeys(tags: string[]): string[] {
  return [...new Set(tags.map(tagKey).filter(Boolean))];
}
