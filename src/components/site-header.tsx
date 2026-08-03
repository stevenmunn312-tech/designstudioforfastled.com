import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Design Studio for FastLED home">
        <BrandMark />
        <span>Design Studio</span>
        <em>for FastLED</em>
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
