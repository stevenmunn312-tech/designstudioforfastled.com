import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Image
          className="brand-logo"
          src="/brand/design-studio-wordmark.png"
          alt="Design Studio for FastLED"
          width={1400}
          height={243}
        />
        <p>
          Design the light, plan the hardware, and share your FastLED projects.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/#hardware">Hardware</Link>
        <Link href="/#download">Download</Link>
        <Link href="/patterns">Patterns</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/tutorials">Tutorials</Link>
        <Link href="/upload">Upload project</Link>
        <Link href="/login">Account</Link>
      </div>
      <p className="footer-note">Create · Share · Illuminate</p>
    </footer>
  );
}
