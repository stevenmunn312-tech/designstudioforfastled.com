/**
 * Videos on the Design Studio for FastLED YouTube channel: the one-minute
 * Quick Start, then the "Learn the Studio" series. Titles, summaries, "you'll
 * learn" lists and chapters are copied from each video's YouTube description;
 * keep them in step when a video changes. A new episode is one more entry in
 * `tutorials`, in series order.
 */

export const tutorialChannel = {
  url: "https://www.youtube.com/channel/UCGVYQ0C9hAv2ageuzHnpfcA",
};

export interface TutorialChapter {
  /** Offset into the video, as YouTube prints it: "m:ss". */
  at: string;
  label: string;
}

export interface TutorialVideo {
  /** YouTube video id. */
  videoId: string;
  title: string;
  tagline: string;
  summary: string;
  learn: readonly string[];
  chapters: readonly TutorialChapter[];
}

export interface Tutorial extends TutorialVideo {
  /** Episode number, as on the slate: "01". */
  number: string;
}

/** Full name of an episode, as YouTube titles it. */
export function tutorialName(tutorial: Tutorial): string {
  return `Learn the Studio ${tutorial.number} · ${tutorial.title}`;
}

export const quickStart: TutorialVideo = {
  videoId: "MXNQeCbO9zM",
  title: "Quick Start",
  tagline: "See the lights in action in under a minute.",
  summary: "Open Design Studio, load the Music Player example from the Start Gallery and press play. Double-click the lights for Stage mode, then check the Build Diagram to take it to real LEDs. Then a quick tour on the beat: Stage’s spectrum styles, the Transition Pool, Dwells & Bursts, the Pattern Library and the 3D preview.",
  learn: [
    "The Start Gallery",
    "The Music Player example",
    "Stage mode",
    "The Build Diagram",
    "Transitions, Dwells & Bursts and the Pattern Library",
  ],
  chapters: [
    { at: "0:00", label: "Open the Music Player example" },
    { at: "0:14", label: "Press play, then Stage" },
    { at: "0:33", label: "The Build Diagram" },
    { at: "0:43", label: "Feature tour" },
  ],
};

