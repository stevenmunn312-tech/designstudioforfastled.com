import type { Metadata } from "next";
import { PatternGallery } from "@/components/pattern-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPatterns } from "@/lib/published-patterns";
import { isCurrentUserModerator } from "@/lib/moderator";

export const metadata: Metadata = {
  title: "Pattern gallery",
  description: "Every pattern in the Design Studio for FastLED library, running live in your browser on the app's own engine.",
};

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const [patterns, isModerator] = await Promise.all([
    getPublishedPatterns(),
    isCurrentUserModerator(),
  ]);
  return (
    <>
      <SiteHeader />
      <main className="shell listing-page">
        <div className="page-masthead">
          <h1>See the pattern <em>before you open it.</em></h1>
          <p>Every pattern in the Design Studio library, running live in your browser on the app&apos;s own engine.</p>
        </div>
        <PatternGallery patterns={patterns} isModerator={isModerator} />
      </main>
      <SiteFooter />
    </>
  );
}
