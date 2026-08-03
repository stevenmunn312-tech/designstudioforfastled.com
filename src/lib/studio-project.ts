export type StudioWorkspace = {
  nodes?: unknown[];
  edges?: unknown[];
  graphData?: Record<string, { nodes?: unknown[]; edges?: unknown[] }>;
  graphs?: unknown;
  activeGraphId?: unknown;
};

export function studioWorkspace(value: unknown): StudioWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as StudioWorkspace & { workspace?: unknown };
  const workspace = candidate.workspace && typeof candidate.workspace === "object"
    ? candidate.workspace as StudioWorkspace
    : candidate;
  return Array.isArray(workspace.nodes) && Array.isArray(workspace.edges) ? workspace : null;
}

export function isStudioProject(value: unknown): boolean {
  const workspace = studioWorkspace(value);
  return Boolean(
    workspace
    && workspace.graphData
    && workspace.graphs
    && typeof workspace.activeGraphId === "string",
  );
}

export function studioProjectName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const name = (value as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
