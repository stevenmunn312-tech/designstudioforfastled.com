import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// OpenNext supports the established Edge middleware format but not Next.js 16's
// Node-based proxy output yet. Keep this compatibility shim until the adapter
// adds Node middleware support.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
