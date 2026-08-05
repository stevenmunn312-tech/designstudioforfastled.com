import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Design Studio for FastLED home">
        <Image
          className="brand-logo"
          src="/brand/design-studio-wordmark.png"
          alt="Design Studio for FastLED"
          width={1400}
          height={243}
          priority
        />
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
