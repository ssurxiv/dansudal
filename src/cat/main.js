/*!
 * 함뜨마을 동물 친구들 — 카냥이 진입점
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 카냥이 패널의 DOM 배선입니다. 단수달·코토키는 companion-app.js 를
 * 같이 쓰지만, 카냥이는 하는 일(도안 칠하기 + 뜨면서 체크하기)이 달라
 * 이 파일이 따로 엮습니다:
 *   chart.js       도안 모델 (칸 색, 되돌리기, 읽는 순서, 진행)
 *   chart-view.js  도안 캔버스 그리기와 칸 찾기
 *   kitty.js       고양이 애니메이션
 * 모델을 고친 뒤에는 늘 refresh() 로 화면 전체를 다시 맞춥니다.
 */

import { Chart, LIMITS, normalizeHex } from './chart.js';
import { ChartView } from './chart-view.js';
import { Kitty } from './kitty.js';
import { RUG, LOOM_W, LOOM_H } from './sprites.js';
import { STASH } from '../stash.js';

const STORAGE_KEY = 'kanyangi:state';
const $ = (id) => document.getElementById(`c-${id}`);
const panel = document.getElementById('panel-cat');

console.info(
  '%c함뜨마을 동물 친구들 · 카냥이 — © 2026 @tteoboja_0\n무단 재배포를 금합니다. LICENSE.txt 참조.',
  'color:#5f6f92;font-weight:600'
);

/* ── 말풍선 ───────────────────────────────────────────────── */
/* 새초롬한 친구라 말이 짧습니다. 진행을 알려줄 땐 실 색을 글 대신 작은
   색 점으로 보여줍니다(직접 만든 색엔 이름이 없어서). */

const STASH_NAMES = new Map(STASH.map((s) => [s.color, s.name]));
const nameOf = (hex) => STASH_NAMES.get(hex) ?? null;

const LINES = {
  greet: ['뭐 그릴 거야?', '칸은 내가 세어줄게.', '…왔어? 도안 그리자.', '오늘은 무슨 무늬야?'],
  paint: ['꾹.', '여기?', '칠했어.', '흠, 괜찮네.'],
  rect: ['한 번에 꾹.', '네모 반듯하게.'],
  erase: ['흥, 다시.', '지웠어.', '없던 걸로.'],
  undo: ['없던 걸로 할게.', '되돌렸어.'],
  redo: ['다시 칠했어.'],
  back: ['흥, 풀었어?', '다시 뜨면 되지.', '…괜찮아, 풀어.'],
  done: ['다 떴다. 봐, 예쁘지?', '완성. …나 잘했지?'],
  showoff: ['봐. 내가 다 짚었어.', '예쁘지? …당연하지.', '흥, 이 정도는 해.', '자랑 좀 할게.'],
  rug: ['…여긴 이제 내 자리야.', '폭신하네.', '여기 앉아 있을래.']
};
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

const bubbleEl = $('bubble');
const statusEl = $('status');

/** 글과 { color } 조각을 이어 말합니다. 색 조각은 말풍선에 색 점으로. */
function say(...parts) {
  bubbleEl.textContent = '';
  const spoken = [];
  parts.forEach((part) => {
    if (part && typeof part === 'object') {
      const dot = document.createElement('span');
      dot.className = 'c-dot';
      dot.style.backgroundColor = part.color;
      bubbleEl.append(dot);
    } else {
      bubbleEl.append(part);
      spoken.push(part);
    }
  });
  statusEl.textContent = spoken.join(' ');
}

/* ── 모델 + 저장 ──────────────────────────────────────────── */

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // 시크릿 모드·파싱 실패 등
  }
}

// 기본 팔레트는 실 창고 색에서 바탕(흰색)과 같은 화이트만 빼 8색 — 팔레트 큐 크기.
const chart = new Chart({
  width: 20,
  height: 20,
  bg: '#ffffff',
  palette: STASH.map((s) => s.color).filter((c) => c !== '#ffffff')
});
const saved = loadSaved();
if (saved?.chart) chart.restore(saved.chart);

const ui = {
  view: saved?.ui?.view === 'knit' ? 'knit' : 'edit',
  tool: ['brush', 'rect', 'erase'].includes(saved?.ui?.tool) ? saved.ui.tool : 'brush',
  color: normalizeHex(saved?.ui?.color) ?? chart.palette[0] ?? STASH[0].color,
  // 붓·지우개 굵기(한 변의 칸 수). 사각형은 굵기와 상관없습니다.
  brush: [1, 2, 3].includes(saved?.ui?.brush) ? saved.ui.brush : 1,
  // 대칭(데칼코마니): 'none' | 'x' 좌우 | 'y' 상하 | 'xy' 상하좌우.
  mirror: ['none', 'x', 'y', 'xy'].includes(saved?.ui?.mirror) ? saved.ui.mirror : 'none',
  // 다 뜬 뒤의 자세: 'showoff'(양탄자를 들어 자랑) | 'rug'(깔고 앉기).
  // 단수달·코토키처럼 다 뜨면 먼저 자랑부터 합니다.
  finishPose: saved?.ui?.finishPose === 'rug' ? 'rug' : 'showoff'
};

