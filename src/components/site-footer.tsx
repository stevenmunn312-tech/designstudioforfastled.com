import Link from "next/link";
import { Code2 } from "lucide-react";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <BrandMark />
        <p>
          Built by people who think one more LED is usually the right answer.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/patterns">Patterns</Link>
        <Link href="/upload">Upload</Link>
        <a href="https://fastled.io/docs/" target="_blank" rel="noreferrer">FastLED docs</a>
        <a href="https://github.com/FastLED/FastLED" target="_blank" rel="noreferrer">
          <Code2 size={15} aria-hidden="true" /> GitHub
        </a>
      </div>
      <p className="footer-note">Community-made. Open by default.</p>
    </footer>
  );
}
