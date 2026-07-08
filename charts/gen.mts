// Reconstructed generator for the compressed-@rspack/binding chart (rspack#14719).
// The prior source was ad-hoc and lost; this rebuilds it in the zpm/napi-rs
// gen-charts style (GitHub-dark, hand-rolled SVG, inline-code pills, green for
// wins) from the numbers in rspack-compressed-binding-v3.png, with the same
// overflow fixes baked in: the frame height clears the footer with bottom
// padding, the label column is wide enough for the bar labels, and the pct
// notes stay inside the right edge.
//   node rspack-gen.mts   # writes rspack-compressed-binding.svg here
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// GitHub-dark palette. green = win, gray = uncompressed/neutral, blue = the
// compressed store. muted = labels, ink = headline text, code = inline tokens.
const C = {
  bg: '#0d1117',
  border: '#30363d',
  ink: '#e6edf3',
  muted: '#8b949e',
  faint: '#6e7681',
  grid: '#21262d',
  raw: '#8b949e',
  rawFill: '#6e7681',
  blue: '#2f6bff',
  green: '#3fb950',
  code: '#79c0ff',
  codeBg: '#1f2733',
}
const MONO = "ui-monospace, 'SF Mono', Menlo, 'DejaVu Sans Mono', monospace"
const SANS = "-apple-system, 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif"

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function text(x, y, s, o = {}) {
  const { size = 15, fill = C.muted, weight = 'normal', font = SANS, anchor = 'start' } = o
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`
}

function rect(x, y, w, h, fill, rx = 4) {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${h}" rx="${rx}" fill="${fill}"/>`
}

function circle(cx, cy, r, fill) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
}

// A prose line mixing normal runs with pill-style inline-code tokens.
// Advance widths are per-glyph estimates for the fonts below: mono ~0.6em,
// sans ~0.505em, bold sans ~0.545em. Kept slightly generous so runs never
// overlap the next token. Returns { svg, x } so callers can measure a line.
function rich(x, y, parts, size, fill, weight = 'normal') {
  let cx = x
  const out = []
  for (const p of parts) {
    if (p.code) {
      const tw = p.t.length * size * 0.6
      const w = tw + size * 0.6
      out.push(`<rect x="${cx.toFixed(1)}" y="${(y - size + 1).toFixed(1)}" width="${w.toFixed(1)}" height="${(size + 6).toFixed(1)}" rx="4" fill="${C.codeBg}"/>`)
      out.push(`<text x="${(cx + size * 0.3).toFixed(1)}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${C.code}">${esc(p.t)}</text>`)
      cx += w + size * 0.18
    } else {
      out.push(`<text x="${cx.toFixed(1)}" y="${y}" font-family="${SANS}" font-size="${size}" font-weight="${p.b ? 'bold' : weight}" fill="${p.b ? C.ink : fill}">${esc(p.t)}</text>`)
      cx += p.t.length * size * (p.b ? 0.545 : 0.505)
    }
  }
  return { svg: out.join(''), x: cx }
}