let saveTimer = null;
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chart: chart.serialize(), ui }));
  } catch { /* 용량 초과·차단. 무시하고 계속 동작합니다 */ }
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}
// 칠하고 바로 탭을 닫아도 마지막 붓질이 남게 합니다.
window.addEventListener('pagehide', () => { if (saveTimer) flushSave(); });

/* ── 고양이 ───────────────────────────────────────────────── */

const kitty = new Kitty($('stage'));

function mix(a, b, t) {
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* 양탄자·베틀 픽셀 하나는 도안 여러 칸을 덮습니다(u 는 왼쪽→오른쪽, v 는
   아래(1단)→위(맨 윗단) 구간). 가운데 한 칸만 집으면 가는 줄무늬나 작은
   무늬가 통째로 빠져서 바탕만 남은 양탄자가 됐습니다 — 덮는 칸 중
   바탕 아닌 색이 3분의 1 이상이면 그 색을 씁니다. maxRow 보다 위 단은
   세지 않습니다(베틀은 지금 짜는 단까지만). */
const RUG_MOTIF_SHARE = 1 / 3;
function sampleBlock(u0, u1, v0, v1, maxRow = chart.height) {
  const x0 = Math.floor(u0 * chart.width);
  const x1 = Math.max(x0 + 1, Math.ceil(u1 * chart.width));
  const r0 = Math.floor(v0 * chart.height) + 1;
  const r1 = Math.min(maxRow, Math.max(r0, Math.ceil(v1 * chart.height)));
  const counts = new Map();
  let total = 0;
  for (let row = Math.min(r0, r1); row <= r1; row++) {
    for (let x = x0; x < Math.min(x1, chart.width); x++) {
      const color = chart.colorAt(x, chart.yOfRow(row));
      counts.set(color, (counts.get(color) ?? 0) + 1);
      total += 1;
    }
  }
  let best = chart.bg;
  let bestCount = 0;
  counts.forEach((n, color) => {
    if (color !== chart.bg && n > bestCount) { best = color; bestCount = n; }
  });
  return bestCount >= total * RUG_MOTIF_SHARE ? best : chart.bg;
}

/* 베틀에 짜인 모습 — 도안 진행을 베틀의 짜는 칸(LOOM_W × LOOM_H 픽셀)으로
   옮깁니다. band 는 지금 짜는 단이 걸린 픽셀 줄(아래부터), doneCols 는 그
   줄에서 짠 칸 수(읽는 방향 기준), color 는 북에 감긴 지금 구간 색. */
function loomState() {
  if (chart.complete) return { row: chart.height + 1, band: LOOM_H, doneCols: 0, rtl: true, color: chart.bg, full: true };
  const row = chart.workingRow;
  const runs = chart.runs(row);
  const cellsDone = runs.slice(0, chart.progress.runs).reduce((n, run) => n + run.count, 0);
  return {
    row,
    band: Math.floor(((row - 1) / chart.height) * LOOM_H),
    doneCols: Math.round((cellsDone / chart.width) * LOOM_W),
    rtl: chart.direction(row) === 'rtl',
    color: runs[chart.progress.runs]?.color ?? chart.bg,
    full: false
  };
}
const loomColorAt = (c, r) => sampleBlock(
  c / LOOM_W, (c + 1) / LOOM_W, r / LOOM_H, (r + 1) / LOOM_H,
  Math.min(chart.height, chart.progress.rows + 1)
);
kitty.setLoomColors(loomColorAt);

/* 쉬는 자세: 다 뜬 뒤엔 자랑하기/깔고 앉기, 뜨기 화면은 베틀 앞, 그리기
   화면은 그냥 앉아 있기. 짜던 양탄자는 베틀에 있으니 바닥엔 다 떴을
   때만 깝니다. */
function syncKitty() {
  kitty.setResting(chart.complete ? ui.finishPose : ui.view === 'knit' ? 'loom' : 'idle');
  kitty.setPaint(ui.tool === 'erase' ? null : ui.color);
  kitty.setRug(chart.complete ? { sample: sampleBlock, fringe: mix(chart.bg, RUG.edge, 0.35) } : null);
  kitty.setLoom(loomState());
}

/* ── 도안 캔버스 ──────────────────────────────────────────── */

const chartCanvas = $('chart');
const chartWrap = $('chartWrap');
const view = new ChartView(chartCanvas);
let preview = null;
let laidOutFor = '';

function themeColors() {
  const cs = getComputedStyle(panel);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: v('--ink', '#2f3442'),
    muted: v('--muted', '#7b8396'),
    accent: v('--yarn', '#5f6f92'),
    // 뜨기 화면에서 아직 안 뜬 칸을 덮는 색 — 원래 색이 비치되 확실히 흐리게.
    veil: 'rgba(252, 252, 253, 0.68)'
  };
}

