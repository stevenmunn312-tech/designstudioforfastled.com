import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = {
  title: "Share a pattern",
  description: "Publish a FastLED pattern with hardware notes for the community.",
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
          <p className="eyebrow"><span /> Community upload</p>
          <h1>Send a pattern<br /><em>down the line.</em></h1>
          <p>Give it enough context to light up on someone else&apos;s bench.</p>
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
            <h2>A useful pattern tells the whole story.</h2>
            <ul>
              <li><CheckCircle2 size={17} /><span><strong>It runs</strong>Test the effect on the hardware you list.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>It is yours to share</strong>Credit source projects and remixes clearly.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>It is understandable</strong>Add notes for unusual wiring, libraries, or timing.</span></li>
            </ul>
            <p>New patterns are private until a moderator checks the file and description.</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
