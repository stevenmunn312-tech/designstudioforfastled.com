import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <BrandMark />
        <p>
          The project library for Design Studio for FastLED.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/#download">Download</Link>
        <Link href="/patterns">Patterns</Link>
        <Link href="/upload">Upload project</Link>
        <Link href="/login">Account</Link>
      </div>
      <p className="footer-note">Create · Share · Illuminate</p>
    </footer>
  );
}
