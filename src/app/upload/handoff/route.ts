import { isSharedPattern } from "@/lib/shared-pattern";

const DRAFT_KEY = "design-studio-community-handoff.v1";
const MAX_PATTERN_BYTES = 2 * 1024 * 1024;

function htmlPage(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}

function errorPage(message: string, status = 400) {
  return htmlPage(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Studio handoff</title><style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080a0e;color:#e8edf5;font:16px system-ui}.card{width:min(520px,calc(100% - 40px));padding:32px;background:#111720;border:1px solid #35404d;border-left:3px solid #ffb02e;border-radius:12px}h1{font-size:24px}p{color:#9ba5b3;line-height:1.6}a{color:#3de2ff}</style><div class="card"><h1>That pattern could not be attached.</h1><p>${message}</p><a href="/upload">Open the upload page</a></div></html>`, status);
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorPage("The transfer was not readable. Return to Design Studio and try Share again.");
  }

  const patternJson = String(formData.get("patternJson") ?? "");
  if (!patternJson || new TextEncoder().encode(patternJson).byteLength > MAX_PATTERN_BYTES) {
    return errorPage("The pattern is empty or larger than the 2 MB community limit.");
  }

  try {
    if (!isSharedPattern(JSON.parse(patternJson) as unknown)) {
      return errorPage("This does not look like a Design Studio pattern export.");
    }
  } catch {
    return errorPage("The transferred pattern is not valid JSON.");
  }

  const ledCount = Number(formData.get("ledCount"));
  const draft = {
    patternName: String(formData.get("patternName") ?? "Untitled Pattern").slice(0, 80),
    fileName: String(formData.get("fileName") ?? "studio-pattern.fastled-pattern.json").slice(0, 160),
    patternJson,
    controller: String(formData.get("controller") ?? "Other").slice(0, 30),
    ledCount: Number.isInteger(ledCount) && ledCount > 0 ? ledCount : 256,
    savedAt: Date.now(),
  };
  const serializedDraft = JSON.stringify(draft);
  const scriptValue = JSON.stringify(serializedDraft)
    .replaceAll("<", "\\u003c")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");
  const storageKey = JSON.stringify(DRAFT_KEY);

  return htmlPage(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Receiving Studio pattern</title><style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080a0e;color:#e8edf5;font:15px ui-monospace,monospace}.signal{display:flex;align-items:center;gap:9px;color:#3de2ff}.signal i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor;animation:p .8s ease-in-out infinite alternate}.signal i:nth-child(2){color:#4438ff;animation-delay:.12s}.signal i:nth-child(3){color:#f037e8;animation-delay:.24s}@keyframes p{to{opacity:.25;transform:translateX(4px)}}</style><div class="signal">Receiving pattern <i></i><i></i><i></i></div><script>try{sessionStorage.setItem(${storageKey},${scriptValue});location.replace('/upload?from=studio')}catch(e){document.body.textContent='The pattern arrived, but this browser blocked temporary storage. Please use the file upload instead.'}</script></html>`);
}
