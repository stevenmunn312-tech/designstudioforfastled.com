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
};

export const starterPatterns: Pattern[] = [
  {
    id: "aurora-ribbon",
    title: "Aurora Ribbon",
    description: "Slow-moving polar light with a soft cyan edge and violet core.",
    author: "Mira Chen",
    tags: ["Ambient", "Noise"],
    colors: ["#61e4ff", "#876bff", "#ff78b7"],
    likes: 284,
    downloads: 1204,
    createdAt: "2026-07-22",
  },
  {
    id: "ember-trail",
    title: "Ember Trail",
    description: "A low, warm pulse that blooms into sparks when movement accelerates.",
    author: "Jo Calder",
    tags: ["Reactive", "Warm"],
    colors: ["#ff7048", "#ffb454", "#fff0b5"],
    likes: 192,
    downloads: 847,
    createdAt: "2026-07-18",
  },
  {
    id: "tidal-clock",
    title: "Tidal Clock",
    description: "Overlapping blue waves show the passing hour without a screen.",
    author: "Elliot Park",
    tags: ["Utility", "Ocean"],
    colors: ["#2667ff", "#61e4ff", "#d8fcff"],
    likes: 161,
    downloads: 633,
    createdAt: "2026-07-14",
  },
  {
    id: "orchid-rain",
    title: "Orchid Rain",
    description: "Fine violet droplets break across a dark matrix and fade to cobalt.",
    author: "Nadia Singh",
    tags: ["Matrix", "Generative"],
    colors: ["#c879ff", "#876bff", "#3b5bdb"],
    likes: 338,
    downloads: 1440,
    createdAt: "2026-07-09",
  },
  {
    id: "sunrise-sequence",
    title: "Sunrise Sequence",
    description: "A gentle bedside fade calibrated for warm-white RGBW strips.",
    author: "Theo Brooks",
    tags: ["Home", "RGBW"],
    colors: ["#ff8b5e", "#ffcf70", "#fff3d1"],
    likes: 125,
    downloads: 581,
    createdAt: "2026-06-30",
  },
  {
    id: "signal-garden",
    title: "Signal Garden",
    description: "Audio peaks grow into saturated stems across a 16×16 panel.",
    author: "Ari Okafor",
    tags: ["Audio", "Matrix"],
    colors: ["#5cffb0", "#61e4ff", "#ff78b7"],
    likes: 276,
    downloads: 1098,
    createdAt: "2026-06-24",
  },
];
