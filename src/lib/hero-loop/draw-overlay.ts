import {
  COUNT_MAX,
  COUNT_MIN,
  GRID,
  SPEED_SLIDER,
  countAt,
  sliderValueAt,
} from "./juggle-loop";

// The chrome drawn around the LED grid: a Juggle node card whose Count handle
// is dragged across the lap. Rendering it into the same canvas as the LEDs (as
// opposed to overlaying animated DOM on a <video>) is what keeps the handle and
// the matrix in lockstep — a CSS animation and a looping <video> drift apart
// within a minute unless the animation is slaved to video.currentTime.
//
// Palette is lifted from globals.css so the clip sits in the page rather than
// on top of it.

const INK = "#080b10";
const BOARD = "#101722";
const BOARD_2 = "#151f2c";
const CLOUD = "#e7eff8";
const MUTED = "#8995a6";
const LINE = "#26303d";
const CYAN = "#61e4ff";
const VIOLET = "#876bff";

export const CANVAS_W = 1440;
export const CANVAS_H = 900;

/** Screen pixels per LED. GRID * LED_SCALE is the WebGL canvas size. */
export const LED_SCALE = 18;

const LED_SIZE = GRID * LED_SCALE; // 576
const LED_X = CANVAS_W - 96 - LED_SIZE;
const LED_Y = Math.round((CANVAS_H - LED_SIZE) / 2);

const CARD_X = 96;
const CARD_W = 560;
const CARD_H = 384;
const CARD_Y = Math.round((CANVAS_H - CARD_H) / 2);

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Where the LED grid goes. The compositor drawImage()s the WebGL canvas here. */
export const LED_RECT = { x: LED_X, y: LED_Y, size: LED_SIZE } as const;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Faint patch-canvas grid, so the card reads as sitting on the editor.
  ctx.strokeStyle = "rgba(38, 48, 61, 0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= CANVAS_W; x += 48) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CANVAS_H);
  }
  for (let y = 0; y <= CANVAS_H; y += 48) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(CANVAS_W, y + 0.5);
  }
  ctx.stroke();
}

/**
 * One slider row. `fill` is the 0–1 track fill; `label`/`readout` are the two
 * text ends. `live` brightens the handle and adds its glow — used to say which
 * control is being dragged.
 */
