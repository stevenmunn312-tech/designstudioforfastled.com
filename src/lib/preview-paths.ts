/** Path rules for preview-build links. This file has no imports because the
 *  Worker entry (`custom-worker.ts`) and the Next app both load it.
 *
 *  The link's secret is the folder name inside the bucket, so a link stops
 *  working when that folder is renamed or deleted. Nothing lists the folders. */
const CODE_PATTERN = /^[a-f0-9]{32}$/;
const FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

export function isPreviewCode(code: string) {
  return CODE_PATTERN.test(code);
}

export function isPreviewFileName(fileName: string) {
  return FILE_PATTERN.test(fileName);
}

/** The bucket key for `/preview/<code>/<file>`, or null for any other path. */
export function previewObjectKey(pathname: string) {
  const parts = pathname.split("/");
  if (parts.length !== 4 || parts[0] !== "" || parts[1] !== "preview") return null;
  const [, , code, fileName] = parts;
  return isPreviewCode(code) && isPreviewFileName(fileName) ? `${code}/${fileName}` : null;
}

/** Response headers for a build download. The secret code in the path is the
 *  only gate, so the response must never be cached or indexed. */
export function previewDownloadHeaders(fileName: string, etag: string) {
  return {
    "content-type": "application/octet-stream",
    "content-disposition": `attachment; filename="${fileName}"`,
    etag,
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  };
}
