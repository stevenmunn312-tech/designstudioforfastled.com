import catalog from "./built-in-patterns.json";

export type Pattern = {
  id: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  colors: [string, string, string];
  likes: number;
  downloads: number;
  createdAt: string;
  previewUrl?: string;
  /** A short looping capture of the pattern, for cheap gallery-card display
   *  without every visitor's browser running a live evaluator. Falls back to
   *  live evaluation via previewUrl when absent. */
  previewMediaUrl?: string;
  /** 0-100 Studio Score computed by the site's own evaluator (see
   *  src/lib/evaluator/patternRating.ts). Undefined until a moderator has
   *  run the scan for this pattern from /review. */
  studioScore?: number;
  /** Community star rating, undefined until the pattern has its first vote.
   *  Deliberately separate from studioScore: one is taste, the other is a
   *  measurement of the graph. See src/lib/pattern-ratings.ts. */
  rating?: PatternRating;
  /** Ships with the Design Studio app (see builtInPatterns): first-party, so
   *  its Formula/Code nodes run without a trust prompt, as in the app. */
  builtIn?: boolean;
};

/** Aggregate of the 1-5 star votes on a pattern. */
export type PatternRating = {
  /** Mean of every vote, to two decimal places. */
  average: number;
  votes: number;
};

/** Folder under public/ that scripts/app-sync/sync.mjs writes pattern files to. */
const BUILT_IN_FILES = "/pattern-files/built-in";

type BuiltInEntry = (typeof catalog)[number];

/** A built-in pattern's downloadable file. */
export function builtInPatternFile(entry: Pick<BuiltInEntry, "id" | "fileName">) {
  return { url: `${BUILT_IN_FILES}/${entry.id}.fastled-pattern.json`, fileName: entry.fileName };
}

/**
 * The app's built-in Pattern Library, in the app's own order, generated from
 * Design Studio for FastLED by scripts/app-sync/sync.mjs. These have slug ids
 * and no database row, so they carry no ratings or Studio Score.
 */
export const builtInPatterns: Pattern[] = catalog.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  author: "Design Studio for FastLED",
  tags: entry.tags,
  colors: entry.colors as [string, string, string],
  likes: 0,
  downloads: 0,
  createdAt: entry.createdAt,
  previewUrl: builtInPatternFile(entry).url,
  builtIn: true,
}));

const builtInById = new Map(catalog.map((entry) => [entry.id, entry]));

/** The built-in pattern with this id, with its download file. */
export function findBuiltInPattern(id: string): (Pattern & { download: { url: string; fileName: string } }) | null {
  const entry = builtInById.get(id);
  const pattern = builtInPatterns.find((candidate) => candidate.id === id);
  return entry && pattern ? { ...pattern, download: builtInPatternFile(entry) } : null;
}
