const REPO = "stevenmunn312-tech/Design-Studio-for-FastLED";
const VERSION = "1.0.4";
const STORE_URL = "https://apps.microsoft.com/detail/9NS90B1TWTC9";
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/v${VERSION}`;

// The app's hardware documentation, on its main branch.
const DOCS = `https://github.com/${REPO}/blob/main/docs`;
export const hardwareDocs = {
  guideUrl: `${DOCS}/user/hardware-workbench.md`,
  supportUrl: `${DOCS}/release/beta-support-matrix.md`,
};

export const appRelease = {
  version: VERSION,
  releasedOn: "November 28, 2026",
  releasesUrl: `https://github.com/${REPO}/releases`,
  releaseUrl: `https://github.com/${REPO}/releases/tag/v${VERSION}`,
  sourceUrl: `https://github.com/${REPO}`,
  highlights: [
    "The first stable release. Every project, pattern and share link saved by 1.0 opens in every later version. Some 0.8 nodes were renamed and do not carry over.",
    "Builds on a default Windows install: ESP32, Pico, Teensy and STM32 boards build and upload with long paths off, and a broken-off first download retries by itself.",
    "A Debug node for bench-testing one part, audio sources you can switch while the board runs, LED previews that show the light the LEDs give off, and a faster editor.",
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
    detail: "x64 · Microsoft Store",
    url: STORE_URL,
    secondary: {
      label: "Portable .zip",
      url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-windows-x86_64.zip`,
    },
  },
  {
    id: "macos",
    label: "macOS",
    detail: "Apple Silicon · .zip · experimental",
    url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-macos-arm64.zip`,
    secondary: {
      label: "Intel Mac build",
      url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-macos-x86_64.zip`,
    },
  },
  {
    id: "linux",
    label: "Linux",
    detail: "x64 · .tar.gz · experimental",
    url: `${RELEASE_BASE}/DesignStudioForFastLED-${VERSION}-linux-x86_64.tar.gz`,
  },
] as const;
