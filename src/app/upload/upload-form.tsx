"use client";

import { useActionState } from "react";
import { ArrowRight, FileCode2, UploadCloud } from "lucide-react";
import { uploadPattern, type UploadState } from "./actions";

const initialState: UploadState = { message: "", tone: "idle" };

export function UploadForm({ canUpload }: { canUpload: boolean }) {
  const [state, action, pending] = useActionState(uploadPattern, initialState);
  return (
    <form action={action} className="upload-form">
      <div className="form-section-title"><span>01</span><div><h2>Pattern details</h2><p>Help another maker know what they are looking at.</p></div></div>
      <div className="form-grid">
        <label className="wide"><span>Pattern title</span><input name="title" placeholder="e.g. Aurora Ribbon" required /></label>
        <label><span>Controller</span><select name="controller" defaultValue="" required><option value="" disabled>Select board</option><option>ESP32</option><option>ESP8266</option><option>Arduino</option><option>RP2040</option><option>Teensy</option><option>Other</option></select></label>
        <label><span>LED count</span><input name="ledCount" type="number" min="1" max="100000" placeholder="144" required /></label>
        <label className="wide"><span>Description</span><textarea name="description" rows={4} placeholder="Describe the effect, timing, and anything the next maker should know." required /></label>
        <label className="wide"><span>Tags <small>comma separated</small></span><input name="tags" placeholder="Ambient, Noise, RGBW" /></label>
      </div>
      <div className="form-divider" />
      <div className="form-section-title"><span>02</span><div><h2>Pattern file</h2><p>The useful bit. Keep it small and inspectable.</p></div></div>
      <label className="drop-zone">
        <input name="patternFile" type="file" accept=".json,.txt,.ino,.ledmap" required />
        <UploadCloud size={28} />
        <strong>Choose a pattern file</strong>
        <span>.json, .txt, .ino, or .ledmap · 2 MB max</span>
        <FileCode2 className="drop-code" size={54} aria-hidden="true" />
      </label>
      {state.message && <p className={`form-message ${state.tone}`} aria-live="polite">{state.message}</p>}
      <div className="submit-row">
        {!canUpload && <p>Log in to send this pattern for review.</p>}
        <button className="button button-primary" disabled={!canUpload || pending} type="submit">{pending ? "Uploading…" : "Send for review"} <ArrowRight size={17} /></button>
      </div>
    </form>
  );
}
