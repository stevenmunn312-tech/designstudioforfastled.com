"use client";

import Link from "next/link";
import { ArrowRight, Search, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { tagKey, tagKeys } from "@/lib/pattern-tags";
import { PatternCard } from "./pattern-card";

/** Filter chips come from the tags the library actually uses. A tag on only a
 *  pattern or two is left to search; a tag on nearly every pattern would not
 *  narrow anything. */
const MAX_FILTERS = 6;
const MIN_PATTERNS_PER_FILTER = 3;
const MAX_SHARE_PER_FILTER = 0.8;

export function PatternGallery({ patterns, isModerator = false }: { patterns: Pattern[]; isModerator?: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const keyedPatterns = useMemo(
    () => patterns.map((pattern) => ({ pattern, keys: tagKeys(pattern.tags) })),
    [patterns],
  );

  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { keys } of keyedPatterns) {
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts]
      .filter(([, count]) => count >= MIN_PATTERNS_PER_FILTER && count < keyedPatterns.length * MAX_SHARE_PER_FILTER)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_FILTERS);
  }, [keyedPatterns]);

  const trimmedQuery = query.trim();
  const visible = useMemo(() => {
    const text = trimmedQuery.toLowerCase();
    const tagText = tagKey(trimmedQuery);
    return keyedPatterns
      .filter(({ pattern, keys }) => {
        const matchesFilter = !filter || keys.includes(filter);
        const matchesQuery = !text
          || [pattern.title, pattern.author].some((value) => value.toLowerCase().includes(text))
          || keys.some((key) => key.includes(tagText));
        return matchesFilter && matchesQuery;
      })
      .map(({ pattern }) => pattern);
  }, [filter, keyedPatterns, trimmedQuery]);

  const narrowed = Boolean(filter || trimmedQuery);
  const emptyHeading = filter && trimmedQuery
    ? `Nothing tagged ${filter} matches “${trimmedQuery}”.`
    : trimmedQuery
      ? `No patterns match “${trimmedQuery}”.`
      : `No patterns are tagged ${filter} yet.`;

  return (
    <>
      <div className="gallery-controls">
        {filters.length > 0 && (
          <div className="filter-list" role="group" aria-label="Filter patterns by tag">
            <button aria-pressed={!filter} className={!filter ? "active" : ""} onClick={() => setFilter(null)} type="button">
              All <span>{patterns.length}</span>
            </button>
            {filters.map(([key, count]) => (
              <button
                aria-pressed={filter === key}
                className={filter === key ? "active" : ""}
                key={key}
                onClick={() => setFilter(filter === key ? null : key)}
                type="button"
              >
                {key} <span>{count}</span>
              </button>
            ))}
          </div>
        )}
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search patterns by title, maker or tag</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, maker or tag" />
        </label>
      </div>
      <p className="gallery-count" role="status">
        {narrowed ? `${visible.length} of ${patterns.length} patterns` : `${patterns.length} patterns`}
      </p>
      {visible.length ? (
        <div className="pattern-grid gallery-grid">
          {visible.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} isModerator={isModerator} />)}
          {visible.length === 1 && (
            <article className="library-invitation gallery-invitation">
              <UploadCloud size={24} aria-hidden="true" />
              <h3>There is room for the next great signal.</h3>
              <p>Export a project from Design Studio and send it to the review bench. Once approved, its graph becomes a moving preview here.</p>
              <Link className="text-link" href="/upload">Upload a project <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{emptyHeading}</h2>
          <button className="text-link" type="button" onClick={() => { setFilter(null); setQuery(""); }}>Show all {patterns.length} patterns</button>
        </div>
      )}
    </>
  );
}