/** Chapter offset in whole seconds, for the player's `start` parameter. */
export function chapterSeconds(at: string): number {
  return at.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

export const tutorials: readonly Tutorial[] = [
  {
    number: "01",
    videoId: "Jw6y4KZ1kdc",
    title: "Welcome to the Studio",
    tagline: "From an idea on screen to light on your desk.",
    summary: "A first look at Design Studio for FastLED: what it makes, how a pattern travels from the graph to real LEDs, and the four tabs you will use in every project. No hardware needed to follow along.",
    learn: [
      "What the Studio is for",
      "How a pattern flows from graph to LEDs",
      "The four workspace tabs and their order",
      "What the rest of the series covers",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "What the Studio is" },
      { at: "0:46", label: "Four tabs" },
      { at: "1:13", label: "What you need" },
      { at: "1:32", label: "The road ahead" },
    ],
  },
  {
    number: "02",
    videoId: "YT2hGT1LuTo",
    title: "Your First Pattern",
    tagline: "Two nodes, one wire, and your LEDs are dancing.",
    summary: "Start with Juggle, read the graph from left to right, change its settings, and splice two effects into the wire. By the end you have a complete pattern and the shape every later project grows from.",
    learn: [
      "Start a project from Start with Juggle",
      "Read a graph from source to output",
      "Type a value and drag a slider",
      "Drop an effect onto a wire",
      "Tidy the canvas",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "Start with Juggle" },
      { at: "0:52", label: "Change a setting" },
      { at: "1:20", label: "Splice in effects" },
      { at: "2:05", label: "Tidy and admire" },
    ],
  },
  {
    number: "03",
    videoId: "v64zzRn4R2g",
    title: "Reading the Graph",
    tagline: "Colours, ports and wires: the language of the canvas.",
    summary: "Learn to read any graph at a glance: what a node’s colour means, which wires fit which ports, how to find nodes fast, and how the Checks drawer and Help keep you on track.",
    learn: [
      "Node anatomy and category colours",
      "What each kind of wire carries",
      "Search for nodes, and drag a wire to empty canvas to find ones that fit",
      "Expose input on a control",
      "Use node previews, Checks and Help",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "Nodes" },
      { at: "0:39", label: "Ports and wires" },
      { at: "1:06", label: "Find nodes fast" },
      { at: "1:41", label: "Expose an input" },
      { at: "1:58", label: "Helpers that watch over you" },
    ],
  },
  {
    number: "04",
    videoId: "h491GOIY9PA",
    title: "Colour and Palettes",
    tagline: "Give your lights a mood.",
    summary: "How an LED makes colour, why the Studio thinks in hue, saturation and brightness, and four ways to choose a palette: the built-in menu, Harmony Palette, Custom Palette and Palette from Image. Finish with colour that drifts on its own.",
    learn: [
      "RGB on the LED, HSV in your head",
      "What a palette is and how patterns use it",
      "Harmony, custom and image palettes",
      "Hue Cycle for slowly moving colour",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "How LEDs make colour" },
      { at: "0:34", label: "Palettes" },
      { at: "0:57", label: "Harmony Palette" },
      { at: "1:20", label: "Your own colours" },
      { at: "1:46", label: "Colour that moves" },
    ],
  },
  {
    number: "05",
    videoId: "KCgllVgMBXI",
    title: "Layering Effects",
    tagline: "Fold, smear, mix and mask.",
    summary: "Chain effects to turn a simple pattern into something rich. Build a kaleidoscope with Mirror and Trails, see why the order of effects matters, then combine two patterns with Blend and cut one to shape with a mask.",
    learn: [
      "Effects transform frames in a chain",
      "Mirror and Trails",
      "Why effect order changes the result",
      "Blend modes and opacity",
      "Masks for shaped layers",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "A chain of changes" },
      { at: "0:46", label: "Order matters" },
      { at: "1:06", label: "Blend two patterns" },
      { at: "1:31", label: "Masks" },
    ],
  },
  {
    number: "06",
    videoId: "GPp4QJ-APj8",
    title: "Bringing Patterns to Life",
    tagline: "Let numbers move your controls for you.",
    summary: "Signals are numbers that change over time. Use Wave and Noise LFO to animate any control, shape them with Min, Max, Map Range and Smooth, and drive several controls from one source so everything moves together.",
    learn: [
      "What a signal is",
      "Wave versus Noise LFO",
      "Expose an input and wire a signal into it",
      "Map Range and Smooth",
      "One signal, many destinations",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "What a signal is" },
      { at: "0:41", label: "Wire a signal" },
      { at: "0:59", label: "Shape the range" },
      { at: "1:25", label: "Smooth motion" },
      { at: "1:47", label: "One signal, many controls" },
    ],
  },
  {
    number: "07",
    videoId: "1jckN8PujNE",
    title: "Sound to Light",
    tagline: "Make your LEDs listen.",
    summary: "See how the Studio hears: the FFT Analyzer splits sound into bass, mids and treble, and Beat Detect catches every beat. Start from a Quick recipe, wire sound into your own pattern, tune it, then move the microphone onto the board.",
    learn: [
      "How FFT bands and beats work",
      "Quick recipes: Live spectrum and Beat colour jump",
      "Wire a band into any control",
      "Tune Gain and Smoothing",
      "Add an I2S microphone on the Hardware tab",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "How the Studio hears" },
      { at: "0:33", label: "A Quick recipe" },
      { at: "1:10", label: "Wire sound into your pattern" },
      { at: "1:40", label: "Tune it" },
      { at: "1:59", label: "Listening on the board" },
    ],
  },
  {
    number: "08",
    videoId: "5XtBs-oAc4k",
    title: "Your Hardware Workbench",
    tagline: "Tell the Studio exactly what is on your desk.",
    summary: "Set up the Hardware tab: choose the exact board, check its pinout, match your LEDs’ chipset, colour order, size and serpentine wiring, then let the pin picker steer you to safe pins.",
    learn: [
      "Navigate the workbench",
      "Choose a board family and the exact board",
      "Check an LED output’s chipset, colour order and size",
      "Serpentine wiring and the start corner",
      "Safe pin choices, and pins that follow a board change",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:14", label: "The bench" },
      { at: "0:38", label: "Choose the board" },
      { at: "1:15", label: "Your LEDs" },
      { at: "2:08", label: "Pins" },
      { at: "2:48", label: "Board settings" },
    ],
  },
  {
    number: "09",
    videoId: "pRcz0gv5X24",
    title: "Knobs, Buttons and Encoders",
    tagline: "Put your hands on the light.",
    summary: "Physical controls are parts on the bench and wires on the graph. Add a brightness knob, try the Dimmer and Blackout starter, step through patterns with an encoder, and bundle many controls with Player Controls.",
    learn: [
      "Controls are parts plus wires",
      "Drop onto a row to expose and connect",
      "Dimmer and Blackout, Browse a Slideshow",
      "Knob versus encoder",
      "Player Controls bundles",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "Controls are wires" },
      { at: "0:23", label: "A brightness knob" },
      { at: "0:59", label: "A blackout button" },
      { at: "1:26", label: "Encoders and slideshows" },
      { at: "1:59", label: "Many controls, one cable" },
    ],
  },
  {
    number: "10",
    videoId: "OCapv8nPt4I",
    title: "Power and the Build Diagram",
    tagline: "Wire it right the first time.",
    summary: "Work out how much current your LEDs need, set the board’s power cap, then follow the Build Diagram from pin to pixel: data through a level shifter, power through fuses, and one shared ground. Finish with power injection, the parts list, and printable build sheets.",
    learn: [
      "Estimate LED current",
      "A separate supply and a shared ground",
      "The board’s power cap",
      "Follow the Build Diagram",
      "Power injection on long runs",
      "Export parts, connections and print sheets",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:14", label: "Count the amps" },
      { at: "0:49", label: "Power cap" },
      { at: "1:30", label: "The Build Diagram" },
      { at: "2:39", label: "Long runs" },
      { at: "2:55", label: "Take it to the bench" },
    ],
  },
  {
    number: "11",
    videoId: "EHTn01G2ORo",
    title: "Upload, Wiring Test and Live Stream",
    tagline: "From preview to real light.",
    summary: "Meet the build tools, check readiness and capacity, prove your wiring with the Wiring Test, then upload. Finish with Live Stream for instant feedback while you design, and the tools for when something goes wrong.",
    learn: [
      "What the build tools do",
      "Build tools and port checklist",
      "Getting to your board and Check capacity",
      "Flash Wiring Test before patterns",
      "Upload and follow the Output tab",
      "Live Stream, View Code, Export .ino and Share a report",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "The build tools" },
      { at: "0:41", label: "Readiness" },
      { at: "1:08", label: "Wiring Test first" },
      { at: "1:35", label: "Upload" },
      { at: "1:54", label: "Live Stream" },
      { at: "2:16", label: "When things go wrong" },
    ],
  },
  {
    number: "12",
    videoId: "3p9Q_1fWb4E",
    title: "Save, Share and Perform",
    tagline: "Keep what you make, and show it off.",
    summary: "Turn a patch into a reusable group, save it to the Pattern Library and organise your shelves. Share projects safely, perform on Stage, record the preview, and see where to go next.",
    learn: [
      "Group nodes into a reusable pattern",
      "Pattern Library shelves, Scan patterns and stars",
      "Projects, project files and graph links",
      "Trust for shared code",
      "Stage and recording",
    ],
    chapters: [
      { at: "0:00", label: "Cold open" },
      { at: "0:13", label: "Groups" },
      { at: "0:31", label: "The Pattern Library" },
      { at: "1:07", label: "Save and share" },
      { at: "1:23", label: "Perform" },
      { at: "1:58", label: "Where next" },
    ],
  },
];
