import type { Metadata } from "next";
import { PatternGallery } from "@/components/pattern-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPatterns } from "@/lib/published-patterns";
import { isCurrentUserModerator } from "@/lib/moderator";

export const metadata: Metadata = {
  title: "Pattern gallery",
  description: "Browse animated projects shared by the Design Studio for FastLED community.",
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
        <div className="page-masthead studio-masthead">
          <p className="eyebrow"><span /> Design Studio pattern library</p>
          <h1>See the pattern<br /><em>before you open it.</em></h1>
          <p>Every approved Design Studio project renders as a moving matrix preview in your browser.</p>
        </div>
        <PatternGallery patterns={patterns} isModerator={isModerator} />
      </main>
      <SiteFooter />
    </>
  );
}
