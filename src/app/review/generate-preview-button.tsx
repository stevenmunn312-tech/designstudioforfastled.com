"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import { generatePreviewClip } from "@/lib/generate-preview-clip";
import { createClient } from "@/lib/supabase/client";

export function GeneratePreviewButton({ patternId, previewUrl }: { patternId: string; previewUrl?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ tone: "idle" | "busy" | "error" | "success"; message: string }>({
    tone: "idle",
    message: "",
  });

  const run = async () => {
    if (!previewUrl) {
      setStatus({ tone: "error", message: "No source file to capture from." });
      return;
    }
    setStatus({ tone: "busy", message: "Fetching pattern…" });
    try {
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("Could not fetch the pattern file");
      const graph = sharedPatternGraph(await response.json());
      if (!graph) throw new Error("That file did not parse as a shared pattern");

      setStatus({ tone: "busy", message: "Capturing a preview clip…" });
      const clip = await generatePreviewClip(graph.nodes as never, graph.edges as never, graph.groups as never);
      if (!clip) throw new Error("This browser could not record WebM, or the pattern has no nodes");

      setStatus({ tone: "busy", message: "Uploading…" });
      const supabase = createClient();
      const path = `backfill/${patternId}.webm`;
      const { error: uploadError } = await supabase.storage.from("pattern-previews").upload(path, clip, {
        contentType: "video/webm",
        upsert: true,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { error: rpcError } = await supabase.rpc("set_pattern_preview_media", {
        pattern_id: patternId,
        media_path: path,
        media_type: "video/webm",
      });
      if (rpcError) throw new Error(rpcError.message);

      setStatus({ tone: "success", message: "Preview clip saved." });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  };

  return (
    <div className="backfill-row-action">
      <button type="button" className="button button-outline" onClick={() => void run()} disabled={status.tone === "busy"}>
        <Wand2 size={14} aria-hidden="true" /> {status.tone === "busy" ? "Working…" : "Generate preview"}
      </button>
      {status.message && <span className={`backfill-status ${status.tone}`}>{status.message}</span>}
    </div>
  );
}
