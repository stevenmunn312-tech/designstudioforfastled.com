"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { PatternCard } from "./pattern-card";

const filters = ["All", "Ambient", "Matrix", "Audio", "Reactive", "Utility"];

export function PatternGallery({ patterns }: { patterns: Pattern[] }) {
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
          {visible.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} />)}
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
