"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/#hardware", label: "Hardware" },
  { href: "/#download", label: "Download" },
  { href: "/patterns", label: "Patterns" },
  { href: "/projects", label: "Projects" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/upload", label: "Upload project" },
];

/** Section links on the home page are never "the current page"; route links are
 *  current on their own page and anything beneath it (/patterns/[id]). */
function isCurrent(href: string, pathname: string) {
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Below the desktop breakpoint the nav is a disclosure panel. While it is
  // open, Escape and any press outside the header close it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header className="site-header" ref={headerRef}>
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
      <nav className={`site-nav${menuOpen ? " is-open" : ""}`} id="site-nav" aria-label="Main navigation">
        {navLinks.map(({ href, label }) => (
          <Link
            aria-current={isCurrent(href, pathname) ? "page" : undefined}
            href={href}
            key={href}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link className="button button-quiet header-login" href="/login">
        Sign in
      </Link>
      <button
        aria-controls="site-nav"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className="button button-quiet nav-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        ref={toggleRef}
        type="button"
      >
        {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
        <span className="nav-toggle-label">Menu</span>
      </button>
    </header>
  );
}
