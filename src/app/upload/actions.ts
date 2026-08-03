"use server";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isSharedPattern } from "@/lib/shared-pattern";

export type UploadState = { message: string; tone: "idle" | "error" | "success" };

function projectColors(value: unknown): [string, string, string] {
  const matches = JSON.stringify(value).match(/#[0-9a-fA-F]{6}/g) ?? [];
  const unique = [...new Set(matches)];
  return [unique[0] ?? "#32e5ff", unique[1] ?? "#4037ff", unique[2] ?? "#ef35ed"];
}

export async function uploadPattern(_state: UploadState, formData: FormData): Promise<UploadState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before accepting uploads.", tone: "error" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const controller = String(formData.get("controller") ?? "").trim();
  const ledCount = Number(formData.get("ledCount"));
  const tags = String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  const selectedFile = formData.get("patternFile");
  const transferredJson = String(formData.get("patternJson") ?? "");
  const transferredName = String(formData.get("patternFileName") ?? "studio-pattern.fastled-pattern.json");

  if (!title || !description || !controller || !Number.isInteger(ledCount) || ledCount < 1 || ledCount > 100000) {
    return { message: "Complete the required pattern details.", tone: "error" };
  }
  const file = selectedFile instanceof File && selectedFile.size > 0
    ? selectedFile
    : transferredJson
      ? new File([transferredJson], transferredName, { type: "application/json" })
      : null;
  if (!file || file.size === 0 || file.size > 2 * 1024 * 1024) {
    return { message: "Choose a pattern file no larger than 2 MB.", tone: "error" };
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension !== "json") {
    return { message: "Choose a Design Studio pattern (.json) so the site can render its live preview.", tone: "error" };
  }
  let project: unknown;
  try {
    project = JSON.parse(await file.text());
  } catch {
    return { message: "That file is not valid JSON. Share the pattern from Design Studio and try again.", tone: "error" };
  }
  if (!isSharedPattern(project)) {
    return { message: "That does not look like a Design Studio pattern export.", tone: "error" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { message: "Log in before sharing a pattern.", tone: "error" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: storageError } = await supabase.storage.from("pattern-files").upload(storagePath, file, {
    contentType: file.type || "text/plain",
    upsert: false,
  });
  if (storageError) return { message: storageError.message, tone: "error" };

  const { error: insertError } = await supabase.from("patterns").insert({
    owner_id: user.id,
    title,
    description,
    controller,
    led_count: ledCount,
    tags,
    storage_path: storagePath,
    preview_colors: projectColors(project),
  });

  if (insertError) {
    await supabase.storage.from("pattern-files").remove([storagePath]);
    return { message: insertError.message, tone: "error" };
  }

  return { message: "Pattern received. It is now queued for community review.", tone: "success" };
}
