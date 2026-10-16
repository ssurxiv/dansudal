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
import { RUG } from './sprites.js';
import { STASH } from '../stash.js';

const STORAGE_KEY = 'kanyangi:state';
const ZOOM_KEY = 'kanyangi-zoom';
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
  done: ['양탄자 완성. …여긴 이제 내 자리야.', '다 떴다. …폭신하네.']
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

const chart = new Chart({ width: 20, height: 20, bg: '#ffffff', palette: STASH.map((s) => s.color) });
const saved = loadSaved();
if (saved?.chart) chart.restore(saved.chart);

const ui = {
  view: saved?.ui?.view === 'knit' ? 'knit' : 'edit',
  tool: ['brush', 'rect', 'erase'].includes(saved?.ui?.tool) ? saved.ui.tool : 'brush',
  color: normalizeHex(saved?.ui?.color) ?? chart.palette[0] ?? STASH[0].color
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

/* 양탄자 픽셀 하나는 도안 여러 칸을 덮습니다(u 는 왼쪽→오른쪽, v 는
   앞(1단)→뒤(맨 윗단) 구간). 가운데 한 칸만 집으면 가는 줄무늬나 작은
   무늬가 통째로 빠져서 바탕만 남은 양탄자가 됐습니다 — 덮는 칸 중
   바탕 아닌 색이 3분의 1 이상이면 그 색을 씁니다. 아직 안 뜬 단은 세지
   않습니다. */
const RUG_MOTIF_SHARE = 1 / 3;
function sampleRug(u0, u1, v0, v1) {
  const x0 = Math.floor(u0 * chart.width);
  const x1 = Math.max(x0 + 1, Math.ceil(u1 * chart.width));
  const r0 = Math.floor(v0 * chart.height) + 1;
  const r1 = Math.min(chart.progress.rows, Math.max(r0, Math.ceil(v1 * chart.height)));
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

function syncKitty() {
  kitty.setResting(chart.complete ? 'rug' : 'idle');
  kitty.setPaint(ui.tool === 'erase' ? null : ui.color);
  kitty.setRug(chart.progress.rows > 0
    ? { sample: sampleRug, fraction: chart.fraction, fringe: mix(chart.bg, RUG.edge, 0.35) }
    : null);
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
    veil: 'rgba(252, 252, 253, 0.66)'
  };
}

/* 패널이 숨겨져 있으면(다른 탭) 폭이 0 이라 그릴 수 없습니다. 탭이
   열려 폭이 생기는 순간 ResizeObserver 가 다시 부릅니다. */
function renderChart() {
  const avail = chartWrap.clientWidth;
  if (!avail) return;
  const key = `${chart.width}x${chart.height}@${avail}`;
  if (key !== laidOutFor) {
    view.layout(chart, avail);
    laidOutFor = key;
  }
  view.draw(chart, { mode: ui.view, preview, colors: themeColors() });
}
new ResizeObserver(renderChart).observe(chartWrap);

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
    preview = { x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y, color: ui.color };
    kitty.play('hold');
  } else {
    const color = ui.tool === 'erase' ? null : ui.color;
    chart.beginStroke();
    chart.paint(cell.x, cell.y, color);
    drag = { tool: ui.tool, color, last: cell };
    kitty.play(ui.tool === 'erase' ? 'wipe' : 'hold');
  }
  renderChart();
});

chartCanvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.tool === 'tap') return;
  const cell = view.cellFromPoint(chart, e.clientX, e.clientY, true);
  if (drag.tool === 'rect') {
    if (cell.x === drag.end.x && cell.y === drag.end.y) return;
    drag.end = cell;
    preview.x1 = cell.x;
    preview.y1 = cell.y;
  } else {
    if (cell.x === drag.last.x && cell.y === drag.last.y) return;
    cellsBetween(drag.last, cell).forEach(({ x, y }) => chart.paint(x, y, drag.color));
    drag.last = cell;
  }
  renderChart();
});

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
    changed = !cancelled && chart.fillRect(d.start.x, d.start.y, d.end.x, d.end.y, ui.color);
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
  persist();
  refresh();
}
$('toolBrush').addEventListener('click', () => setTool('brush'));
$('toolRect').addEventListener('click', () => setTool('rect'));
$('toolErase').addEventListener('click', () => setTool('erase'));

