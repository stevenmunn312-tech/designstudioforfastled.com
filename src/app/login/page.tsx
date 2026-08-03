import type { Metadata } from "next";
import { Check } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to share and manage patterns in Design Studio for FastLED.",
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="auth-page shell">
        <section className="auth-aside">
          <p className="eyebrow light"><span /> Community account</p>
          <h2>Keep your work<br /><em>in the loop.</em></h2>
          <p>One account keeps every upload, remix, and hardware note together.</p>
          <ul>
            <li><Check size={15} /> Save draft pattern details</li>
            <li><Check size={15} /> Update compatibility notes</li>
            <li><Check size={15} /> Credit original makers</li>
          </ul>
          <div className="auth-glow" aria-hidden="true" />
        </section>
        <AuthForm />
      </main>
    </>
  );
}
