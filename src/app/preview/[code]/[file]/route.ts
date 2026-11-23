import { NextResponse, type NextRequest } from "next/server";
import { getPreviewBuild } from "@/lib/preview-builds";
import { previewDownloadHeaders } from "@/lib/preview-paths";

/** Streams one unreleased build from the private bucket, for `next dev` only.
 *  On the deployed Worker `custom-worker.ts` answers this path first, because
 *  streaming a ~100 MB file through a route handler exceeds the Worker's CPU
 *  time and truncates the download. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string; file: string }> }) {
  const { code, file } = await params;
  const build = await getPreviewBuild(code, file);
  if (!build) return new NextResponse("Not found.", { status: 404 });
  return new NextResponse(build.body, { headers: previewDownloadHeaders(file, build.httpEtag) });
}
