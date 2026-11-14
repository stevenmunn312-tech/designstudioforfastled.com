// Build the downloadable example project files from Design Studio for FastLED.
//
//   node scripts/project-files/build.mjs [path-to-app-repo]
//
// Each project's graph lives in scripts/project-files/graphs.ts. This script
// builds it with the app's own node library, gives every part its pins on the
// chosen board the way the app does, sizes the power limit, then checks the
// result with the app's validator and C++ generator before writing
// public/project-files/<slug>.fastled-project.json. A graph that the app would
// refuse to build fails the script instead of shipping.
//
// Finds the app the same way scripts/app-sync/sync.mjs does, and needs the
// app's own `npm install`.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "../..");

function findAppRoot() {
  const candidates = [
    process.argv[2],
    process.env.DESIGN_STUDIO_APP,
    resolve(siteRoot, "../Design-Studio-for-FastLED"),
    resolve(siteRoot, "../../../../Design-Studio-for-FastLED"),
  ].filter(Boolean);
  const found = candidates.map((path) => resolve(path)).find((path) => existsSync(join(path, "src/state/graphEvaluator.ts")));
  if (!found) {
    throw new Error(`Design Studio for FastLED checkout not found. Tried:\n  ${candidates.join("\n  ")}\nPass its path as the first argument.`);
  }
  return found;
}

const appRoot = findAppRoot();
const appRequire = createRequire(join(appRoot, "package.json"));
const { build } = appRequire("esbuild");
const { JSDOM } = appRequire("jsdom");

const tmpDir = join(siteRoot, "node_modules/.cache/project-files");
mkdirSync(tmpDir, { recursive: true });
const entryOut = join(tmpDir, "build-projects.mjs");
await build({
  entryPoints: [join(here, "entry.ts")],
  outfile: entryOut,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "warning",
  alias: { "@app": join(appRoot, "src"), "@": join(siteRoot, "src") },
  nodePaths: [join(appRoot, "node_modules")],
  loader: { ".webp": "dataurl", ".png": "dataurl", ".jpg": "dataurl", ".svg": "dataurl", ".css": "empty", ".mp3": "dataurl", ".wasm": "dataurl" },
  define: { "import.meta.env.DEV": "false", "import.meta.env.VITEST": "false", "import.meta.env": "{}" },
});

// App stores read browser storage when they load; give them an empty origin.
const dom = new JSDOM("", { url: "http://localhost" });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  sessionStorage: dom.window.sessionStorage,
});
process.argv = [process.argv[0], entryOut, join(siteRoot, "public/project-files")];
try {
  await import(pathToFileURL(entryOut).href);
} finally {
  dom.window.close();
  rmSync(entryOut, { force: true });
}
