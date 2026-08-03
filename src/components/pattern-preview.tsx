"use client";

import { Pause, Play, Radio, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Pattern } from "@/lib/patterns";

type PreviewVariant = "card" | "hero" | "detail";

type StudioNode = {
  data?: {
    label?: string;
    nodeType?: string;
    properties?: Record<string, unknown>;
  };
};

type ProjectProfile = {
  effect: string;
  nodeCount: number;
  patchCount: number;
  speed: number;
  sides: number;
  copies: number;
  rotationRate: number;
  fill?: string;
  edge?: string;
};

const defaultProfile: ProjectProfile = {
  effect: "Studio spectrum",
  nodeCount: 0,
  patchCount: 0,
  speed: 0.65,
  sides: 5,
  copies: 4,
  rotationRate: 80,
};

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readProject(project: unknown): ProjectProfile {
  if (!project || typeof project !== "object") return defaultProfile;
  const root = project as { graphData?: Record<string, { nodes?: StudioNode[]; edges?: unknown[] }> };
  const graphs = Object.values(root.graphData ?? {});
  const nodes = graphs.flatMap((graph) => graph.nodes ?? []);
  const edges = graphs.flatMap((graph) => graph.edges ?? []);
  const find = (type: string) => nodes.find((node) => node.data?.nodeType === type)?.data;
  const animartrix = find("Animartrix");
  const shape = find("Shape");
  const array = find("Array");
  const transform = find("Transform");

  return {
    effect: typeof animartrix?.properties?.effect === "string" ? animartrix.properties.effect : "Studio composition",
    nodeCount: nodes.length,
    patchCount: edges.length,
    speed: numberValue(animartrix?.properties?.speed, defaultProfile.speed),
    sides: Math.max(3, Math.round(numberValue(shape?.properties?.sides, defaultProfile.sides))),
    copies: Math.max(1, Math.round(numberValue(array?.properties?.count, defaultProfile.copies))),
    rotationRate: numberValue(transform?.properties?.rate, defaultProfile.rotationRate),
    fill: typeof shape?.properties?.fill === "string" ? shape.properties.fill : undefined,
    edge: typeof shape?.properties?.edge === "string" ? shape.properties.edge : undefined,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean;
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return [97, 228, 255];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mixColor(colors: [number, number, number][], progress: number, white: number) {
  const wrapped = ((progress % 1) + 1) % 1;
  const scaled = wrapped * colors.length;
  const start = Math.floor(scaled) % colors.length;
  const end = (start + 1) % colors.length;
  const blend = scaled - Math.floor(scaled);
  return colors[start].map((channel, index) => {
    const mixed = channel + (colors[end][index] - channel) * blend;
    return Math.round(mixed + (255 - mixed) * white);
  }) as [number, number, number];
}

function matrixSize(ledCount: number) {
  const square = Math.round(Math.sqrt(ledCount));
  if (square >= 8 && square <= 32 && square * square === ledCount) return square;
  return ledCount <= 144 ? 12 : 16;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const wave = (value: number) => 0.5 + 0.5 * Math.sin(value);
const screen = (a: number, b: number) => 1 - (1 - clamp01(a)) * (1 - clamp01(b));
const dodge = (a: number, b: number) => clamp01(a / Math.max(0.08, 1 - clamp01(b) * 0.86));

/*
 * Browser preview math stays aligned with Design Studio's AnimARTrix preview.
 * Visual mathematics adapted from AnimARTrix by Stefan Petrick.
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 */
function renderStudioEffect(effect: string, nx: number, ny: number, time: number, speed: number): [number, number, number] | null {
  const bass = 0.42 + wave(time * 1.7) * 0.36;
  const mids = 0.32 + wave(time * 1.13 + 1.7) * 0.35;
  const treble = 0.28 + wave(time * 2.31 + 3.2) * 0.32;
  const kick = Math.pow(wave(time * 3.25), 10);
  const snare = Math.pow(wave(time * 1.63 + 2.1), 13);
  const hihat = Math.pow(wave(time * 5.7 + 1.1), 15);
  const phase = time * Math.max(0.1, speed) * (0.45 + 0.35 * mids + 0.2 * treble) * Math.PI * 2;
  const radius = Math.hypot(nx, ny);
  const theta = Math.atan2(ny, nx);
  const vignette = clamp01(1.2 - radius * 0.72);
  const rgb = (red: number, green: number, blue: number): [number, number, number] => [
    Math.round(clamp01(red) * 255),
    Math.round(clamp01(green) * 255),
    Math.round(clamp01(blue) * 255),
  ];

  if (effect === "Polar Waves") {
    const pressure = radius * (9.5 - bass * 2.4) - phase * (2.2 + mids);
    const twist = theta * (3 + Math.round(snare * 3)) + kick * wave(radius * 18 - phase) * 1.8;
    return rgb(
      wave(pressure + twist + treble * Math.sin(theta * 11 + phase * 2)) * vignette,
      wave(pressure * 1.07 - twist * 0.72 + mids * 2.2) * vignette,
      wave(pressure * 1.19 + twist * 0.43 + hihat * Math.sin(radius * 36)) * vignette,
    );
  }
  if (effect === "RGB Blobs") {
    const wobble = 0.65 * Math.sin(radius * 5 - phase * 0.8) + kick * 0.9 * Math.sin(radius * 14 - phase * 2);
    const width = 2.5 + bass * 1.7;
    const red = Math.pow(wave(width * theta + phase * 1.13 + wobble), 1.35);
    const green = Math.pow(wave(width * theta - phase * 0.91 + wobble + 2.1 + mids), 1.35);
    const blue = Math.pow(wave(width * theta + phase * 0.67 - wobble + 4.2 + treble * 2), 1.35);
    const edge = clamp01(1.28 - radius * (0.63 - bass * 0.08));
    return rgb(red * edge, green * edge, blue * edge);
  }
  if (effect === "Spiralus") {
    const arms = 2 + Math.round(snare * 4);
    const spiral = arms * theta + radius * (10 + bass * 4) - phase * (2.1 + mids);
    const fine = treble * Math.sin(theta * 9 - radius * 22 + phase * 3);
    const a = wave(spiral + fine);
    const b = wave(spiral * 1.07 + 2.1 - kick * 2);
    const c = wave(-spiral * 0.83 + 4.2 + hihat * Math.sin(radius * 40));
    return rgb(screen(a * 0.8, b * 0.42) * vignette, Math.abs(a - b) * vignette, screen(c * 0.8, a * 0.28) * vignette);
  }
  if (effect === "Complex Kaleido") {
    const symmetry = 5 + Math.round(snare * 3);
    const folded = Math.acos(Math.cos(theta * symmetry));
    const a = wave(folded * 3 + radius * (8 - bass * 2) - phase * 2.1);
    const b = wave(folded * -4 + radius * 11 + phase * (1.4 + mids));
    const c = wave(folded * 5 - radius * 15 + phase * 0.73 + treble * Math.sin(radius * 30));
    const pulse = wave(radius * 13 - phase * 3 - kick * 2);
    return rgb(dodge(a, c * 0.64) * vignette, screen(b, pulse * 0.5) * vignette, screen(c, Math.abs(a - b)) * vignette);
  }
  if (effect === "Water") {
    const wx = nx + 0.18 * Math.sin(ny * 5 + phase * (0.8 + mids));
    const wy = ny + 0.18 * Math.cos(nx * 4.3 - phase * 0.67);
    const distance = Math.hypot(wx, wy) * (8.5 - bass * 1.6);
    const causticA = wave(distance * 1.9 - phase * 2.2 + Math.sin(theta * 4 + phase) * 1.4);
    const causticB = wave(distance * 2.43 + phase * 1.31 + Math.cos(theta * 5 - phase) * 1.1);
    const shock = wave(radius * 18 - phase * 3.4 - kick * 3);
    const shimmer = wave((wx - wy) * (18 + treble * 12) + phase * 4) * hihat;
    const water = screen(causticA * 0.7, causticB * 0.55);
    return rgb(
      (water * 0.2 + shock * kick * 0.2) * vignette,
      (water * 0.62 + shimmer * 0.18) * vignette,
      (water * 0.95 + shock * kick * 0.35 + shimmer * 0.25) * vignette,
    );
  }
  return null;
}

export function PatternPreview({
  pattern,
  variant = "card",
  controls = false,
}: {
  pattern: Pattern;
  variant?: PreviewVariant;
  controls?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileRef = useRef<ProjectProfile>(defaultProfile);
  const runningRef = useRef(true);
  const [running, setRunning] = useState(true);
  const [profile, setProfile] = useState<ProjectProfile>(defaultProfile);
  const [source, setSource] = useState(pattern.previewUrl ? "Reading project" : "Studio demo");

  useEffect(() => {
    let cancelled = false;
    if (!pattern.previewUrl) return;
    fetch(pattern.previewUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Preview source unavailable");
        return response.json();
      })
      .then((project) => {
        if (cancelled) return;
        const next = readProject(project);
        profileRef.current = next;
        setProfile(next);
        setSource("Project graph live");
      })
      .catch(() => {
        if (!cancelled) setSource("Generated fallback");
      });
    return () => { cancelled = true; };
  }, [pattern.previewUrl]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      runningRef.current = false;
      window.setTimeout(() => setRunning(false), 0);
    }

    let frame = 0;
    let width = 0;
    let height = 0;
    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, entry.contentRect.width);
      height = Math.max(1, entry.contentRect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(canvas);

    const baseColors = pattern.colors.map(hexToRgb);
    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      if (width === 0 || height === 0) return;
      const config = profileRef.current;
      const time = runningRef.current ? timestamp / 1000 : 0.75;
      const size = matrixSize(pattern.ledCount);
      const gap = variant === "card" ? 2.5 : 4;
      const cell = Math.min((width - gap * (size + 1)) / size, (height - gap * (size + 1)) / size);
      const boardWidth = cell * size + gap * (size - 1);
      const boardHeight = boardWidth;
      const left = (width - boardWidth) / 2;
      const top = (height - boardHeight) / 2;
      const speed = Math.max(0.1, config.speed);
      const pulse = 0.68 + Math.pow(Math.max(0, Math.sin(time * 3.25)), 9) * 0.32;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#05070b";
      context.fillRect(0, 0, width, height);

      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          const nx = (column / (size - 1)) * 2 - 1;
          const ny = (row / (size - 1)) * 2 - 1;
          const radius = Math.hypot(nx, ny);
          const angle = Math.atan2(ny, nx);
          const rotated = angle + time * (config.rotationRate / 360) * speed;
          const kaleido = Math.abs(Math.sin(rotated * config.sides + radius * (8 + config.copies) - time * 2.4 * speed));
          const interference = (Math.sin((nx + ny) * 8 - time * 2.1) + Math.cos((nx - ny) * 7 + time * 1.7)) * 0.25 + 0.5;
          const polygon = Math.cos(config.sides * rotated) * 0.12 + radius;
          const ring = Math.exp(-Math.pow(polygon - (0.42 + Math.sin(time * 1.3) * 0.08), 2) * 38);
          const core = Math.exp(-radius * radius * 4.2);
          const intensity = Math.min(1, Math.max(0.06, (kaleido * 0.48 + interference * 0.24 + ring * 0.38 + core * 0.3) * pulse));
          const colorProgress = angle / (Math.PI * 2) + radius * 0.33 - time * speed * 0.1;
          const studioColor = renderStudioEffect(config.effect, nx, ny, time, speed);
          const [red, green, blue] = studioColor ?? mixColor(baseColors, colorProgress, Math.max(0, core - 0.55));
          const x = left + column * (cell + gap);
          const y = top + row * (cell + gap);
          const dot = Math.max(1.5, cell * (0.52 + intensity * 0.42));

          context.beginPath();
          context.arc(x + cell / 2, y + cell / 2, Math.max(1, cell * 0.43), 0, Math.PI * 2);
          context.fillStyle = "#10161e";
          context.fill();

          context.save();
          const studioBrightness = studioColor ? Math.max(...studioColor) / 255 : intensity;
          context.globalAlpha = 0.22 + Math.max(intensity * 0.38, studioBrightness * 0.78);
          context.shadowBlur = variant === "card" ? 7 : 13;
          context.shadowColor = `rgb(${red} ${green} ${blue})`;
          context.beginPath();
          context.arc(x + cell / 2, y + cell / 2, dot / 2, 0, Math.PI * 2);
          context.fillStyle = `rgb(${red} ${green} ${blue})`;
          context.fill();
          context.restore();
        }
      }
    };
    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [pattern.colors, pattern.ledCount, variant]);

  return (
    <div className={`live-preview live-preview-${variant}`}>
      <div className="live-preview-bar">
        <span><i /> Live pattern preview</span>
        <strong>{source}</strong>
      </div>
      <div className="live-preview-screen">
        <canvas ref={canvasRef} role="img" aria-label={`Animated browser preview of ${pattern.title}`} />
        <div className="preview-scanline" aria-hidden="true" />
        {controls && (
          <button
            className="preview-transport"
            type="button"
            onClick={() => setRunning((value) => !value)}
            aria-label={running ? "Pause animated preview" : "Play animated preview"}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Play"}
          </button>
        )}
      </div>
      <div className="live-preview-readout">
        <span><Sparkles size={11} /> {profile.effect}</span>
        <span>{profile.nodeCount ? `${profile.nodeCount} nodes · ${profile.patchCount} patches` : `${matrixSize(pattern.ledCount)}×${matrixSize(pattern.ledCount)} matrix`}</span>
        <span><Radio size={11} /> Browser render</span>
      </div>
    </div>
  );
}
