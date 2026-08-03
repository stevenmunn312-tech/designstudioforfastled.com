export type SharedSubgraph = {
  nodes: unknown[];
  edges: unknown[];
};

export type SharedPattern = {
  name?: string;
  subgraph: SharedSubgraph;
};

type LegacyWorkspace = {
  nodes?: unknown[];
  edges?: unknown[];
  graphData?: Record<string, { nodes?: unknown[]; edges?: unknown[] }>;
  graphs?: unknown;
  activeGraphId?: unknown;
};

/**
 * Pre-migration whole-project export (graphData/graphs/activeGraphId), from
 * before sharing switched to the single hardware-agnostic {name, subgraph}
 * shape. Kept only so patterns already uploaded in that shape (e.g. the first
 * "Psydance" upload) keep rendering — flattens every graph's nodes/edges into
 * one subgraph, same as the old renderer did.
 */
function legacyWorkspaceGraph(value: unknown): SharedSubgraph | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as LegacyWorkspace & { workspace?: unknown };
  const workspace = candidate.workspace && typeof candidate.workspace === "object"
    ? (candidate.workspace as LegacyWorkspace)
    : candidate;
  if (!workspace.graphData || !workspace.graphs || typeof workspace.activeGraphId !== "string") return null;
  const graphs = Object.values(workspace.graphData);
  return {
    nodes: graphs.flatMap((graph) => graph.nodes ?? []),
    edges: graphs.flatMap((graph) => graph.edges ?? []),
  };
}

export function sharedPatternGraph(value: unknown): SharedSubgraph | null {
  if (!value || typeof value !== "object") return null;
  const subgraph = (value as { subgraph?: unknown }).subgraph;
  if (subgraph && typeof subgraph === "object") {
    const { nodes, edges } = subgraph as { nodes?: unknown; edges?: unknown };
    if (Array.isArray(nodes) && Array.isArray(edges)) return { nodes, edges };
  }
  return legacyWorkspaceGraph(value);
}

export function isSharedPattern(value: unknown): boolean {
  return sharedPatternGraph(value) !== null;
}

export function sharedPatternName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
