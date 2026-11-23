import { NextResponse, type NextRequest } from "next/server";
import { getPreviewBuild } from "@/lib/preview-builds";

/** Streams one unreleased build from the private bucket. The secret code in
 *  the path is the only gate, so the response must never be cached or indexed. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string; file: string }> }) {
  const { code, file } = await params;
  const build = await getPreviewBuild(code, file);
  if (!build) return new NextResponse("Not found.", { status: 404 });

  return new NextResponse(build.body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(build.size),
      "content-disposition": `attachment; filename="${file}"`,
      etag: build.httpEtag,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
