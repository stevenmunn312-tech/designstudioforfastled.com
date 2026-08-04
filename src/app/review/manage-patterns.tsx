"use client";

import { useActionState, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Search, Trash2, X } from "lucide-react";
import { purgePattern, setPatternArchived, type ReviewState } from "./actions";
import { PatternEditForm } from "@/components/pattern-edit-form";

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
      {panel === "edit" && (
        <PatternEditForm
          pattern={{
            id: pattern.id,
            title: pattern.title,
            description: pattern.description,
            controller: pattern.controller,
            ledCount: pattern.led_count,
            tags: pattern.tags ?? [],
            colors: pattern.preview_colors ?? [],
            studioScore: pattern.studio_score,
            status: pattern.status,
            published: pattern.published,
            likes: pattern.likes,
            downloads: pattern.downloads,
          }}
          onDone={() => setPanel("none")}
        />
      )}
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
