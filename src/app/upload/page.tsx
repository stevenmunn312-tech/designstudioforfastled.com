import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = {
  title: "Upload a Design Studio project",
  description: "Share a Design Studio for FastLED project with an animated browser preview.",
};

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  let signedIn = false;
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  return (
    <>
      <SiteHeader />
      <main className="shell upload-page">
        <div className="page-masthead upload-masthead">
          <p className="eyebrow"><span /> Design Studio upload</p>
          <h1>Patch your project<br /><em>into the library.</em></h1>
          <p>Upload the Studio export that powers your effect. Its graph becomes the animated preview visitors see.</p>
        </div>
        {!signedIn && (
          <div className="account-notice">
            <div><strong>Maker account required</strong><span>Uploads stay attributed and editable.</span></div>
            <Link className="button button-outline" href="/login">Log in or join</Link>
          </div>
        )}
        <div className="upload-layout">
          <UploadForm canUpload={signedIn} />
          <aside className="review-aside">
            <span className="aside-label">What gets approved</span>
            <h2>A useful Studio project tells the whole story.</h2>
            <ul>
              <li><CheckCircle2 size={17} /><span><strong>The graph opens</strong>Export a working .json project from Design Studio.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>It is yours to share</strong>Credit source projects and remixes clearly.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>It is understandable</strong>Add notes for unusual wiring, libraries, or timing.</span></li>
            </ul>
            <p>New projects stay private until a moderator checks the file, description, and live preview.</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
