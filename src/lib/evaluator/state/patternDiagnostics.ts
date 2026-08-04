import type { StudioNode, StudioEdge } from "./graphStore";
import { evaluateScalarExpression } from "./scalarExpression";
import { supportsScalarExpression } from "./nodeLibrary";
import { isValidRtcDateTime } from "./rtc";

// Site-side stand-in for the app's buildGraphDiagnostics (validateGraph.ts).
// A shared pattern is always a Group subgraph — it never carries a
// MatrixOutput, GPIO pins, board/network config, or show-engine nodes, so
// the app's pin/power/RAM/board/DMX/schedule/show-engine diagnostic
// categories can never fire here and are intentionally not ported. This
// covers only what a pure signal-graph subgraph can actually trigger:
// terminal wiring, scalar expressions, a couple of pattern-specific node
// warnings, and disconnected nodes.

export type GraphDiagnosticSeverity = "error" | "warning";
export type GraphDiagnosticCategory = "connection" | "expression" | "preview";

export interface GraphDiagnostic {
  id: string;
  severity: GraphDiagnosticSeverity;
  category: GraphDiagnosticCategory;
  title: string;
  message: string;
  nodeIds: string[];
}

const PREVIEW_ONLY_NODE_TYPES: ReadonlySet<string> = new Set(["MidiInput"]);

function nodeLabel(node: StudioNode): string {
  return String(node.data.label ?? node.data.nodeType);
}

/**
 * Diagnostics for a standalone pattern subgraph rendered with a known,
 * fixed grid size (unlike the app, the site never derives width/height from
 * a MatrixOutput node — it always knows the capture grid up front).
 */
export function buildPatternDiagnostics(
  nodes: StudioNode[],
  edges: StudioEdge[],
  gridW: number,
  gridH: number,
): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];

  if (nodes.length === 0) {
    diagnostics.push({
      id: "graph-empty",
      severity: "error",
      category: "connection",
      title: "Canvas is empty",
      message: "There is no signal path to render.",
      nodeIds: [],
    });
    return diagnostics;
  }

  const incoming = new Set(
    edges.filter((edge) => edge.target && edge.targetHandle).map((edge) => `${edge.target}:${edge.targetHandle}`),
  );

  const terminals = nodes.filter((node) => node.data.nodeType === "GroupOutput");
  if (terminals.length === 0) {
    diagnostics.push({
      id: "missing-GroupOutput",
      severity: "error",
      category: "connection",
      title: "Group Output is missing",
      message: "This pattern has no terminal for its rendered frame.",
      nodeIds: [],
    });
  } else {
    for (const candidate of terminals) {
      if (incoming.has(`${candidate.id}:frame`)) continue;
      diagnostics.push({
        id: `${candidate.id}-input`,
        severity: "error",
        category: "connection",
        title: "Group Output has no input",
        message: "Nothing is connected to the group frame terminal.",
        nodeIds: [candidate.id],
      });
    }
  }

  for (const node of nodes) {
    const props = node.data.properties;
    for (const [key, value] of Object.entries(props)) {
      if (
        typeof value === "string" &&
        supportsScalarExpression(node.data.nodeType, key) &&
        evaluateScalarExpression(value, gridW, gridH) == null
      ) {
        diagnostics.push({
          id: `${node.id}-expression-${key}`,
          severity: "error",
          category: "expression",
          title: `${nodeLabel(node)} has an invalid expression`,
          message: `${key}: ${value || "(empty)"}`,
          nodeIds: [node.id],
        });
      }
    }
  }

  for (const node of nodes) {
    if (node.data.nodeType !== "RTCInput") continue;
    const props = node.data.properties;
    if (String(props.timeSource ?? "Compile Time") !== "Manual") continue;
    if (
      isValidRtcDateTime({
        year: Number(props.startYear ?? 0),
        month: Number(props.startMonth ?? 0),
        day: Number(props.startDay ?? 0),
        hour: Number(props.startHour ?? 0),
        minute: Number(props.startMinute ?? 0),
        second: Number(props.startSecond ?? 0),
      })
    ) {
      continue;
    }
    diagnostics.push({
      id: `${node.id}-rtc-manual-start`,
      severity: "warning",
      category: "preview",
      title: `${nodeLabel(node)} has an invalid manual clock start`,
      message: "The manual year, month, day, hour, minute, and second don't form a real calendar time.",
      nodeIds: [node.id],
    });
  }

  for (const node of nodes) {
    if (node.data.nodeType !== "ClockDisplay") continue;
    const mode = String(node.data.properties.displayMode ?? "Digital HH:MM");
    if (mode === "Stopwatch" || mode === "Timer") continue;
    if (edges.some((edge) => edge.target === node.id && edge.targetHandle === "secondsOfDay")) continue;
    diagnostics.push({
      id: `${node.id}-clock-no-time`,
      severity: "warning",
      category: "connection",
      title: `${nodeLabel(node)} has no clock wired`,
      message: "Preview falls back to this browser's clock; without an RTC Clock input, deployed firmware would show \"--:--\".",
      nodeIds: [node.id],
    });
  }

  for (const node of nodes) {
    if (!PREVIEW_ONLY_NODE_TYPES.has(node.data.nodeType) || !edges.some((edge) => edge.source === node.id)) continue;
    diagnostics.push({
      id: `${node.id}-preview-only`,
      severity: "warning",
      category: "preview",
      title: `${nodeLabel(node)} works only in preview`,
      message: "This node's live browser input has no hardware equivalent.",
      nodeIds: [node.id],
    });
  }

  for (const node of nodes) {
    if (
      node.data.nodeType === "GroupOutput" ||
      node.data.nodeType === "Comment" ||
      edges.some((edge) => edge.source === node.id || edge.target === node.id)
    ) {
      continue;
    }
    diagnostics.push({
      id: `${node.id}-disconnected`,
      severity: "warning",
      category: "connection",
      title: `${nodeLabel(node)} is disconnected`,
      message: "This node does not send or receive any signal.",
      nodeIds: [node.id],
    });
  }

  return diagnostics;
}