const avatarEl = $('stage');
const modesEl = $('modes');
const STICKY_TOP = 12;  // index.html 의 .c-work { top } 과 같게
const CARD_EDGES = 22;  // 도안 카드 위아래 안쪽 여백 + 테두리
const BREATHING = 10;

/**
 * 도안이 쓸 수 있는 높이 — 화면 높이에서 도안 카드의 머리(캐릭터, 휴대폰에선
 * 그 아래 줄로 내려간 그리기/뜨기)를 뺀 만큼입니다. 말풍선 높이는 세지
 * 않습니다(글이 길어질 때마다 도안 크기가 출렁이지 않게). 캐릭터 그림이
 * 말풍선보다 늘 높아서 머리 높이는 캐릭터가 정합니다.
 */
function availableHeight() {
  const avatarH = avatarEl.getBoundingClientRect().height;
  const modesWrapped = modesEl.offsetTop > avatarEl.offsetTop + avatarH / 2;
  const head = avatarH + (modesWrapped ? modesEl.offsetHeight + 8 : 0) + 8;
  return Math.max(220, window.innerHeight - STICKY_TOP - CARD_EDGES - head - BREATHING);
}

/* 패널이 숨겨져 있으면(다른 탭) 폭이 0 이라 그릴 수 없습니다. 탭이
   열려 폭이 생기는 순간 ResizeObserver 가 다시 부릅니다. */
function renderChart() {
  const avail = chartWrap.clientWidth;
  if (!avail) return;
  const availH = availableHeight();
  const key = `${chart.width}x${chart.height}@${avail}x${availH}`;
  if (key !== laidOutFor) {
    view.layout(chart, avail, availH);
    laidOutFor = key;
  }
  const hoverBoxes = ui.view === 'edit' && hover
    ? mirrorBoxes(ui.tool === 'rect' ? footprint(hover, 1) : footprint(hover))
    : null;
  view.draw(chart, { mode: ui.view, preview, hover: hoverBoxes, mirror: ui.mirror, colors: themeColors() });
}
new ResizeObserver(renderChart).observe(chartWrap);
window.addEventListener('resize', renderChart);

/* 그리기 화면의 커서는 고양이 발 — 발가락 넷 중 가장 왼쪽 발가락에만 칠할
   색 물감이 묻어 있고(지우개면 깨끗), 칠해지는 자리는 그 발가락입니다.
   흰 테두리를 한 겹 더 둘러 어느 칸 색 위에서도 보이게 합니다. 처음엔 발
   전체를 칠할 색으로 채우고 한가운데를 칠하는 자리로 둬서(32px) 칸을 덮어
   정밀하게 칠하기 어려웠습니다. 색마다 한 번만 만듭니다. */
const PAW_BODY = "<ellipse cx='14' cy='18.5' rx='6.6' ry='5.4'/>"
  + "<circle cx='10.6' cy='6.2' r='2.8'/><circle cx='17.4' cy='6.2' r='2.8'/><circle cx='22.8' cy='11' r='2.7'/>";
const PAW_INK_TOE = "<circle cx='5.2' cy='11' r='2.7'/>";
const cursorCache = new Map();
function pawCursor(ink) {
  const toe = ink ?? '#ffffff';
  if (!cursorCache.has(toe)) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>"
      + `<g fill='#fff' stroke='#fff' stroke-width='3'>${PAW_BODY}${PAW_INK_TOE}</g>`
      + `<g fill='#ffffff' stroke='#2f3442' stroke-width='1.3'>${PAW_BODY}</g>`
      + `<g fill='${toe}' stroke='#2f3442' stroke-width='1.3'>${PAW_INK_TOE}</g></svg>`;
    cursorCache.set(toe, `url("data:image/svg+xml,${encodeURIComponent(svg)}") 5 11, crosshair`);
  }
  return cursorCache.get(toe);
}

/* 붓 굵기만큼의 정사각형 칸들. 굵기가 홀수면 누른 칸이 가운데, 2면 누른
   칸이 왼쪽 위입니다. */
function footprint(cell, size = ui.brush) {
  const off = Math.floor((size - 1) / 2);
  const x0 = Math.max(0, cell.x - off);
  const y0 = Math.max(0, cell.y - off);
  const x1 = Math.min(chart.width - 1, cell.x - off + size - 1);
  const y1 = Math.min(chart.height - 1, cell.y - off + size - 1);
  return { x0, y0, x1, y1 };
}
/* 대칭(데칼코마니) — 상자 하나를 도안 한가운데 축으로 뒤집은 자리들까지.
   축 위에 걸친 상자는 자기 자신과 겹쳐도 그냥 두 번 칠할 뿐이라 상관없습니다. */