function undo() {
  if (!chart.undo()) { say('되돌릴 게 없어.'); return; }
  kitty.play('huff');
  say(pick(LINES.undo));
  persist();
  refresh();
}
function redo() {
  if (!chart.redo()) { say('다시 할 게 없어.'); return; }
  kitty.play('stamp');
  say(pick(LINES.redo));
  persist();
  refresh();
}
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);

/* ── 색 ───────────────────────────────────────────────────── */

const paletteEl = $('palette');
const editor = $('colorEditor');
const hexInput = $('hex');
const sliders = ['r', 'g', 'b'].map((k) => ({ input: $(k), out: $(`${k}Out`) }));
let draft = ui.color;

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
function renderPalette() {
  const focused = paletteEl.contains(document.activeElement) ? document.activeElement.dataset.key : null;
  paletteEl.innerHTML = '';

  const bgWrap = document.createElement('span');
  bgWrap.className = 'c-bg-wrap';
  const bgBtn = swatch(chart.bg, '바탕색으로 칠하기(지우개)');
  bgBtn.classList.add('c-bg-swatch');
  bgBtn.dataset.key = 'bg';
  bgBtn.classList.toggle('recent', ui.tool === 'erase');
  bgBtn.setAttribute('aria-pressed', String(ui.tool === 'erase'));
  bgBtn.addEventListener('click', () => setTool('erase'));
  const bgLabel = document.createElement('span');
  bgLabel.className = 'c-bg-label';
  bgLabel.textContent = '바탕';
  bgWrap.append(bgBtn, bgLabel);

  const divider = document.createElement('span');
  divider.className = 'stash-divider';
  paletteEl.append(bgWrap, divider);

  chart.palette.forEach((color) => {
    const selected = ui.tool !== 'erase' && color === ui.color;
    const btn = swatch(color, nameOf(color) ?? color);
    btn.dataset.key = color;
    btn.classList.toggle('recent', selected);
    btn.setAttribute('aria-pressed', String(selected));
    btn.addEventListener('click', () => selectColor(color));
    paletteEl.append(btn);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'swatch c-add-swatch';
  add.dataset.key = 'add';
  add.textContent = '+';
  add.setAttribute('aria-label', '새 색 만들기');
  add.setAttribute('aria-expanded', String(!editor.hidden));
  add.addEventListener('click', toggleEditor);
  paletteEl.append(add);

  if (focused) paletteEl.querySelector(`[data-key="${focused}"]`)?.focus();
}

function selectColor(color) {
  ui.color = color;
  if (ui.tool === 'erase') ui.tool = 'brush';
  if (!editor.hidden) setDraft(color);
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

sliders.forEach(({ input }) => {
  input.addEventListener('input', () => {
    setDraft(`#${sliders.map((s) => toHex2(s.input.value)).join('')}`);
  });
});
hexInput.addEventListener('input', () => {
  const hex = normalizeHex(hexInput.value);
  if (hex) setDraft(hex, { keepHexInput: true });
  else hexInput.setAttribute('aria-invalid', 'true');
});
hexInput.addEventListener('blur', () => setDraft(draft));
hexInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addDraft(); }
});

function toggleEditor() {
  editor.hidden = !editor.hidden;
  if (!editor.hidden) setDraft(ui.tool === 'erase' ? chart.bg : ui.color);
  refresh();
}

function addDraft() {
  if (!chart.addColor(draft)) {
    say('팔레트가 꽉 찼어. 안 쓰는 색을 빼줘.');
    return;
  }
  ui.color = draft;
  ui.tool = 'brush';
  say('새 색이네. 나쁘지 않아.', { color: draft });
  persist();
  refresh();
}
$('colorAdd').addEventListener('click', addDraft);

