"use client";

import { useActionState, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Search, Trash2, X } from "lucide-react";
import {
  purgePattern,
  setPatternArchived,
  updatePatternDetails,
  type ReviewState,
} from "./actions";

export type ManagedPattern = {
  id: string;
  title: string;
  description: string;
  controller: string;
  led_count: number;
  tags: string[] | null;
  preview_colors: string[] | null;
  status: string;
  published: boolean;
  archived: boolean;
  studio_score: number | null;
  likes: number;
  downloads: number;
  created_at: string;
  author: string;
};

const idle: ReviewState = { message: "", tone: "idle" };

function Message({ state }: { state: ReviewState }) {
  if (!state.message) return null;
  return <p className={`review-message ${state.tone}`} aria-live="polite">{state.message}</p>;
}

function EditForm({ pattern, onDone }: { pattern: ManagedPattern; onDone: () => void }) {
  const [state, action, pending] = useActionState(updatePatternDetails.bind(null, pattern.id), idle);
  const colors = pattern.preview_colors ?? [];

  return (
    <form action={action} className="manage-edit">
      <Message state={state} />
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
          <span>Controller</span>
          <input name="controller" defaultValue={pattern.controller} required />
        </label>
        <label>
          <span>LED count</span>
          <input name="ledCount" type="number" min={1} max={100000} defaultValue={pattern.led_count} required />
        </label>
        <label>
          <span>Studio Score</span>
          <input
            name="studioScore"
            type="number"
            min={0}
            max={100}
            placeholder="—"
            defaultValue={pattern.studio_score ?? ""}
          />
        </label>
      </div>
      <label>
        <span>Tags (comma separated, max 6)</span>
        <input name="tags" defaultValue={(pattern.tags ?? []).join(", ")} />
      </label>
      <div className="manage-edit-row">
        {[1, 2, 3].map((n) => (
          <label key={n}>
            <span>Colour {n}</span>
            <input name={`color${n}`} type="color" defaultValue={colors[n - 1] ?? "#61e4ff"} />
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
        <button type="button" className="button button-outline" onClick={onDone}>Close</button>
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function ArchiveButton({ pattern }: { pattern: ManagedPattern }) {
  const [state, action, pending] = useActionState(setPatternArchived.bind(null, pattern.id), idle);
  return (
    <form action={action} className="manage-inline-form">
      <Message state={state} />
      <button
        type="submit"
        className="button button-outline"
        disabled={pending}
        name="archived"
        value={pattern.archived ? "false" : "true"}
      >
        {pattern.archived
          ? <><ArchiveRestore size={14} aria-hidden="true" /> {pending ? "Restoring…" : "Restore"}</>
          : <><Archive size={14} aria-hidden="true" /> {pending ? "Archiving…" : "Archive"}</>}
      </button>
    </form>
  );
}

function PurgeForm({ pattern, onCancel }: { pattern: ManagedPattern; onCancel: () => void }) {
  const [state, action, pending] = useActionState(purgePattern.bind(null, pattern.id), idle);
  return (
    <form action={action} className="manage-purge">
      <Message state={state} />
      <p>
        This permanently deletes <strong>{pattern.title}</strong>, its uploaded source file and its preview clip.
        It cannot be undone. Type <code>PURGE</code> to confirm.
      </p>
      <div className="manage-purge-row">
        <input name="confirm" placeholder="PURGE" aria-label="Type PURGE to confirm" autoComplete="off" />
        <button type="button" className="button button-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button manage-danger" disabled={pending}>
          <Trash2 size={14} aria-hidden="true" /> {pending ? "Purging…" : "Purge permanently"}
        </button>
      </div>
    </form>
  );
}

function ManageRow({ pattern }: { pattern: ManagedPattern }) {
  const [panel, setPanel] = useState<"none" | "edit" | "purge">("none");

  return (
    <li className={`manage-row${pattern.archived ? " is-archived" : ""}`}>
      <div className="manage-row-head">
        <div className="manage-row-title">
          <strong>{pattern.title}</strong>
          <span>by {pattern.author}</span>
        </div>
        <div className="manage-badges">
          <span className={`manage-badge status-${pattern.status}`}>{pattern.status}</span>
          {pattern.archived
            ? <span className="manage-badge is-archived-badge">archived</span>
            : <span className={`manage-badge ${pattern.published ? "is-live" : "is-hidden"}`}>
                {pattern.published ? "live" : "unlisted"}
              </span>}
          {pattern.studio_score != null && <span className="manage-badge">{pattern.studio_score}/100</span>}
        </div>
        <div className="manage-row-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
            aria-expanded={panel === "edit"}
          >
            {panel === "edit" ? <X size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
            {panel === "edit" ? "Close" : "Edit"}
          </button>
          <ArchiveButton pattern={pattern} />
          {/* Purge is only reachable once archived — the RPC enforces the same
              rule, so this is a signpost rather than the actual guard. */}
          {pattern.archived && panel !== "purge" && (
            <button type="button" className="button manage-danger" onClick={() => setPanel("purge")}>
              <Trash2 size={14} aria-hidden="true" /> Purge
            </button>
          )}
        </div>
      </div>
      {panel === "edit" && <EditForm pattern={pattern} onDone={() => setPanel("none")} />}
      {panel === "purge" && <PurgeForm pattern={pattern} onCancel={() => setPanel("none")} />}
    </li>
  );
}

export function ManagePatterns({ patterns }: { patterns: ManagedPattern[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return patterns;
    return patterns.filter((pattern) =>
      [pattern.title, pattern.author, pattern.controller, pattern.status, ...(pattern.tags ?? [])]
        .some((value) => value.toLowerCase().includes(needle)));
  }, [patterns, query]);

  return (
    <section className="backfill-section manage-section" aria-label="All patterns">
      <h2>All patterns</h2>
      <p>
        Edit any pattern&apos;s details, hide one from the site with Archive, or purge an archived pattern for good.
        Archiving is reversible and takes the pattern out of the gallery, the detail page and public file downloads.
      </p>
      <label className="search-field manage-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search all patterns</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, maker, controller, tag" />
      </label>
      {visible.length === 0 ? (
        <p className="manage-empty">No patterns match that search.</p>
      ) : (
        <ul className="manage-list">
          {visible.map((pattern) => <ManageRow key={pattern.id} pattern={pattern} />)}
        </ul>
      )}
    </section>
  );
}
