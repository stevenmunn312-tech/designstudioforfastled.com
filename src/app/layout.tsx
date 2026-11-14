import type { Metadata } from "next";
import { Audiowide, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// The "Learn the Studio" series faces (DESIGN.md): Inter for headlines and
// reading, JetBrains Mono for facts and captions, Audiowide for slate numerals.
const studioMark = Audiowide({ subsets: ["latin"], weight: "400", variable: "--font-studio-mark" });
const studioSans = Inter({ subsets: ["latin"], variable: "--font-studio-sans" });
const studioMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-studio-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://designstudioforfastled.com"),
  title: { default: "Design Studio for FastLED — Build LED patterns with nodes", template: "%s · Design Studio for FastLED" },
  description: "Build LED patterns with nodes. Send them to real lights. A free desktop app that turns a node graph into FastLED firmware, with a live preview while you patch.",
  openGraph: {
    type: "website",
    title: "Design Studio for FastLED — Build LED patterns with nodes",
    description: "Wire nodes into a graph, watch the matrix answer live, then flash real FastLED firmware. Download the desktop beta and browse the pattern library.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Design Studio for FastLED pattern gallery" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${studioMark.variable} ${studioSans.variable} ${studioMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
