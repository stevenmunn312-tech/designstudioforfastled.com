import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Oxanium } from "next/font/google";
import "./globals.css";

const display = Oxanium({ subsets: ["latin"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://designstudioforfastled.com"),
  title: { default: "Design Studio for FastLED — Design the Light, Build the Rig", template: "%s · Design Studio for FastLED" },
  description: "Explore the Hardware branch of Design Studio for FastLED: choose boards and parts, wire visual patterns, prepare firmware, and print your build plan.",
  openGraph: {
    type: "website",
    title: "Design Studio for FastLED — Design the Light, Build the Rig",
    description: "One project across Hardware, Graph, Upload, and Build Diagram. Explore the development branch, download the desktop beta, and share community patterns.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Design Studio for FastLED pattern gallery" }],
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
