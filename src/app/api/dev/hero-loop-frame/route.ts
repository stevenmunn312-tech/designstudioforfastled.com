import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";

// Dev-only sink for the hero-loop renderer's PNG sequence. Exists so the tool
// does not need showDirectoryPicker(), which is Chrome/Edge-only and puts a
// native dialog in the middle of an otherwise unattended 240-frame render.
//
// Frames land in the OS temp dir rather than the repo: they are a ~50MB
// intermediate that only ffmpeg consumes, and nothing should be able to
// mistake them for a tracked asset. See docs/devel/hero-loop-render.md.

export const runtime = "nodejs";

const FRAME_DIR = join(tmpdir(), "hero-loop-frames");

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return null;
}

/** Report where frames land, so the operator can point ffmpeg at it. */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  return NextResponse.json({ dir: FRAME_DIR });
}

/** Clear the directory before a run, so a shorter render cannot leave stale
 *  frames behind for ffmpeg to pick up as part of the sequence. */
export async function DELETE() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await rm(FRAME_DIR, { recursive: true, force: true });
  await mkdir(FRAME_DIR, { recursive: true });
  return NextResponse.json({ dir: FRAME_DIR, cleared: true });
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const raw = new URL(request.url).searchParams.get("index");
  const index = Number(raw);
  // The filename is built from client input, so it has to be an integer and
  // nothing else — no traversal, no extension games.
  if (!Number.isInteger(index) || index < 0 || index > 99999) {
    return NextResponse.json({ error: "index must be an integer 0–99999" }, { status: 400 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }

  await mkdir(FRAME_DIR, { recursive: true });
  const name = `frame-${String(index).padStart(4, "0")}.png`;
  await writeFile(join(FRAME_DIR, name), body);
  return NextResponse.json({ written: name });
}
