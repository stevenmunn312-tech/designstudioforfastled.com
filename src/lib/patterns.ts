export type Pattern = {
  id: string;
  title: string;
  description: string;
  author: string;
  controller: string;
  ledCount: number;
  tags: string[];
  colors: [string, string, string];
  likes: number;
  downloads: number;
  createdAt: string;
};

export const starterPatterns: Pattern[] = [
  {
    id: "aurora-ribbon",
    title: "Aurora Ribbon",
    description: "Slow-moving polar light with a soft cyan edge and violet core.",
    author: "Mira Chen",
    controller: "ESP32",
    ledCount: 144,
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
    controller: "RP2040",
    ledCount: 96,
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
    controller: "ESP8266",
    ledCount: 60,
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
    controller: "ESP32",
    ledCount: 256,
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
    controller: "Arduino",
    ledCount: 72,
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
    controller: "Teensy",
    ledCount: 256,
    tags: ["Audio", "Matrix"],
    colors: ["#5cffb0", "#61e4ff", "#ff78b7"],
    likes: 276,
    downloads: 1098,
    createdAt: "2026-06-24",
  },
];
