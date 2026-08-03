import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="FastLED Community home">
        <BrandMark />
        <span>FastLED</span>
        <em>community</em>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/patterns">Patterns</Link>
        <a href="https://fastled.io/docs/" target="_blank" rel="noreferrer">
          Docs <ArrowUpRight size={13} aria-hidden="true" />
        </a>
        <Link href="/upload">Share a pattern</Link>
      </nav>
      <Link className="button button-quiet header-login" href="/login">
        Log in
      </Link>
    </header>
  );
}
