const REPO = "stevenmunn312-tech/Design-Studio-for-FastLED";
const VERSION = "0.7.0";
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/v${VERSION}`;

// Hardware is an active development line, separate from the frozen v0.7.0 beta.
const HARDWARE_DOCS = `https://github.com/${REPO}/blob/Hardware/docs`;
export const hardwareDevelopment = {
  sourceUrl: `https://github.com/${REPO}/tree/Hardware`,
  setupUrl: `${HARDWARE_DOCS}/getting-started/development-setup.md`,
  firstProjectUrl: `${HARDWARE_DOCS}/getting-started/first-project.md`,
  guideUrl: `${HARDWARE_DOCS}/user/hardware-workbench.md`,
  helperUrl: `${HARDWARE_DOCS}/getting-started/upload-helper.md`,
  supportUrl: `${HARDWARE_DOCS}/release/beta-support-matrix.md`,
};

export const appRelease = {
  version: VERSION,
  releasedOn: "August 9, 2026",
  releasesUrl: `https://github.com/${REPO}/releases`,
  releaseUrl: `https://github.com/${REPO}/releases/tag/v${VERSION}`,
  sourceUrl: `https://github.com/${REPO}`,
  highlights: [
    "First-class HUB75 Matrix Output support for ESP32, ESP32-S2, and ESP32-S3, including chained, folded, serpentine, and rotated panel layouts.",
    "A dedicated HUB75 Topology mode in Flash Wiring Test, with per-panel orientation markers that make 2D panel layouts easier to verify.",
    "Better preview-to-firmware palette parity, more trustworthy RAM estimates, ten curated featured patterns, and a fix for silent first frames in live-audio recording.",
  ],
};

export type DownloadTargetId = "windows" | "macos" | "linux";

export function detectDownloadTarget(userAgent: string | null): DownloadTargetId | null {
  if (!userAgent) return null;
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macos";
  if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) return "linux";
  return null;
}

export const downloadTargets = [
  {
    id: "windows",
    label: "Windows",
    detail: "x64 · portable .zip",
    url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-windows-x86_64.zip`,
  },
  {
    id: "macos",
    label: "macOS",
    detail: "Apple Silicon · .tar.gz",
    url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-macos-arm64.tar.gz`,
    secondary: {
      label: "Intel Mac build",
      url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-macos-x86_64.tar.gz`,
    },
  },
  {
    id: "linux",
    label: "Linux",
    detail: "x64 · portable .tar.gz",
    url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-linux-x86_64.tar.gz`,
  },
] as const;
