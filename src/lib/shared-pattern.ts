export type SharedSubgraph = {
  nodes: unknown[];
  edges: unknown[];
};

export type SharedPattern = {
  name?: string;
  subgraph: SharedSubgraph;
};

export function sharedPatternGraph(value: unknown): SharedSubgraph | null {
  if (!value || typeof value !== "object") return null;
  const subgraph = (value as { subgraph?: unknown }).subgraph;
  if (!subgraph || typeof subgraph !== "object") return null;
  const { nodes, edges } = subgraph as { nodes?: unknown; edges?: unknown };
  return Array.isArray(nodes) && Array.isArray(edges) ? { nodes, edges } : null;
}

export function isSharedPattern(value: unknown): boolean {
  return sharedPatternGraph(value) !== null;
}

export function sharedPatternName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
