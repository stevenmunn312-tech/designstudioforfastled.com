// Dev-only guard against a Chromium compositor-memory footgun: a CSS `filter`
// or `backdrop-filter` over content that changes every frame makes the
// compositor re-rasterise the filtered layer on every change and leak the GPU
// filter buffer — unbounded growth that climbs to multiple GB and crashes the
// tab. It is invisible to every JS metric (usedJSHeapSize, canvas/texture
// counts all stay flat), so it only shows up in the browser's per-tab memory.
//
// Ported from the app's src/dev/animationFilterGuard.ts, which cost a very long
// hunt to write, with a third shape added: an element *stacked over* a live
// canvas. The app's version only looked at filters on the animated/canvas
// element itself, so it would not have caught this site's `.preview-transport`
// chip sitting on top of the live pattern canvas.

export interface AnimationFilterLeak {
  source: string;
  element: string;
  filter: string;
}

function elementLabel(el: Element): string {
  const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
  return `${el.tagName.toLowerCase()}${cls ? `.${cls.split(" ")[0]}` : ""}`;
}

function cssFilter(style: CSSStyleDeclaration): string {
  return style.filter && style.filter !== "none"
    ? style.filter
    : style.backdropFilter && style.backdropFilter !== "none"
      ? `backdrop-filter: ${style.backdropFilter}`
      : "";
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Every element carrying a CSS filter over per-frame content. Three shapes:
 *  (1) an infinitely-animated element with a filter, (2) a <canvas> with a
 *  filter (redrawn from JS, so no CSS animation to find), and (3) an element
 *  with a filter/backdrop-filter overlapping a <canvas> — its backdrop is the
 *  per-frame content. Reads computed style and layout only, so it works in a
 *  hidden tab. Exposed on `window.__scanAnimFilters()` in dev. */
export function findAnimationFilterLeaks(): AnimationFilterLeak[] {
  if (typeof document === "undefined") return [];
  const seen = new Set<string>();
  const leaks: AnimationFilterLeak[] = [];
  const add = (key: string, leak: AnimationFilterLeak) => {
    if (seen.has(key)) return;
    seen.add(key);
    leaks.push(leak);
  };

  // Shape 1: infinitely-animated element + filter.
  if (typeof document.getAnimations === "function") {
    for (const anim of document.getAnimations()) {
      const effect = anim.effect;
      if (!(effect instanceof KeyframeEffect)) continue;
      const target = effect.target;
      if (!(target instanceof Element)) continue;
      if (effect.getTiming().iterations !== Infinity) continue;
      const filter = cssFilter(getComputedStyle(target));
      if (!filter) continue;
      const name = anim instanceof CSSAnimation ? anim.animationName : anim.id || "(unnamed)";
      add(`anim|${name}|${elementLabel(target)}`, {
        source: `animation:${name}`,
        element: elementLabel(target),
        filter: filter.slice(0, 80),
      });
    }
  }

  const canvases = [...document.querySelectorAll("canvas")];

  // Shape 2: a <canvas> with a filter.
  for (const canvas of canvases) {
    const filter = cssFilter(getComputedStyle(canvas));
    if (!filter) continue;
    add(`canvas|${elementLabel(canvas)}`, {
      source: "canvas",
      element: elementLabel(canvas),
      filter: filter.slice(0, 80),
    });
  }

  // Shape 3: a filtered element stacked over a <canvas>.
  if (canvases.length > 0) {
    const canvasRects = canvases.map((canvas) => canvas.getBoundingClientRect());
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      if (el.tagName === "CANVAS") continue;
      const filter = cssFilter(getComputedStyle(el));
      if (!filter) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const hit = canvasRects.findIndex((canvasRect) => overlaps(rect, canvasRect));
      if (hit === -1) continue;
      add(`over|${elementLabel(el)}`, {
        source: `over ${elementLabel(canvases[hit])}`,
        element: elementLabel(el),
        filter: filter.slice(0, 80),
      });
    }
  }

  return leaks;
}

function warnOnAnimationFilterLeaks(): void {
  const leaks = findAnimationFilterLeaks();
  if (leaks.length === 0) return;
  console.warn(
    `[anim-filter-guard] ${leaks.length} element(s) carry a CSS filter over per-frame content — ` +
      `this leaks compositor memory unbounded in Chromium (grows to multiple GB and crashes the tab; ` +
      `invisible to JS heap metrics). Remove the filter, or move it to a static element that is not ` +
      `animated and does not sit over a live canvas.`,
    leaks,
  );
}

/** Idempotent: safe to call from every canvas mount. */
export function installAnimationFilterGuard(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __scanAnimFilters?: typeof findAnimationFilterLeaks;
  };
  if (w.__scanAnimFilters) return;
  w.__scanAnimFilters = findAnimationFilterLeaks;
  // Scan once the preview has actually mounted and laid out, then again later
  // in case a gate/panel appeared over the canvas after startup.
  window.setTimeout(warnOnAnimationFilterLeaks, 4000);
  window.setTimeout(warnOnAnimationFilterLeaks, 15000);
}
