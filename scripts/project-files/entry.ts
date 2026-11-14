// Bundled and run by build.mjs. Builds every example project's graph with the
// app's own modules, checks it the way the app's Upload tab would, and writes
// one project file per project.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NODE_LIBRARY, portColor, portsCompatible, propertyMeta } from '@app/state/nodeLibrary'
import { resolveDefaultProperties } from '@app/state/nodeDefaults'
import { buttonBankOutputs } from '@app/state/player/buttonBank'
import { boardProfileById } from '@app/build/boards/boardProfiles'
import { retargetHardwarePins } from '@app/build/pins/pinRetarget'
import { estimatePowerLoad, validateGraph } from '@app/utils/validateGraph'
import { generateCpp } from '@app/codegen/cppGenerator'
import { partDerivedInputs } from '@app/build/parts/partPorts'
import { buildHardwareManifest } from '@app/build/hardwareManifest'
import { calculateElectricalPlan, planProblems } from '@app/build/power/electricalPlan'
import { ensureBuildProfile } from '@app/build/buildProfile'
import { parseProjectFile, serializeProject } from '@app/utils/projectFileIO'
import { getGroupRegistry, useGraphStore, type StudioEdge, type StudioNode } from '@app/state/graphStore'
import { AUDIO_BUNDLED_PATTERNS } from '@app/state/patterns/bundledPatterns'
import { patternFormTags } from '@app/state/patterns/patternTags'
import { projects } from '@/lib/projects'
import { PROJECT_GRAPHS, type ProjectGraph } from './graphs'

const outDir = process.argv[2]
const LIBRARY = new Map(NODE_LIBRARY.map((def) => [def.type, def]))
const COL_W = 260
const ROW_H = 180
/** Example files are fixed content, so their timestamps are too: re-running
 *  the build only changes a file when its graph changes. */
const STAMP = Date.UTC(2026, 10, 15)
/** Parts the app keeps off the canvas: a microphone is read through Audio. */
const HIDDEN = new Set(['MicInput', 'LineInput'])

function fail(slug: string, message: string): never {
  throw new Error(`${slug}: ${message}`)
}

function buildNodes(slug: string, graph: ProjectGraph, boardId: string): StudioNode[] {
  const profile = boardProfileById(boardId) ?? fail(slug, `unknown board ${boardId}`)
  return graph.nodes.map((spec) => {
    const def = LIBRARY.get(spec.type) ?? fail(slug, `unknown node type ${spec.type}`)
    const defaults = resolveDefaultProperties(def.type, def.defaultProperties, profile)
    for (const [key, value] of Object.entries(spec.properties ?? {})) {
      if (!(key in defaults) && def.type !== 'Comment') fail(slug, `${spec.id}: ${def.type} has no property ${key}`)
      const meta = propertyMeta(def.type, key) as { options?: readonly string[] } | undefined
      if (meta?.options && typeof value === 'string' && !meta.options.includes(value)) {
        fail(slug, `${spec.id}: ${key} "${value}" is not one of ${meta.options.join(', ')}`)
      }
    }
    const properties = Object.fromEntries(Object.entries({ ...defaults, ...spec.properties }).map(([key, value]) => [
      key,
      // "$id" names another node in this graph, as an Audio node's source does.
      typeof value === 'string' && value.startsWith('$') ? value.slice(1) : value,
    ]))
    const hidden = HIDDEN.has(def.type)
    return {
      id: spec.id,
      type: 'studioNode',
      position: { x: spec.col * COL_W, y: (spec.row ?? 0) * ROW_H },
      ...(hidden ? { hidden: true, selectable: false, draggable: false } : {}),
      data: {
        label: spec.label ?? def.label,
        nodeType: def.type,
        category: def.category,
        properties,
        // A relay or switch module grows one input per channel its part has.
        inputs: partDerivedInputs(def.type, properties.partId, properties) ?? def.inputs,
        outputs: def.type === 'ButtonBank' ? buttonBankOutputs(properties.buttons) : def.outputs,
      },
    } as StudioNode
  })
}

function buildEdges(slug: string, graph: ProjectGraph, nodes: StudioNode[]): StudioEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const port = (ref: string, side: 'inputs' | 'outputs') => {
    const [id, handle] = ref.split('.')
    const node = byId.get(id) ?? fail(slug, `wire names unknown node ${id}`)
    const ports = node.data[side] as { id: string; dataType: string }[]
    const found = ports.find((p) => p.id === handle)
      ?? fail(slug, `${id} (${String(node.data.nodeType)}) has no ${side === 'inputs' ? 'input' : 'output'} ${handle}; it has ${ports.map((p) => p.id).join(', ')}`)
    return { id, handle, dataType: found.dataType }
  }
  const seenTargets = new Set<string>()
  return graph.wires.map((wire) => {
    const [from, to] = wire.split('->').map((part) => part.trim())
    const src = port(from, 'outputs')
    const dst = port(to, 'inputs')
    if (!portsCompatible(src.dataType, dst.dataType)) fail(slug, `${wire}: ${src.dataType} cannot drive ${dst.dataType}`)
    if (seenTargets.has(to)) fail(slug, `${to} has two wires`)
    seenTargets.add(to)
    return {
      id: `e-${src.id}-${dst.id}-${src.handle}-${dst.handle}`,
      source: src.id,
      sourceHandle: src.handle,
      target: dst.id,
      targetHandle: dst.handle,
      type: 'glowEdge',
      reconnectable: 'target',
      style: { stroke: portColor(src.dataType) },
    } as StudioEdge
  })
}

