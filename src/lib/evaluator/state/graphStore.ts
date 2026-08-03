import type { NodeCategory } from '../types'

// Site-side stand-in for the app's graphStore.ts — only the plain data shapes
// graphEvaluator.ts needs, not the zustand canvas-editing store itself (no
// node-editor UI runs on the community site).
export interface StudioNodeData extends Record<string, unknown> {
  label: string
  nodeType: string
  category: NodeCategory
  properties: Record<string, unknown>
}

export interface StudioNode {
  id: string
  data: StudioNodeData
  position?: { x: number; y: number }
  type?: string
  [key: string]: unknown
}

export interface StudioEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  [key: string]: unknown
}
