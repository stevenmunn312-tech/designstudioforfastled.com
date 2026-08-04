"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge } from "lucide-react";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import { ratePattern } from "@/lib/evaluator/patternRating";
import { createClient } from "@/lib/supabase/client";

// Same grid the site's other offline evaluation passes (generate-preview-clip.ts)
// use — the site always knows its own capture grid rather than deriving one
// from a MatrixOutput node the way the app does.
const GRID = 32;

export function ComputeStudioScoreButton({ patternId, previewUrl }: { patternId: string; previewUrl?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ tone: "idle" | "busy" | "error" | "success"; message: string }>({
    tone: "idle",
    message: "",
  });

  const run = async () => {
    if (!previewUrl) {
      setStatus({ tone: "error", message: "No source file to score from." });
      return;
    }
    setStatus({ tone: "busy", message: "Fetching pattern…" });
    try {
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("Could not fetch the pattern file");
      const graph = sharedPatternGraph(await response.json());
      if (!graph) throw new Error("That file did not parse as a shared pattern");

      setStatus({ tone: "busy", message: "Scoring…" });
      // Same safe-by-default boundary as generate-preview-clip.ts: Custom
      // Formula / Field Formula / Code nodes render blank rather than run,
      // even for an approved, published pattern. No per-pattern trust UI
      // exists on the moderator bench, so this never opts in.
      const rating = await ratePattern(graph.nodes as never, graph.edges as never, {
        gridW: GRID,
        gridH: GRID,
        groups: graph.groups as never,
      });
      if ("failed" in rating) throw new Error(rating.error);

      setStatus({ tone: "busy", message: "Saving…" });
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("set_pattern_studio_score", {
        pattern_id: patternId,
        score: rating.overall,
      });
      if (rpcError) throw new Error(rpcError.message);

      setStatus({ tone: "success", message: `Studio Score: ${rating.overall} (${rating.verdictLabel}).` });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  };

  return (
    <div className="backfill-row-action">
      <button type="button" className="button button-outline" onClick={() => void run()} disabled={status.tone === "busy"}>
        <Gauge size={14} aria-hidden="true" /> {status.tone === "busy" ? "Working…" : "Compute Studio Score"}
      </button>
      {status.message && <span className={`backfill-status ${status.tone}`}>{status.message}</span>}
    </div>
  );
}