/** The audio-reactive built-in patterns made for an output form, as many as a
 *  show starter opens with. */
function showPatternsFor(form: 'string' | 'matrix') {
  return AUDIO_BUNDLED_PATTERNS.filter((pattern) => patternFormTags(pattern.bestOn).includes(form)).slice(0, 8)
}

function buildProject(slug: string, name: string, graph: ProjectGraph) {
  const boardId = graph.board ?? 'espressif-esp32-s3-devkitc-1'
  const profile = boardProfileById(boardId)!
  const fqbn = profile.compatibleFqbns[0]
  const boardSpec = { id: 'board', type: 'Board', col: -1, row: 0, properties: { profileId: boardId, brightness: graph.brightness ?? 128 } }
  const specs = { ...graph, nodes: [...graph.nodes, boardSpec] }
  const authored = buildNodes(slug, specs, boardId)
  const builtEdges = buildEdges(slug, graph, authored)
  let nodes = retargetHardwarePins(authored, profile, fqbn).nodes
  let edges = builtEdges
  // Cap the LEDs at their full-white draw, as the app's starters do, so the
  // first upload is electrically safe on the supply the parts list names. A
  // battery build sets its own lower cap; FastLED dims to stay inside it.
  const estimate = estimatePowerLoad(nodes)
  if (estimate) {
    const milliamps = graph.powerCapMa ?? estimate.recommendedMa
    nodes = nodes.map((node) => node.data.nodeType === 'Board'
      ? { ...node, data: { ...node.data, properties: { ...node.data.properties, powerLimit: true, milliamps } } }
      : node)
  }
  const power = estimatePowerLoad(nodes)

  // A show's Pattern Collection opens filled, the way the app's show starters
  // fill theirs: each pattern is copied in as its own subgraph, so the graph
  // goes through the app's store to do it.
  let extras: Record<string, unknown> = {}
  let groups: ReturnType<typeof getGroupRegistry> = {}
  if (graph.showPatterns) {
    const store = useGraphStore.getState()
    store.loadGraph(nodes, edges)
    const collection = nodes.find((node) => node.data.nodeType === 'PatternCollection') ?? fail(slug, 'showPatterns needs a Pattern Collection')
    useGraphStore.getState().addPatternsToCollection(collection.id, showPatternsFor(graph.showPatterns))
    const state = useGraphStore.getState()
    nodes = state.nodes
    edges = state.edges
    extras = { graphData: state.graphData, graphs: state.graphs, activeGraphId: state.activeGraphId }
    groups = getGroupRegistry(state)
  }

  const { errors, warnings } = validateGraph(nodes, edges, fqbn, undefined, groups)
  if (errors.length) fail(slug, `the app would refuse to build it:\n  ${errors.join('\n  ')}`)
  try {
    generateCpp(nodes, edges, groups)
  } catch (error) {
    fail(slug, `code generation failed: ${(error as Error).message}`)
  }

  // The Build Diagram's electrical plan: a project whose wiring or power the
  // Build Diagram would block is not ready to follow.
  const plan = calculateElectricalPlan(buildHardwareManifest(nodes, edges, fqbn), ensureBuildProfile(undefined), profile)
  const blockers = planProblems(plan)
  const describe = (issue: { title: string; detail: string }) => `${issue.title}: ${issue.detail}`
  if (blockers.length) fail(slug, `the Build Diagram blocks it:\n  ${blockers.map(describe).join('\n  ')}`)
  warnings.push(...plan.warnings.map((issue) => `build: ${describe(issue)}`))

  const project = {
    id: `example-${slug}`,
    name,
    createdAt: STAMP,
    updatedAt: STAMP,
    workspace: { nodes, edges, ...extras },
  }
  const text = serializeProject(project as never)
  const reopened = parseProjectFile(text, name)
  if (reopened.dropped) fail(slug, `${reopened.dropped} nodes or wires do not survive opening the file`)
  const supply = power ? `${power.ledCount} LEDs, cap ${power.configuredMa} mA, supply ${power.requiredSupplyMa} mA / ${power.requiredSupplyWattage} W at ${power.supplyVolts} V` : 'no LEDs'
  return { text, warnings, supply }
}

mkdirSync(outDir, { recursive: true })
for (const file of readdirSync(outDir)) rmSync(join(outDir, file))
for (const project of projects) {
  const graph = PROJECT_GRAPHS[project.slug] ?? fail(project.slug, 'no graph in scripts/project-files/graphs.ts')
  const { text, warnings, supply } = buildProject(project.slug, project.title, graph)
  writeFileSync(join(outDir, `${project.slug}.fastled-project.json`), `${text}\n`)
  console.log(`${project.slug} (${supply})${warnings.length ? `\n  warn: ${warnings.join('\n  warn: ')}` : ''}`)
}
const extra = Object.keys(PROJECT_GRAPHS).filter((slug) => !projects.some((project) => project.slug === slug))
if (extra.length) throw new Error(`Graphs with no project page: ${extra.join(', ')}`)
console.log(`${projects.length} project files → ${outDir}`)
