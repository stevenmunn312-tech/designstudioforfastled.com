"use client";

import Link from "next/link";
import { ArrowRight, Search, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { PatternCard } from "./pattern-card";

const filters = ["All", "Ambient", "Matrix", "Audio", "Reactive", "Utility"];

export function PatternGallery({ patterns, isModerator = false }: { patterns: Pattern[]; isModerator?: boolean }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return patterns.filter((pattern) => {
      const matchesFilter = filter === "All" || pattern.tags.includes(filter);
      const matchesQuery = !normalized || [pattern.title, pattern.author, ...pattern.tags]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesFilter && matchesQuery;
    });
  }, [filter, patterns, query]);

  return (
    <>
      <div className="gallery-controls">
        <div className="filter-list" aria-label="Filter patterns">
          {filters.map((item) => (
            <button
              className={filter === item ? "active" : ""}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search patterns</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patterns" />
        </label>
      </div>
      {visible.length ? (
        <div className="pattern-grid gallery-grid">
          {visible.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} isModerator={isModerator} />)}
          {visible.length === 1 && (
            <article className="library-invitation gallery-invitation">
              <UploadCloud size={24} />
              <span>Community library</span>
              <h3>There is room for the next great signal.</h3>
              <p>Export a project from Design Studio and send it to the review bench. Once approved, its graph becomes a moving preview here.</p>
              <Link href="/upload">Upload a project <ArrowRight size={14} /></Link>
            </article>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <span>No signal</span>
          <h2>No patterns match that search.</h2>
          <button type="button" onClick={() => { setFilter("All"); setQuery(""); }}>Clear filters</button>
        </div>
      )}
    </>
  );
}
