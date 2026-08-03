import { evaluateGraph, type Frame, type GroupRegistry, type AudioOverride } from "./state/graphEvaluator";
import type { StudioNode, StudioEdge } from "./state/graphStore";

// Custom Formula / Field Formula compile through a restricted expression
// parser (formulaLang.ts) that structurally cannot reach globalThis, fetch,
// or the DOM. Code is genuine arbitrary JavaScript, isolated in a Web Worker
// (codeSandbox.worker.ts). Either way, the site must never auto-execute any
// of the three for a public, anonymous upload — the app's own model requires
// an explicit local "Trust and run" before running untrusted content, and a
// community gallery has no equivalent trust relationship by default.
const UNTRUSTED_NODE_TYPES = new Set(["CustomFormula", "FieldFormula", "Code"]);

function nodeTypesOf(nodes: StudioNode[]): Iterable<string> {
  return nodes.map((node) => node.data?.nodeType ?? "");
}

/** Whether this pattern (including any nested group subgraphs) contains a
 *  node type that runs user-authored code/expressions. If true, evaluation
 *  must not proceed with `trusted: true` until the visitor has explicitly
 *  opted in for this specific pattern. */
export function patternNeedsTrust(nodes: StudioNode[], groups: GroupRegistry = {}): boolean {
  for (const type of nodeTypesOf(nodes)) {
    if (UNTRUSTED_NODE_TYPES.has(type)) return true;
  }
  for (const group of Object.values(groups)) {
    for (const type of nodeTypesOf(group.nodes)) {
      if (UNTRUSTED_NODE_TYPES.has(type)) return true;
    }
  }
  return false;
}

export interface EvaluateSharedPatternOptions {
  groups?: GroupRegistry;
  audioOverride?: AudioOverride | null;
  /**
   * Must only be `true` after an explicit, per-pattern, visitor-initiated
   * "Trust and run" action. NEVER default this to true and never derive it
   * from anything but a real click — see patternNeedsTrust(). Omitted/false
   * means Custom Formula/Field Formula/Code nodes render a blank frame
   * instead of executing, exactly like the app's own untrusted path.
   */
  trusted?: boolean;
}

/**
 * Safe-by-default entry point for evaluating a shared pattern on the
 * community site. Unlike graphEvaluator's own `evaluateGraph` (whose
 * `trusted` parameter defaults to `true`, correct for the app's own local
 * content but wrong here), this defaults to `false` — the caller must
 * explicitly opt in, and only ever after real visitor consent.
 */
export function evaluateSharedPattern(
  nodes: StudioNode[],
  edges: StudioEdge[],
  tick: number,
  gridW: number,
  gridH: number,
  options: EvaluateSharedPatternOptions = {},
): Frame | null {
  return evaluateGraph(
    nodes,
    edges,
    tick,
    gridW,
    gridH,
    options.groups ?? {},
    "",
    new Set(),
    {},
    options.audioOverride ?? null,
    options.trusted === true,
  );
}
