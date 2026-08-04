"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileCode2, RadioTower, UploadCloud } from "lucide-react";
import { sharedPatternGraph, sharedPatternName } from "@/lib/shared-pattern";
import { uploadPattern, type UploadState } from "./actions";

const initialState: UploadState = { message: "", tone: "idle" };
const DRAFT_KEY = "design-studio-community-handoff.v1";

type HandoffDraft = {
  patternName: string;
  fileName: string;
  patternJson: string;
  previewMediaBase64?: string;
  personalRating?: number | null;
  savedAt: number;
};

type FormDraft = {
  title: string;
  description: string;
  tags: string;
};

const blankForm: FormDraft = { title: "", description: "", tags: "" };

function isHandoffDraft(value: unknown): value is HandoffDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<HandoffDraft>;
  return typeof draft.patternName === "string"
    && typeof draft.fileName === "string"
    && typeof draft.patternJson === "string"
    && typeof draft.savedAt === "number";
}

function patternDetails(draft: HandoffDraft): FormDraft | null {
  try {
    const shared = JSON.parse(draft.patternJson) as unknown;
    const graph = sharedPatternGraph(shared);
    if (!graph) return null;
    const nodes = graph.nodes as Array<{
      data?: { nodeType?: string; properties?: Record<string, unknown> };
    }>;
    const edges = graph.edges;
    const effectNode = nodes.find((node) => node.data?.nodeType === "Animartrix");
    const effect = typeof effectNode?.data?.properties?.effect === "string"
      ? effectNode.data.properties.effect
      : null;
    const tags = [
      effect,
      nodes.some((node) => ["MicInput", "MusicLibrary"].includes(node.data?.nodeType ?? "")) ? "Audio Reactive" : null,
      "Design Studio",
    ].filter((tag): tag is string => Boolean(tag));
    const title = draft.patternName || sharedPatternName(shared) || "Untitled Pattern";
    const effectCopy = effect ? ` Its live preview is driven by the ${effect} effect.` : "";
    return {
      title,
      description: `Built in Design Studio for FastLED with ${nodes.length} ${nodes.length === 1 ? "node" : "nodes"} and ${edges.length} ${edges.length === 1 ? "patch" : "patches"}.${effectCopy}`,
      tags: [...new Set(tags)].slice(0, 6).join(", "),
    };
  } catch {
    return null;
  }
}

export function UploadForm({ canUpload }: { canUpload: boolean }) {
  const [state, action, pending] = useActionState(uploadPattern, initialState);
  const [form, setForm] = useState<FormDraft>(blankForm);
  const [patternJson, setPatternJson] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewMediaBase64, setPreviewMediaBase64] = useState("");
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [handoffState, setHandoffState] = useState<"idle" | "restored" | "error">("idle");

  const applyDraft = (draft: HandoffDraft) => {
    const details = patternDetails(draft);
    if (!details) {
      setHandoffState("error");
      return false;
    }
    setForm(details);
    setPatternJson(draft.patternJson);
    setFileName(draft.fileName);
    setPreviewMediaBase64(draft.previewMediaBase64 ?? "");
    setPersonalRating(draft.personalRating ?? null);
    setHandoffState("restored");
    return true;
  };

  useEffect(() => {
    if (state.tone === "success") sessionStorage.removeItem(DRAFT_KEY);
  }, [state.tone]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as unknown;
        if (isHandoffDraft(draft) && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          queueMicrotask(() => applyDraft(draft));
        } else {
          sessionStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }

  }, []);

  const update = (key: keyof FormDraft, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form action={action} className="upload-form">
      {handoffState !== "idle" && (
        <div className={`handoff-receipt ${handoffState}`} aria-live="polite">
          <div className="handoff-signal"><RadioTower size={18} /><i /><i /><i /></div>
          <div>
            <span>Studio handoff</span>
            <strong>{handoffState === "error" ? "The pattern could not be attached" : "Pattern attached from Design Studio"}</strong>
            {handoffState === "restored" && <small>{fileName} · details prefilled · edit anything below</small>}
          </div>
          {handoffState === "restored" && <CheckCircle2 size={22} />}
        </div>
      )}
      <div className="form-section-title"><span>01</span><div><h2>Pattern details</h2><p>Help another maker know what they are looking at.</p></div></div>
      <div className="form-grid">
        <label className="wide"><span>Pattern title</span><input name="title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Aurora Ribbon" required /></label>
        <label className="wide"><span>Description</span><textarea name="description" value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} placeholder="Describe the effect, timing, and anything the next maker should know." required /></label>
        <label className="wide"><span>Tags <small>comma separated</small></span><input name="tags" value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="Ambient, Noise, RGBW" /></label>
      </div>
      <div className="form-divider" />
      <div className="form-section-title"><span>02</span><div><h2>Design Studio pattern</h2><p>The pattern graph powers the animated browser preview—no hardware settings needed.</p></div></div>
      {patternJson && <input type="hidden" name="patternJson" value={patternJson} />}
      {patternJson && <input type="hidden" name="patternFileName" value={fileName} />}
      {previewMediaBase64 && <input type="hidden" name="previewMediaBase64" value={previewMediaBase64} />}
      {personalRating != null && <input type="hidden" name="uploaderRating" value={personalRating} />}
      <label className={`drop-zone ${patternJson ? "attached" : ""}`}>
        <input
          name="patternFile"
          type="file"
          accept=".json,application/json"
          required={!patternJson}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPatternJson("");
            setFileName(file?.name ?? "");
            setPreviewMediaBase64("");
            setPersonalRating(null);
            if (file) setHandoffState("idle");
          }}
        />
        {patternJson ? <CheckCircle2 size={28} /> : <UploadCloud size={28} />}
        <strong>{patternJson ? fileName : "Choose a Design Studio pattern"}</strong>
        <span>
          {patternJson
            ? previewMediaBase64
              ? "Attached from the app, with a looping preview clip · choose another file to replace it"
              : "Attached from the app · choose another file to replace it"
            : ".json · 2 MB max · used for the live preview"}
        </span>
        <FileCode2 className="drop-code" size={54} aria-hidden="true" />
      </label>
      {state.message && <p className={`form-message ${state.tone}`} aria-live="polite">{state.message}</p>}
      <div className="submit-row">
        {!canUpload && <p>Log in to send this pattern for review. Your attached pattern will stay here.</p>}
        <button className="button button-primary" disabled={!canUpload || pending} type="submit">{pending ? "Uploading…" : "Send for review"} <ArrowRight size={17} /></button>
      </div>
    </form>
  );
}