function mirrorBoxes(box) {
  const W = chart.width - 1;
  const H = chart.height - 1;
  const flipX = (b) => ({ ...b, x0: W - b.x1, x1: W - b.x0 });
  const flipY = (b) => ({ ...b, y0: H - b.y1, y1: H - b.y0 });
  const out = [box];
  if (ui.mirror === 'x' || ui.mirror === 'xy') out.push(flipX(box));
  if (ui.mirror === 'y' || ui.mirror === 'xy') out.push(flipY(box));
  if (ui.mirror === 'xy') out.push(flipX(flipY(box)));
  return out;
}
const boxOf = (a, b) => ({
  x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y)
});
function paintBox({ x0, y0, x1, y1 }, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) chart.paint(x, y, color);
}
function paintFootprint(cell, color) {
  mirrorBoxes(footprint(cell)).forEach((box) => paintBox(box, color));
}

/* 그리기 화면에선 커서 아래 칸(붓 굵기만큼)에 테두리를 둘러, 누르기 전에
   어디가 칠해질지 보여줍니다. */
let hover = null;
function setHover(cell) {
  const same = hover && cell && hover.x === cell.x && hover.y === cell.y;
  if (same || (!hover && !cell)) return;
  hover = cell;
  renderChart();
}

/** 두 칸 사이를 빈틈없이 잇는 칸들(시작 칸 제외). 빠르게 끌어도 선이 끊기지 않게. */
function cellsBetween(a, b) {
  const out = [];
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  let { x, y } = a;
  while (x !== b.x || y !== b.y) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    out.push({ x, y });
  }
  return out;
}

let drag = null;

chartCanvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const cell = view.cellFromPoint(chart, e.clientX, e.clientY);
  if (ui.view === 'knit') {
    // 뜨기 화면에선 "톡" 누른 칸만 받습니다 — 끌면 스크롤입니다.
    drag = cell ? { tool: 'tap', start: cell } : null;
    return;
  }
  if (!cell) return;
  e.preventDefault();
  chartCanvas.setPointerCapture(e.pointerId);
  if (ui.tool === 'rect') {
    drag = { tool: 'rect', start: cell, end: cell };
    preview = { boxes: mirrorBoxes(boxOf(cell, cell)), color: ui.color };
    kitty.play('hold');
  } else {
    const color = ui.tool === 'erase' ? null : ui.color;
    chart.beginStroke();
    paintFootprint(cell, color);
    drag = { tool: ui.tool, color, last: cell };
    kitty.play(ui.tool === 'erase' ? 'wipe' : 'hold');
  }
  renderChart();
});

chartCanvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') setHover(view.cellFromPoint(chart, e.clientX, e.clientY));
  if (!drag || drag.tool === 'tap') return;
  const cell = view.cellFromPoint(chart, e.clientX, e.clientY, true);
  if (drag.tool === 'rect') {
    if (cell.x === drag.end.x && cell.y === drag.end.y) return;
    drag.end = cell;
    preview.boxes = mirrorBoxes(boxOf(drag.start, cell));
  } else {
    if (cell.x === drag.last.x && cell.y === drag.last.y) return;
    cellsBetween(drag.last, cell).forEach((c) => paintFootprint(c, drag.color));
    drag.last = cell;
  }
  renderChart();
});

chartCanvas.addEventListener('pointerleave', () => setHover(null));

function endDrag(e, cancelled) {
  const d = drag;
  drag = null;
  if (!d) return;
  if (d.tool === 'tap') {
    const cell = cancelled ? null : view.cellFromPoint(chart, e.clientX, e.clientY);
    if (cell && cell.x === d.start.x && cell.y === d.start.y) knit('jump', cell);
    return;
  }
  let changed;
  if (d.tool === 'rect') {
    preview = null;
    if (!cancelled) {
      // 사각형과 그 거울 자리들을 한 번의 되돌리기로 묶습니다.
      chart.beginStroke();
      mirrorBoxes(boxOf(d.start, d.end)).forEach((box) => paintBox(box, ui.color));
    }
    changed = !cancelled && chart.endStroke();
    if (changed) say(pick(LINES.rect));
  } else {
    changed = chart.endStroke();
    if (changed) say(pick(d.tool === 'erase' ? LINES.erase : LINES.paint));
  }
  kitty.release();
  if (changed) persist();
  refresh();
}
chartCanvas.addEventListener('pointerup', (e) => endDrag(e, false));
chartCanvas.addEventListener('pointercancel', (e) => endDrag(e, true));

/* ── 도구·되돌리기 ────────────────────────────────────────── */