function drawSlider(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    w: number;
    label: string;
    readout: string;
    fill: number;
    live: boolean;
    stops?: number;
  },
) {
  const { x, y, w, label, readout, fill, live, stops } = opts;

  ctx.font = `500 19px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.fillText(label, x, y);

  ctx.textAlign = "right";
  ctx.fillStyle = live ? CYAN : CLOUD;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText(readout, x + w, y);

  const trackY = y + 26;
  const trackH = 8;

  ctx.fillStyle = "#0b1017";
  roundRect(ctx, x, trackY, w, trackH, trackH / 2);
  ctx.fill();

  const clamped = Math.min(1, Math.max(0, fill));
  if (clamped > 0) {
    ctx.fillStyle = live ? CYAN : "#3c5a6b";
    roundRect(ctx, x, trackY, Math.max(trackH, clamped * w), trackH, trackH / 2);
    ctx.fill();
  }

  // Integer sliders get their stops drawn, so the LED grid snapping between
  // lane layouts reads as the control's behaviour rather than a glitch.
  if (stops && stops > 1) {
    for (let i = 0; i < stops; i += 1) {
      const sx = x + (i / (stops - 1)) * w;
      ctx.beginPath();
      ctx.arc(sx, trackY + trackH / 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(231, 239, 248, 0.28)";
      ctx.fill();
    }
  }

  const hx = x + clamped * w;
  const hy = trackY + trackH / 2;

  if (live) {
    ctx.save();
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(hx, hy, 12, 0, Math.PI * 2);
    ctx.fillStyle = CYAN;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(hx, hy, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#5d6c7e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

function drawNodeCard(ctx: CanvasRenderingContext2D, phase: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = BOARD;
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 18);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundRect(ctx, CARD_X + 0.5, CARD_Y + 0.5, CARD_W - 1, CARD_H - 1, 18);
  ctx.stroke();

  // Header
  const headerH = 62;
  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 18);
  ctx.clip();
  ctx.fillStyle = BOARD_2;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, headerH);
  ctx.fillStyle = VIOLET;
  ctx.fillRect(CARD_X, CARD_Y, 4, headerH);
  ctx.restore();

  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(CARD_X, CARD_Y + headerH + 0.5);
  ctx.lineTo(CARD_X + CARD_W, CARD_Y + headerH + 0.5);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = CLOUD;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("Juggle", CARD_X + 28, CARD_Y + headerH / 2);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText("PATTERN", CARD_X + CARD_W - 28, CARD_Y + headerH / 2);

  const innerX = CARD_X + 28;
  const innerW = CARD_W - 56;

  const count = countAt(phase);
  const handle = sliderValueAt(phase);
  // "Dragging" means the handle is moving, not that it is away from the left
  // stop — the ease holds it near COUNT_MIN for a stretch at each end of the
  // ramp, and a position test flips the caption there while nothing moves.
  const dragging = Math.abs(handle - sliderValueAt(phase - 1 / 240)) > 0.01;

  drawSlider(ctx, {
    x: innerX,
    y: CARD_Y + headerH + 62,
    w: innerW,
    label: "Speed",
    readout: SPEED_SLIDER.toFixed(2),
    fill: SPEED_SLIDER,
    live: false,
  });

  drawSlider(ctx, {
    x: innerX,
    y: CARD_Y + headerH + 152,
    w: innerW,
    label: "Count",
    readout: String(count),
    fill: (handle - COUNT_MIN) / (COUNT_MAX - COUNT_MIN),
    live: true,
    stops: COUNT_MAX - COUNT_MIN + 1,
  });

  // Three states, not two: the schedule holds the handle still at both ends of
  // the ramp, so "not dragging" has to name whichever count it came to rest on
  // rather than assuming the bottom stop.
  const caption = dragging
    ? "Dragging Count…"
    : count === COUNT_MIN
      ? `Count ${COUNT_MIN} — the Sinelon case`
      : `Count ${count} — ${count} dots, ${count} lanes`;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `500 17px ${FONT}`;
  ctx.fillStyle = dragging ? CYAN : MUTED;
  ctx.fillText(caption, innerX, CARD_Y + CARD_H - 44);
}

function drawLedFrame(ctx: CanvasRenderingContext2D) {
  const pad = 20;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = BOARD;
  roundRect(ctx, LED_X - pad, LED_Y - pad, LED_SIZE + pad * 2, LED_SIZE + pad * 2, 18);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundRect(
    ctx,
    LED_X - pad + 0.5,
    LED_Y - pad + 0.5,
    LED_SIZE + pad * 2 - 1,
    LED_SIZE + pad * 2 - 1,
    18,
  );
  ctx.stroke();

  ctx.fillStyle = "#05070a";
  ctx.fillRect(LED_X, LED_Y, LED_SIZE, LED_SIZE);
}

/**
 * Draw everything except the LEDs themselves. The compositor calls this, then
 * drawImage()s the WebGL canvas into LED_RECT, then calls drawChromeOverlay()
 * for the parts that sit above the grid.
 */
export function drawChromeUnder(ctx: CanvasRenderingContext2D, phase: number) {
  drawBackground(ctx);
  drawNodeCard(ctx, phase);
  drawLedFrame(ctx);
}

/** The cable and the caption, both of which read better over the grid edge. */
export function drawChromeOver(ctx: CanvasRenderingContext2D) {
  // Cable from the card's output edge to the matrix panel.
  const x0 = CARD_X + CARD_W;
  const y0 = CARD_Y + 62 + 40;
  const x1 = LED_X - 20;
  const y1 = LED_Y + LED_SIZE / 2;
  const mid = (x0 + x1) / 2;

  ctx.save();
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 3;
  ctx.shadowColor = VIOLET;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(mid, y0, mid, y1, x1, y1);
  ctx.stroke();
  ctx.restore();

  for (const [px, py] of [
    [x0, y0],
    [x1, y1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = VIOLET;
    ctx.fill();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 15px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("Matrix Output · 32 × 32", LED_X, LED_Y + LED_SIZE + 44);
}
