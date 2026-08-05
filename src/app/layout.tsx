import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Oxanium } from "next/font/google";
import "./globals.css";

const display = Oxanium({ subsets: ["latin"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://designstudioforfastled.com"),
  title: { default: "Design Studio for FastLED — Wire the Nodes, Light Up the Room", template: "%s · Design Studio for FastLED" },
  description: "Wire nodes, light up the room. Download Design Studio for FastLED, a free node-based LED design tool, and browse live community patterns.",
  openGraph: {
    type: "website",
    title: "Design Studio for FastLED — Wire the Nodes, Light Up the Room",
    description: "Wire nodes, light up the room. Free, node-based LED design for Windows, macOS, and Linux, plus live browser previews from the community.",
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