function setTool(tool) {
  ui.tool = tool;
  if (editorTarget === 'bg') {
    editorTarget = null;
    bgSession = false;
    editor.hidden = true;
  }
  persist();
  refresh();
}
$('toolBrush').addEventListener('click', () => setTool('brush'));
$('toolRect').addEventListener('click', () => setTool('rect'));
$('toolErase').addEventListener('click', () => setTool('erase'));

function setBrush(size) {
  const next = Math.max(1, Math.min(3, size));
  if (next === ui.brush) return;
  ui.brush = next;
  persist();
  refresh();
}
panel.querySelectorAll('#c-brush button').forEach((btn) => {
  btn.addEventListener('click', () => setBrush(Number(btn.dataset.size)));
});

const MIRRORS = ['none', 'x', 'y', 'xy'];
const MIRROR_LINES = {
  none: '대칭 끔.',
  x: '좌우 대칭. 한쪽만 칠하면 돼.',
  y: '상하 대칭. 위아래가 같이 칠해져.',
  xy: '상하좌우 대칭. 한 번에 네 군데.'
};
function setMirror(mode) {
  if (mode === ui.mirror) return;
  ui.mirror = mode;
  say(MIRROR_LINES[mode]);
  persist();
  refresh();
}
panel.querySelectorAll('#c-mirror button').forEach((btn) => {
  btn.addEventListener('click', () => setMirror(btn.dataset.mirror));
});

function undo() {
  if (!chart.undo()) { say('되돌릴 게 없어.'); return; }
  syncBgEditor();
  kitty.play('huff');
  say(pick(LINES.undo));
  persist();
  refresh();
}
function redo() {
  if (!chart.redo()) { say('다시 할 게 없어.'); return; }
  syncBgEditor();
  kitty.play('stamp');
  say(pick(LINES.redo));
  persist();
  refresh();
}
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);

/* ── 색 ───────────────────────────────────────────────────── */
/* 색 편집기 하나를 두 가지로 씁니다.
     'new' — 팔레트 끝 '+': 새 색을 만들어 팔레트에 넣습니다.
     'bg'  — 팔레트 맨 앞 '바탕': 바탕색을 바로바로 바꿉니다. 이 동안엔
             팔레트 색을 눌러도 칠할 색이 아니라 바탕색이 됩니다.
   예전엔 '바탕' 견본이 지우개를 고르는 단추였는데, 이름만 보고 바탕색을
   고르려던 사람에겐 아무 일도 안 일어나는 것처럼 보였습니다(지우개는
   도구 줄의 🧽 하나로 충분합니다). */

const paletteEl = $('palette');
const editor = $('colorEditor');
const hexInput = $('hex');
const sliders = ['r', 'g', 'b'].map((k) => ({ input: $(k), out: $(`${k}Out`) }));
let draft = ui.color;
let editorTarget = null; // null | 'new' | 'bg'
// 바탕색을 고르는 동안(편집기를 연 한 번)은 되돌리기 기록을 하나로 합칩니다.
let bgSession = false;

function swatch(color, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swatch';
  btn.style.backgroundColor = color;
  btn.dataset.color = color;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  return btn;
}

/* 고를 때마다 단추를 새로 그리므로, 키보드로 고르던 중이면 같은 색
   단추에 초점을 되돌려줍니다. */
const bgRowEl = $('bgRow');

function renderPalette() {
  const holder = [bgRowEl, paletteEl].find((el) => el.contains(document.activeElement));
  const focused = holder ? document.activeElement.dataset.key : null;
  paletteEl.innerHTML = '';
  bgRowEl.innerHTML = '';
  const pickingBg = editorTarget === 'bg';

  // 바탕 줄 — 네모 견본 하나 + 색 이름. 누르면 바탕색 고르기가 열립니다.
  const bgBtn = swatch(chart.bg, '바탕색 바꾸기');
  bgBtn.classList.add('c-bg-swatch');
  bgBtn.dataset.key = 'bg';
  bgBtn.classList.toggle('recent', pickingBg);
  bgBtn.setAttribute('aria-expanded', String(pickingBg));
  bgBtn.addEventListener('click', () => openEditor('bg'));
  const bgName = document.createElement('span');
  bgName.className = 'c-bg-name';
  bgName.textContent = nameOf(chart.bg) ?? chart.bg;
  bgRowEl.append(bgBtn, bgName);

  // 새 색 만들기는 첫 동그라미 — 새 색은 바로 그 옆(맨 앞)에 들어옵니다.
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'swatch c-add-swatch';
  add.dataset.key = 'add';
  add.textContent = '+';
  add.setAttribute('aria-label', '새 색 만들기');
  add.setAttribute('aria-expanded', String(editorTarget === 'new'));
  add.addEventListener('click', () => openEditor('new'));
  paletteEl.append(add);

  chart.palette.forEach((color) => {
    const selected = !pickingBg && ui.tool !== 'erase' && color === ui.color;
    const btn = swatch(color, nameOf(color) ?? color);
    btn.dataset.key = color;
    btn.classList.toggle('recent', selected);
    btn.setAttribute('aria-pressed', String(selected));
    btn.addEventListener('click', () => selectColor(color));
    paletteEl.append(btn);
  });

  if (focused) (focused === 'bg' ? bgRowEl : paletteEl).querySelector(`[data-key="${focused}"]`)?.focus();
}

