import { NextResponse, type NextRequest } from "next/server";
import { isStoredPatternId, patternFileName } from "@/lib/pattern-files";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Long enough to follow the redirect, short enough that the URL is useless if
 *  copied out of the address bar later. */
const SIGNED_URL_SECONDS = 60;

/** Signs the pattern file at click time and redirects to it. The detail page
 *  links here instead of embedding a signed URL, because an embedded URL
 *  expires while the page sits open and the button then fails with a raw
 *  storage error. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patternPage = new URL(`/patterns/${encodeURIComponent(id)}`, request.url);
  if (!hasSupabaseConfig() || !isStoredPatternId(id)) {
    return new NextResponse("Pattern not found.", { status: 404 });
  }

  const supabase = await createClient();
  // Same visibility rule as the detail page: published and not archived.
  const { data, error } = await supabase
    .from("patterns")
    .select("storage_path")
    .eq("id", id)
    .eq("published", true)
    .eq("archived", false)
    .maybeSingle();
  if (error || !data) return new NextResponse("Pattern not found.", { status: 404 });

  const { data: signed } = await supabase.storage
    .from("pattern-files")
    .createSignedUrl(data.storage_path, SIGNED_URL_SECONDS, { download: patternFileName(data.storage_path) });

  if (!signed?.signedUrl) {
    patternPage.searchParams.set("download", "failed");
    return NextResponse.redirect(patternPage, { status: 303, headers: { "cache-control": "no-store" } });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 303, headers: { "cache-control": "no-store" } });
}
