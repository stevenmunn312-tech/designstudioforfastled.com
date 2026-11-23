import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isPreviewCode, isPreviewFileName } from "@/lib/preview-paths";

/** The parts of an R2 bucket binding this feature uses. The Workers type
 *  package is not installed, so the shape is declared here. */
type PreviewObject = { key: string; size: number };
type PreviewBody = PreviewObject & { body: ReadableStream; httpEtag: string };
type PreviewBucket = {
  list(options: { prefix: string }): Promise<{ objects: PreviewObject[] }>;
  get(key: string): Promise<PreviewBody | null>;
};

declare global {
  interface CloudflareEnv {
    /** Private bucket of unreleased app builds; see `wrangler.jsonc`. */
    PREVIEW_BUILDS?: PreviewBucket;
  }
}

export type PreviewBuild = { fileName: string; label: string; size: number };

const PLATFORM_LABELS: [suffix: string, label: string][] = [
  ["-windows-x86_64.zip", "Windows (64-bit)"],
  ["-macos-arm64.zip", "macOS (Apple silicon)"],
  ["-macos-x86_64.zip", "macOS (Intel)"],
  ["-linux-x86_64.tar.gz", "Linux (64-bit)"],
];

async function previewBucket() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.PREVIEW_BUILDS ?? null;
  } catch {
    // No Cloudflare context (plain `next dev` without the binding).
    return null;
  }
}

/** The builds behind one secret code, in the order of `PLATFORM_LABELS`. */
export async function listPreviewBuilds(code: string): Promise<PreviewBuild[]> {
  if (!isPreviewCode(code)) return [];
  const bucket = await previewBucket();
  if (!bucket) return [];
  const prefix = `${code}/`;
  const { objects } = await bucket.list({ prefix });
  const builds = objects
    .map((object) => ({ fileName: object.key.slice(prefix.length), size: object.size }))
    .filter((object) => isPreviewFileName(object.fileName))
    .map((object) => ({ ...object, label: platformLabel(object.fileName) }));
  return builds.sort((a, b) => platformOrder(a.fileName) - platformOrder(b.fileName));
}

export async function getPreviewBuild(code: string, fileName: string) {
  if (!isPreviewCode(code) || !isPreviewFileName(fileName)) return null;
  const bucket = await previewBucket();
  return bucket ? bucket.get(`${code}/${fileName}`) : null;
}

function platformOrder(fileName: string) {
  const index = PLATFORM_LABELS.findIndex(([suffix]) => fileName.endsWith(suffix));
  return index === -1 ? PLATFORM_LABELS.length : index;
}

function platformLabel(fileName: string) {
  return PLATFORM_LABELS.find(([suffix]) => fileName.endsWith(suffix))?.[1] ?? "Other file";
}
