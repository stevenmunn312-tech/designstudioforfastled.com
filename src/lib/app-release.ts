const REPO = "stevenmunn312-tech/Design-Studio-for-FastLED";
const VERSION = "0.5.1";
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/v${VERSION}`;

export const appRelease = {
  version: VERSION,
  releasesUrl: `https://github.com/${REPO}/releases`,
  sourceUrl: `https://github.com/${REPO}`,
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
