import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroLoopStudio } from "./hero-loop-studio";

// Dev-only tool for regenerating the "Live authoring" hero clip. Not linked
// from anywhere and 404s outside development — it exists to be run by hand
// when the loop needs re-rendering, not to be shipped.
// See docs/devel/hero-loop-render.md.

export const metadata: Metadata = {
  title: "Hero loop renderer",
  robots: { index: false, follow: false },
};

export default function HeroLoopPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 96px" }}>
      <h1>Hero loop renderer</h1>
      <p style={{ maxWidth: "62ch", color: "var(--muted)" }}>
        Renders the seamless Juggle loop for the “Live authoring” section as a numbered
        PNG sequence, then verifies the seam by comparing frame 0 against the frame the
        video wraps to. Preview first, render second, and only encode a clip whose seam
        check passed.
      </p>
      <HeroLoopStudio />
    </main>
  );
}
