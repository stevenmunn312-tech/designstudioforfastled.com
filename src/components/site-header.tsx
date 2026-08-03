import Link from "next/link";
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
        <Link href="/#download">Download</Link>
        <Link href="/patterns">Patterns</Link>
        <Link href="/upload">Upload project</Link>
      </nav>
      <Link className="button button-quiet header-login" href="/login">
        Sign in
      </Link>
    </header>
  );
}