function selectColor(color) {
  if (editorTarget === 'bg') {
    setDraft(color);
    applyBg(color);
    return;
  }
  ui.color = color;
  if (ui.tool === 'erase') ui.tool = 'brush';
  if (editorTarget === 'new') setDraft(color);
  persist();
  refresh();
}

const toHex2 = (n) => Number(n).toString(16).padStart(2, '0');

function setDraft(hex, { keepHexInput = false } = {}) {
  draft = hex;
  $('colorPreview').style.backgroundColor = hex;
  if (!keepHexInput) hexInput.value = hex;
  hexInput.removeAttribute('aria-invalid');
  sliders.forEach(({ input, out }, i) => {
    const value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    input.value = value;
    out.value = value;
  });
}

/** 편집기 값이 바뀌었을 때 — 바탕색을 고르는 중이면 바로 칠합니다. */
function draftChanged() {
  if (editorTarget === 'bg') applyBg(draft);
}

function applyBg(color) {
  if (!chart.setBg(color, { merge: bgSession })) return;
  bgSession = true;
  say('바탕색 바꿨어.', { color });
  persist();
  refresh();
}

/** 되돌리기로 바탕색이 바뀌었으면 편집기도 따라가고, 다음 바꿈은 새 기록으로. */
function syncBgEditor() {
  bgSession = false;
  if (editorTarget === 'bg') setDraft(chart.bg);
}

sliders.forEach(({ input }) => {
  input.addEventListener('input', () => {
    setDraft(`#${sliders.map((sl) => toHex2(sl.input.value)).join('')}`);
    draftChanged();
  });
});
hexInput.addEventListener('input', () => {
  const hex = normalizeHex(hexInput.value);
  if (!hex) {
    hexInput.setAttribute('aria-invalid', 'true');
    return;
  }
  setDraft(hex, { keepHexInput: true });
  draftChanged();
});
hexInput.addEventListener('blur', () => setDraft(draft));
hexInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (editorTarget === 'new') addDraft();
  else closeEditor();
});

/** 같은 단추를 다시 누르면 닫습니다. */
function openEditor(target) {
  if (editorTarget === target) {
    closeEditor();
    return;
  }
  editorTarget = target;
  bgSession = false;
  editor.hidden = false;
  const forBg = target === 'bg';
  $('editorTitle').textContent = forBg ? '바탕색 바꾸기 · 팔레트 색을 눌러도 돼요' : '새 색 만들기';
  $('colorAdd').hidden = forBg;
  $('colorRemove').hidden = forBg;
  $('colorDone').textContent = forBg ? '완료' : '닫기';
  setDraft(forBg ? chart.bg : ui.color);
  if (forBg) say('바탕색은 뭐로 할까?');
  refresh();
}

function closeEditor() {
  editorTarget = null;
  bgSession = false;
  editor.hidden = true;
  refresh();
}
$('colorDone').addEventListener('click', closeEditor);

function addDraft() {
  const { ok, dropped } = chart.addColor(draft);
  if (!ok) return;
  ui.color = draft;
  ui.tool = 'brush';
  if (dropped) say('새 색이네. 대신 제일 오래된', { color: dropped }, '은 뺐어.');
  else say('새 색이네. 나쁘지 않아.', { color: draft });
  persist();
  refresh();
}
$('colorAdd').addEventListener('click', addDraft);

$('colorRemove').addEventListener('click', () => {
  if (ui.tool === 'erase' || !chart.palette.includes(ui.color)) {
    say('뺄 색을 먼저 골라줘.');
    return;
  }
  if (chart.palette.length <= 1) {
    say('색이 하나는 있어야 해.');
    return;
  }
  const removed = ui.color;
  const at = chart.palette.indexOf(removed);
  chart.removeColor(removed);
  ui.color = chart.palette[Math.min(at, chart.palette.length - 1)];
  say('뺐어. 이미 칠한 칸은 그대로야.', { color: removed });
  persist();
  refresh();
});

/* ── 크기 ─────────────────────────────────────────────────── */

const widthInput = $('width');
const heightInput = $('height');

function applySize() {
  const w = parseInt(widthInput.value, 10);
  const h = parseInt(heightInput.value, 10);
  const ok = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!ok(w, LIMITS.minW, LIMITS.maxW) || !ok(h, LIMITS.minH, LIMITS.maxH)) {
    say(`가로는 ${LIMITS.minW}~${LIMITS.maxW}칸, 세로는 ${LIMITS.minH}~${LIMITS.maxH}칸까지 돼.`);
    return;
  }
  if (chart.resize(w, h)) {
    say(`${w}칸 × ${h}칸. 잘린 칸은 되돌리기로 살릴 수 있어.`);
    persist();
  }
  refresh();
}
$('resize').addEventListener('click', applySize);
[widthInput, heightInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applySize(); }
  });
});

