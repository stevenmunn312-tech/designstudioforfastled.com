const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Database patterns have uuid ids; starter fixtures use slugs and have no
 *  row, stored file, or ratings behind them. */
export function isStoredPatternId(id: string): boolean {
  return uuidPattern.test(id);
}

/** The name a visitor should see and save: the stored object name without the
 *  upload uuid prefix that keeps storage paths unique. */
export function patternFileName(storagePath: string): string {
  const storedName = storagePath.split("/").pop() ?? "fastled-pattern.json";
  return storedName.replace(/^[0-9a-f-]{36}-/i, "");
}
