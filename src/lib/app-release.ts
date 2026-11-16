const REPO = "stevenmunn312-tech/Design-Studio-for-FastLED";
const VERSION = "0.8.0";
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/v${VERSION}`;

// The app's hardware documentation, on its main branch.
const DOCS = `https://github.com/${REPO}/blob/main/docs`;
export const hardwareDocs = {
  guideUrl: `${DOCS}/user/hardware-workbench.md`,
  supportUrl: `${DOCS}/release/beta-support-matrix.md`,
};

export const appRelease = {
  version: VERSION,
  releasedOn: "November 16, 2026",
  releasesUrl: `https://github.com/${REPO}/releases`,
  releaseUrl: `https://github.com/${REPO}/releases/tag/v${VERSION}`,
  sourceUrl: `https://github.com/${REPO}`,
  highlights: [
    "A hardware workbench: pick the exact board, add the parts you own, and get filtered pin pickers, power and fuse sizing, and a printable Build Diagram. A project can hold several boards.",
    "OLED, TFT and segment displays with ready-made layouts, touch-screen designs, and a Web Remote phone control page served from an ESP32.",
    "A Music Player that plays from SD, internet radio or Bluetooth, 100 bundled audio-reactive patterns, and a native window for the Windows app. Projects saved by 0.7 are not migrated.",
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