$('clear').addEventListener('click', () => {
  if (!chart.painted && !chart.started) { say('이미 하얘.'); return; }
  if (!window.confirm('새 도안을 시작할까요? 칠한 칸과 뜬 기록이 모두 지워져요. 되돌리기로 다시 살릴 수 있어요.')) return;
  chart.clear();
  kitty.play('huff');
  say('새 도안이야. …하얗네.');
  persist();
  refresh();
});

/* ── 뜨기 ─────────────────────────────────────────────────── */

/** 지금 뜰 구간을 말풍선 조각으로: "3단 ← ● 코랄 4코". */
function positionParts() {
  const row = chart.workingRow;
  if (!row) return ['다 떴어.'];
  const run = chart.runs(row)[chart.progress.runs];
  const arrow = chart.direction(row) === 'rtl' ? '←' : '→';
  const name = nameOf(run.color);
  return [`${row}단 ${arrow}`, { color: run.color }, `${name ? `${name} ` : ''}${run.count}코`];
}

const progressIndex = () => chart.progress.rows * (LIMITS.maxW + 1) + chart.progress.runs;

function knit(action, cell) {
  const wasComplete = chart.complete;
  const before = progressIndex();
  const result = action === 'jump' ? chart.jumpTo(cell.x, cell.y) : chart[action]();
  if (!result) {
    say(action.startsWith('back') ? '더 풀 게 없어.' : '벌써 다 떴어.');
    return;
  }
  const backward = progressIndex() < before;
  const justFinished = chart.complete && !wasComplete;
  if (justFinished) ui.finishPose = 'showoff';
  // 베틀부터 틀어야 지금 모습 → 새 모습으로 북이 움직입니다(refresh 의
  // setLoom 은 짜는 동안엔 무시됩니다).
  kitty.weave(loomState(), justFinished ? 'complete' : backward ? 'back' : 'forward');
  if (justFinished) {
    say(pick(LINES.done));
  } else if (backward) {
    say(`${pick(LINES.back)} `, ...positionParts());
  } else {
    const lead = result === 'row' ? [`${chart.progress.rows}단 끝. `] : [];
    say(...lead, ...positionParts());
  }
  persist();
  refresh();
}

$('nextRun').addEventListener('click', () => knit('nextRun'));
$('nextRow').addEventListener('click', () => knit('nextRow'));
$('backRun').addEventListener('click', () => knit('backRun'));
$('backRow').addEventListener('click', () => knit('backRow'));

panel.querySelectorAll('input[name="c-style"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!chart.setStyle(radio.value)) return;
    say(radio.value === 'flat' ? '평면뜨기. 겉면은 ←, 안면은 →로 읽어.' : '원통뜨기. 매 단 ←로 읽어.');
    persist();
    refresh();
  });
});

/* 자랑하기 ↔ 깔고 앉기 (단수달의 입어보기·벗기 자리). */
$('showoff').addEventListener('click', () => {
  if (!chart.complete) return;
  ui.finishPose = ui.finishPose === 'showoff' ? 'rug' : 'showoff';
  syncKitty();
  say(pick(LINES[ui.finishPose]));
  persist();
  refresh();
});

$('restart').addEventListener('click', () => {
  if (!chart.started) { say('아직 하나도 안 떴어.'); return; }
  if (!window.confirm('뜬 기록을 처음으로 되돌릴까요? 도안은 그대로예요.')) return;
  chart.resetProgress();
  kitty.weave(loomState(), 'back');
  say('처음부터. ', ...positionParts());
  persist();
  refresh();
});

function renderReading() {
  const row = chart.workingRow;
  const p = chart.progress;
  $('progressText').textContent = `${p.rows} / ${chart.height}단`;
  const runsEl = $('runs');
  runsEl.innerHTML = '';
  if (!row) return; // 다 뜨면 카드째로 숨깁니다(refresh)
  const side = chart.style === 'flat' ? ` · ${chart.side(row) === 'RS' ? '겉면' : '안면'}` : '';
  const rtl = chart.direction(row) === 'rtl';
  $('rowLabel').textContent = `${row}단${side}`;
  $('rowDir').textContent = rtl ? '← 오른쪽부터' : '→ 왼쪽부터';
  runsEl.className = rtl ? 'c-runs rtl' : 'c-runs';
  chart.runs(row).forEach((run, i) => {
    const li = document.createElement('li');
    const state = i < p.runs ? 'done' : i === p.runs ? 'current' : '';
    li.className = `c-run ${state}`.trim();
    const dot = document.createElement('span');
    dot.className = 'c-dot';
    dot.style.backgroundColor = run.color;
    li.append(dot, String(run.count));
    const name = nameOf(run.color) ?? '색';
    li.setAttribute('aria-label', `${name} ${run.count}코${state === 'done' ? ', 뜸' : ''}`);
    if (state === 'current') li.setAttribute('aria-current', 'step');
    runsEl.append(li);
  });
}