function frame(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="20" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
${inner}
</svg>`
}

const W = 1216
const PAD = 52
const out = []

// ── title ──────────────────────────────────────────────────────────────────
out.push(
  rich(
    PAD,
    80,
    [
      { t: 'Compressed ', b: 1 },
      { t: '@rspack/binding', code: 1 },
      { t: ' — smaller on disk, faster to load', b: 1 },
    ],
    28,
    C.ink,
  ).svg,
)

// ── subtitle (3 wrapped lines) ───────────────────────────────────────────────
const sub = [
  [
    { t: "Store the native addon with the OS's own " },
    { t: 'transparent filesystem compression', b: 1 },
    { t: ' (APFS here). The kernel decompresses it on read,' },
  ],
  [
    { t: 'so it takes fewer blocks on disk ' },
    { t: 'and loads faster', b: 1 },
    { t: ' — reading fewer bytes beats the cheap kernel decompress. Same bytes programs' },
  ],
  [
    { t: 'see. Measured on darwin-arm64 with ' },
    { t: '@rspack/binding', code: 1 },
    { t: '; lower is better.' },
  ],
]
let sy = 122
for (const line of sub) {
  out.push(rich(PAD, sy, line, 16, C.muted).svg)
  sy += 28
}

// ── legend ───────────────────────────────────────────────────────────────────
const legY = 224
out.push(circle(PAD + 8, legY - 5, 8, C.rawFill))
out.push(text(PAD + 26, legY, 'uncompressed (ships today)', { size: 16, fill: C.muted }))
out.push(circle(PAD + 320, legY - 5, 8, C.blue))
out.push(text(PAD + 338, legY, 'compressed binding (APFS)', { size: 16, fill: C.muted }))

// ── bar geometry ──────────────────────────────────────────────────────────────
const bx = PAD + 148
const bw = 916
const barH = 48
const barGap = 14
const rightEdge = W - PAD

// A titled two-bar comparison. `max` anchors the uncompressed bar to full width.
function section(yHead, head, headParts, rows, max) {
  // header: bold lead word + muted trailer with an optional code pill
  const lead = rich(PAD, yHead, [{ t: head, b: 1 }], 17, C.ink)
  out.push(lead.svg)
  out.push(rich(lead.x + 4, yHead, headParts, 17, C.muted).svg)
  const sc = bw / max
  let y = yHead + 22
  for (const r of rows) {
    const cy = y
    out.push(text(PAD, cy + barH * 0.62, r.label, { size: 16, fill: C.muted }))
    const w = r.value * sc
    out.push(rect(bx, cy, w, barH, r.comp ? C.blue : C.rawFill))
    // value sits inside the bar, right-aligned, white bold
    out.push(text(bx + w - 16, cy + barH * 0.62, r.note, { size: 18, fill: '#ffffff', weight: 'bold', font: MONO, anchor: 'end' }))
    if (r.pct) {
      out.push(text(bx + w + 20, cy + barH * 0.62, r.pct, { size: 18, fill: C.green, weight: 'bold', font: MONO }))
    }
    y += barH + barGap
  }
  return y
}

// ── section 1: On disk ─────────────────────────────────────────────────────────
let cursor = section(
  legY + 44,
  'On disk',
  [{ t: ' — blocks actually used by ' }, { t: 'rspack.darwin-arm64.node', code: 1 }],
  [
    { label: 'uncompressed', value: 38.4, note: '38.4 MiB' },
    { label: 'compressed', value: 17.0, note: '17.0 MiB', comp: 1, pct: '−56%' },
  ],
  38.4,
)

// ── section 2: First load ───────────────────────────────────────────────────────
cursor = section(
  cursor + 26,
  'First load',
  [{ t: ' — fresh clone, cold ' }, { t: 'require()', code: 1 }, { t: ' in a new process (median)' }],
  [
    { label: 'uncompressed', value: 853, note: '853 ms' },
    { label: 'compressed', value: 615, note: '615 ms', comp: 1, pct: '−28% (faster)' },
  ],
  853,
)

// ── footer rule + explainer (the block that overflowed in the ad-hoc version) ──
const ruleY = cursor + 22
out.push(`<line x1="${PAD}" y1="${ruleY}" x2="${rightEdge}" y2="${ruleY}" stroke="${C.grid}" stroke-width="1"/>`)
const foot = [
  [
    { t: 'Fewer bytes to read makes the first load faster, not slower', b: 1 },
    { t: ', and every load after is the same. The shipped ' },
    { t: '.node', code: 1 },
  ],
  [
    { t: 'download is smaller still — ' },
    { t: '13.8 MiB', b: 1 },
    { t: ' (zstd-19, −64%) — before the OS rewrites it filesystem-compressed on first load.' },
  ],
  [
    { t: 'Reproduce: ' },
    { t: 'node crates/node_binding/scripts/bench-compressed-binding.mjs', code: 1 },
  ],
]
let fy = ruleY + 32
for (const line of foot) {
  out.push(rich(PAD, fy, line, 15.5, C.muted).svg)
  fy += 26
}

// Frame height = last footer baseline + generous bottom breathing room.
const H = Math.round(fy - 26 + 36)
writeFileSync(join(here, 'rspack-compressed-binding.svg'), frame(W, H, out.join('\n')))
