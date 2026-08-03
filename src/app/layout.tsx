import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Oxanium } from "next/font/google";
import "./globals.css";

const display = Oxanium({ subsets: ["latin"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://designstudioforfastled.com"),
  title: { default: "FastLED Community — Patterns made to travel", template: "%s · FastLED Community" },
  description: "Publish, discover, and remix LED patterns built by the FastLED community.",
  openGraph: {
    type: "website",
    title: "FastLED Community — Share the light",
    description: "Patterns, hardware notes, and useful starting points for LED makers.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "FastLED Community pattern gallery" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