/* ── 화면 전환 ────────────────────────────────────────────── */

function setView(next) {
  if (ui.view === next) return;
  ui.view = next;
  persist();
  refresh();
  kitty.play('rest'); // 칠하던 동작이 남아 있어도 바로 그 화면의 자세(베틀 앞/그냥 앉기)로
  if (next === 'knit') say(...(chart.complete ? [pick(LINES[ui.finishPose])] : ['지금 ', ...positionParts()]));
  else say('도안 그리기. 칠할 색을 골라.');
}
$('modeEdit').addEventListener('click', () => setView('edit'));
$('modeKnit').addEventListener('click', () => setView('knit'));

function refresh() {
  const edit = ui.view === 'edit';
  $('modeEdit').setAttribute('aria-pressed', String(edit));
  $('modeKnit').setAttribute('aria-pressed', String(!edit));
  $('editTop').hidden = !edit;
  $('editBottom').hidden = !edit;
  // 다 뜬 뒤엔 읽을 단이 없어 카드째로 숨깁니다 — 단수달·코토키처럼 따로
  // 결과 문구를 두지 않고, 카냥이가 양탄자를 들어 보이는 걸로 알립니다.
  $('knitTop').hidden = edit || chart.complete;
  $('knitBottom').hidden = edit;
  chartCanvas.classList.toggle('knit', !edit);
  chartCanvas.style.cursor = edit ? pawCursor(ui.tool === 'erase' ? null : ui.color) : '';

  $('toolBrush').setAttribute('aria-pressed', String(ui.tool === 'brush'));
  $('toolRect').setAttribute('aria-pressed', String(ui.tool === 'rect'));
  $('toolErase').setAttribute('aria-pressed', String(ui.tool === 'erase'));
  panel.querySelectorAll('#c-mirror button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.mirror === ui.mirror));
  });
  // 사각형엔 굵기가 없으니 굵기 단추를 잠급니다.
  panel.querySelectorAll('#c-brush button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === ui.brush));
    btn.disabled = ui.tool === 'rect';
  });
  $('undo').disabled = !chart.canUndo;
  $('redo').disabled = !chart.canRedo;
  renderPalette();
  if (document.activeElement !== widthInput) widthInput.value = chart.width;
  if (document.activeElement !== heightInput) heightInput.value = chart.height;

  panel.querySelectorAll('input[name="c-style"]').forEach((radio) => {
    radio.checked = radio.value === chart.style;
  });
  const started = chart.started;
  $('nextRun').disabled = chart.complete;
  $('nextRow').disabled = chart.complete;
  const showoffBtn = $('showoff');
  // 버튼만 숨기면 감싼 줄의 여백이 남아서 줄째로 숨깁니다.
  showoffBtn.parentElement.hidden = !chart.complete;
  showoffBtn.textContent = ui.finishPose === 'showoff' ? '🧶 깔고 앉기' : '✨ 자랑하기';
  $('backRun').disabled = !started;
  $('backRow').disabled = !started;
  renderReading();

  renderChart();
  syncKitty();
}

/* ── 단축키 ───────────────────────────────────────────────── */
/* 다른 탭이 열려 있으면(이 패널이 hidden) 반응하지 않습니다. */

document.addEventListener('keydown', (e) => {
  if (panel.hidden) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyZ') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (mod && e.code === 'KeyY') { e.preventDefault(); redo(); return; }
  if (mod || e.altKey) return;
  if (ui.view === 'edit') {
    if (e.code === 'KeyB') setTool('brush');
    else if (e.code === 'KeyR') setTool('rect');
    else if (e.code === 'KeyE') setTool('erase');
    else if (e.code === 'BracketLeft') setBrush(ui.brush - 1);
    else if (e.code === 'BracketRight') setBrush(ui.brush + 1);
    else if (e.code === 'KeyM') setMirror(MIRRORS[(MIRRORS.indexOf(ui.mirror) + 1) % MIRRORS.length]);
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); knit('nextRun'); }
  else if (e.code === 'Enter') { e.preventDefault(); knit('nextRow'); }
  else if (e.code === 'Backspace') { e.preventDefault(); knit(e.shiftKey ? 'backRow' : 'backRun'); }
});

/* ── 시작 ─────────────────────────────────────────────────── */

refresh();
kitty.play(kitty.resting);
say(chart.complete ? pick(LINES[ui.finishPose]) : pick(LINES.greet));
kitty.start();
