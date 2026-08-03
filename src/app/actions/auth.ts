"use server";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { message: string; tone: "idle" | "error" | "success" };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase to enable member sign-in.", tone: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) return { message: error.message, tone: "error" };
  redirect("/upload");
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase to create community accounts.", tone: "error" };
  }

  const supabase = await createClient();
  const { email, password } = credentials(formData);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/upload` },
  });

  if (error) return { message: error.message, tone: "error" };
  if (data.session) redirect("/upload");
  return { message: "Check your inbox to confirm your account.", tone: "success" };
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
