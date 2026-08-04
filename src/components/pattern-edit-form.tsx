"use client";

import { useActionState } from "react";
import { updatePatternDetails, type ReviewState } from "@/app/review/actions";

/** The neutral shape both callers map onto: /review's manage list works in the
 *  database's snake_case rows, the gallery in the site's camelCase Pattern. */
export type EditablePattern = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  colors: string[];
  studioScore: number | null;
  status: string;
  published: boolean;
  likes: number;
  downloads: number;
};

const idle: ReviewState = { message: "", tone: "idle" };

export function PatternEditForm({
  pattern,
  onDone,
  closeLabel = "Close",
}: {
  pattern: EditablePattern;
  onDone: () => void;
  closeLabel?: string;
}) {
  const [state, action, pending] = useActionState(updatePatternDetails.bind(null, pattern.id), idle);

  return (
    <form action={action} className="manage-edit">
      {state.message && (
        <p className={`review-message ${state.tone}`} aria-live="polite">{state.message}</p>
      )}
      <label>
        <span>Title</span>
        <input name="title" defaultValue={pattern.title} maxLength={80} required />
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={pattern.description} maxLength={800} rows={3} required />
      </label>
      <div className="manage-edit-row">
        <label>
          <span>Studio Score</span>
          <input
            name="studioScore"
            type="number"
            min={0}
            max={100}
            placeholder="—"
            defaultValue={pattern.studioScore ?? ""}
          />
        </label>
      </div>
      <label>
        <span>Tags (comma separated, max 6)</span>
        <input name="tags" defaultValue={pattern.tags.join(", ")} />
      </label>
      <div className="manage-edit-row">
        {[1, 2, 3].map((n) => (
          <label key={n}>
            <span>Colour {n}</span>
            <input name={`color${n}`} type="color" defaultValue={pattern.colors[n - 1] ?? "#61e4ff"} />
          </label>
        ))}
        <label>
          <span>Status</span>
          <select name="status" defaultValue={pattern.status}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <label className="manage-check">
        <input name="published" type="checkbox" defaultChecked={pattern.published} />
        <span>Published (visible in the gallery)</span>
      </label>
      <p className="manage-note">
        Likes ({pattern.likes.toLocaleString()}), downloads ({pattern.downloads.toLocaleString()}) and the uploaded
        source file are not editable here — the counters are community-earned and the file is the maker&apos;s.
      </p>
      <div className="manage-edit-actions">
        <button type="button" className="button button-outline" onClick={onDone}>{closeLabel}</button>
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
