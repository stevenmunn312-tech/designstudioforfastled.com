"use client";

import { useActionState, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = { message: "", tone: "idle" };

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(signIn, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signUp, initialState);
  const state = mode === "login" ? loginState : signupState;
  const pending = loginPending || signupPending;

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="Account action">
        <button role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} type="button">Log in</button>
        <button role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")} type="button">Create account</button>
      </div>
      <div className="auth-card-copy">
        <p className="eyebrow"><span /> Maker access</p>
        <h1>{mode === "login" ? "Welcome back." : "Join the signal."}</h1>
        <p>{mode === "login" ? "Pick up where your last pattern left off." : "Publish patterns, credit remixes, and help better effects travel."}</p>
      </div>
      <form action={mode === "login" ? loginAction : signupAction} className="stack-form">
        <label>
          <span>Email address</span>
          <div className="input-shell"><Mail size={17} /><input name="email" type="email" autoComplete="email" placeholder="maker@example.com" required /></div>
        </label>
        <label>
          <span>Password</span>
          <div className="input-shell"><LockKeyhole size={17} /><input name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required /></div>
        </label>
        {state.message && <p className={`form-message ${state.tone}`} aria-live="polite">{state.message}</p>}
        <button className="button button-primary full-button" disabled={pending} type="submit">
          {pending ? "Connecting…" : mode === "login" ? "Log in" : "Create account"} <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-fineprint">By continuing, you agree to share only work you have permission to publish.</p>
    </div>
  );
}