$('colorBg').addEventListener('click', () => {
  if (chart.setBg(draft)) say('바탕색 바꿨어.', { color: draft });
  persist();
  refresh();
});

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
    say(`가로는 ${LIMITS.minW}~${LIMITS.maxW}코, 세로는 ${LIMITS.minH}~${LIMITS.maxH}단까지 돼.`);
    return;
  }
  if (chart.resize(w, h)) {
    say(`${w}코 × ${h}단. 잘린 칸은 되돌리기로 살릴 수 있어.`);
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
  if (!chart.painted) { say('이미 하얘.'); return; }
  if (!window.confirm('칠한 칸을 모두 지울까요? 되돌리기로 다시 살릴 수 있어요.')) return;
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
  syncKitty();
  if (chart.complete && !wasComplete) {
    kitty.play('complete');
    say(pick(LINES.done));
  } else if (backward) {
    kitty.play('huff');
    say(`${pick(LINES.back)} `, ...positionParts());
  } else {
    kitty.play('tap');
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

$('restart').addEventListener('click', () => {
  if (chart.progress.rows === 0 && chart.progress.runs === 0) { say('아직 하나도 안 떴어.'); return; }
  if (!window.confirm('뜬 기록을 처음으로 되돌릴까요? 도안은 그대로예요.')) return;
  chart.resetProgress();
  syncKitty();
  kitty.play('huff');
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
  if (!row) {
    $('rowLabel').textContent = '다 떴어요 🐾';
    $('rowDir').textContent = '양탄자 완성';
    runsEl.className = 'c-runs';
    return;
  }
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
  if (next === 'knit') say(...(chart.complete ? ['다 떴어. …여긴 내 자리야.'] : ['지금 ', ...positionParts()]));
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
  $('knitTop').hidden = edit;
  $('knitBottom').hidden = edit;
  chartCanvas.classList.toggle('knit', !edit);

  $('toolBrush').setAttribute('aria-pressed', String(ui.tool === 'brush'));
  $('toolRect').setAttribute('aria-pressed', String(ui.tool === 'rect'));
  $('toolErase').setAttribute('aria-pressed', String(ui.tool === 'erase'));
  $('undo').disabled = !chart.canUndo;
  $('redo').disabled = !chart.canRedo;
  renderPalette();
  if (document.activeElement !== widthInput) widthInput.value = chart.width;
  if (document.activeElement !== heightInput) heightInput.value = chart.height;

  panel.querySelectorAll('input[name="c-style"]').forEach((radio) => {
    radio.checked = radio.value === chart.style;
  });
  const started = chart.progress.rows > 0 || chart.progress.runs > 0;
  $('nextRun').disabled = chart.complete;
  $('nextRow').disabled = chart.complete;
  $('backRun').disabled = !started;
  $('backRow').disabled = !started;
  renderReading();

  renderChart();
  syncKitty();
}

/* ── 확대/축소 ────────────────────────────────────────────── */

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;
let zoom = 1;
try {
  const savedZoom = Number(localStorage.getItem(ZOOM_KEY));
  if (Number.isFinite(savedZoom) && savedZoom >= ZOOM_MIN && savedZoom <= ZOOM_MAX) zoom = savedZoom;
} catch { /* 프라이빗 창 등에서는 무시 */ }

function applyZoom() {
  panel.style.setProperty('--zoom', zoom.toFixed(2));
  try { localStorage.setItem(ZOOM_KEY, zoom); } catch { /* 무시 */ }
}
applyZoom();
$('zoomIn').addEventListener('click', () => { zoom = Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)); applyZoom(); });
$('zoomOut').addEventListener('click', () => { zoom = Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)); applyZoom(); });

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
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); knit('nextRun'); }
  else if (e.code === 'Enter') { e.preventDefault(); knit('nextRow'); }
  else if (e.code === 'Backspace') { e.preventDefault(); knit(e.shiftKey ? 'backRow' : 'backRun'); }
});

/* ── 시작 ─────────────────────────────────────────────────── */

refresh();
kitty.play(kitty.resting);
say(chart.complete ? '…여긴 내 자리야.' : pick(LINES.greet));
kitty.start();
