/*!
 * 함뜨마을 동물 친구들 — 카냥이 도안 모델
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 배색뜨기·방안뜨기 도안 한 장. 칸 색칠(되돌리기 포함)과, 실제로 뜨면서
 * 어디까지 떴는지(진행)를 함께 들고 있습니다. 화면(DOM)은 모릅니다 —
 * cat/main.js 가 이 모델을 고치고 다시 그립니다.
 *
 * 좌표: x 는 왼쪽부터 0, y 는 위부터 0 인 화면 좌표입니다. 뜨개 도안은
 * 아래에서 위로 읽으므로 "단"은 맨 아랫줄이 1단입니다(rowOfY/yOfRow).
 *
 * 읽는 방향: 평면뜨기(왕복)는 겉면 단(홀수 단)을 오른쪽→왼쪽, 안면
 * 단(짝수 단)을 왼쪽→오른쪽으로 읽어 지그재그가 되고, 원통뜨기는 매 단
 * 오른쪽→왼쪽입니다.
 *
 * 진행: 단 하나를 같은 색이 이어지는 "구간"으로 나눠, 한 구간씩 또는
 * 한 단씩 체크하고 되돌립니다. progress.rows 는 다 뜬 단 수,
 * progress.runs 는 지금 뜨는 단(rows + 1)에서 다 뜬 구간 수입니다.
 */

export const LIMITS = { minW: 2, maxW: 60, minH: 2, maxH: 100 };
export const MAX_PALETTE = 24;
const MAX_HISTORY = 200;
const SCHEMA = 1;

/** '#abc', 'abc', '#aabbcc', 'AABBCC' 를 '#aabbcc' 로. 못 읽으면 null. */
export function normalizeHex(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toLowerCase();
  if (s.startsWith('#')) s = s.slice(1);
  if (/^[0-9a-f]{3}$/.test(s)) s = [...s].map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null;
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(v)));

export class Chart {
  constructor({ width = 20, height = 20, bg = '#ffffff', palette = [] } = {}) {
    this.width = clampInt(width, LIMITS.minW, LIMITS.maxW);
    this.height = clampInt(height, LIMITS.minH, LIMITS.maxH);
    // 칸 값이 null 이면 바탕(아무것도 안 칠한 칸)이고, 바탕색(bg)으로 뜹니다.
    this.cells = new Array(this.width * this.height).fill(null);
    this.bg = normalizeHex(bg) ?? '#ffffff';
    this.palette = palette.map(normalizeHex).filter(Boolean).slice(0, MAX_PALETTE);
    this.style = 'flat';
    this.progress = { rows: 0, runs: 0 };
    this.undoStack = [];
    this.redoStack = [];
    this.stroke = null;
  }

  /* ── 좌표 ─────────────────────────────────────────────── */

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  index(x, y) { return y * this.width + x; }
  cellAt(x, y) { return this.cells[this.index(x, y)]; }
  /** 실제로 뜰 색 — 안 칠한 칸은 바탕색. */
  colorAt(x, y) { return this.cells[this.index(x, y)] ?? this.bg; }
  rowOfY(y) { return this.height - y; }
  yOfRow(row) { return this.height - row; }
  get painted() { return this.cells.some((c) => c !== null); }

  /* ── 칠하기 ───────────────────────────────────────────── */
  /* 손을 떼기 전까지(드래그 한 번)는 칠한 칸을 하나의 되돌리기 단위로
     묶습니다 — 한 칸씩 되돌리게 하면 줄 하나 긋고 되돌리기를 수십 번
     눌러야 합니다. */

  beginStroke() {
    this.stroke = new Map();
  }

  /** 칸 하나를 칠합니다(color 가 null 이면 지우기). 바뀌었으면 true. */
  paint(x, y, color) {
    if (!this.inBounds(x, y)) return false;
    const i = this.index(x, y);
    const next = color === null ? null : normalizeHex(color);
    if (color !== null && !next) return false;
    if (this.cells[i] === next) return false;
    if (this.stroke) {
      if (!this.stroke.has(i)) this.stroke.set(i, this.cells[i]);
      this.cells[i] = next;
    } else {
      this.pushHistory({ type: 'cells', changes: [[i, this.cells[i], next]] });
      this.cells[i] = next;
    }
    return true;
  }

  /** 붓질을 마칩니다. 실제로 바뀐 칸이 있었으면 true. */
  endStroke() {
    const stroke = this.stroke;
    this.stroke = null;
    if (!stroke) return false;
    const changes = [];
    stroke.forEach((before, i) => {
      if (before !== this.cells[i]) changes.push([i, before, this.cells[i]]);
    });
    if (!changes.length) return false;
    this.pushHistory({ type: 'cells', changes });
    return true;
  }

  /** 두 꼭짓점 칸을 포함하는 사각형을 한 번에 칠합니다. */
  fillRect(x0, y0, x1, y1, color) {
    const [left, right] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [top, bottom] = [Math.min(y0, y1), Math.max(y0, y1)];
    this.beginStroke();
    for (let y = Math.max(0, top); y <= Math.min(this.height - 1, bottom); y++) {
      for (let x = Math.max(0, left); x <= Math.min(this.width - 1, right); x++) this.paint(x, y, color);
    }
    return this.endStroke();
  }

  /**
   * 크기를 바꿉니다. 맨 아랫줄(1단)과 왼쪽 끝을 기준으로 두고, 늘어난
   * 단은 위에, 늘어난 코는 오른쪽에 붙습니다(줄이면 그쪽부터 잘립니다).
   * 잘려 나간 칸도 되돌리기로 살아납니다.
   */
  resize(width, height) {
    const w = clampInt(width, LIMITS.minW, LIMITS.maxW);
    const h = clampInt(height, LIMITS.minH, LIMITS.maxH);
    if (w === this.width && h === this.height) return false;
    const before = this.snapshot();
    const cells = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) {
      const srcY = y - (h - this.height);
      if (srcY < 0 || srcY >= this.height) continue;
      for (let x = 0; x < Math.min(w, this.width); x++) cells[y * w + x] = this.cells[this.index(x, srcY)];
    }
    this.width = w;
    this.height = h;
    this.cells = cells;
    this.pushHistory({ type: 'snapshot', before, after: this.snapshot() });
    this.clampProgress();
    return true;
  }

  /** 모든 칸을 바탕으로. 이것도 되돌리기로 살아납니다. */
  clear() {
    if (!this.painted) return false;
    const before = this.snapshot();
    this.cells = new Array(this.width * this.height).fill(null);
    this.pushHistory({ type: 'snapshot', before, after: this.snapshot() });
    this.clampProgress();
    return true;
  }

  snapshot() {
    return { width: this.width, height: this.height, cells: [...this.cells] };
  }

  applySnapshot(s) {
    this.width = s.width;
    this.height = s.height;
    this.cells = [...s.cells];
  }

  pushHistory(entry) {
    this.undoStack.push(entry);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  undo() { return this.travel(this.undoStack, this.redoStack, 'before'); }
  redo() { return this.travel(this.redoStack, this.undoStack, 'after'); }

  travel(from, to, side) {
    const entry = from.pop();
    if (!entry) return false;
    if (entry.type === 'cells') {
      const pick = side === 'before' ? 1 : 2;
      entry.changes.forEach((change) => { this.cells[change[0]] = change[pick]; });
    } else {
      this.applySnapshot(entry[side]);
    }
    to.push(entry);
    this.clampProgress();
    return true;
  }

  /* ── 색 ───────────────────────────────────────────────── */

  /** 팔레트에 색을 넣습니다. 이미 있으면 그대로 두고, 꽉 찼으면 false. */
  addColor(hex) {
    const color = normalizeHex(hex);
    if (!color) return false;
    if (this.palette.includes(color)) return true;
    if (this.palette.length >= MAX_PALETTE) return false;
    this.palette.push(color);
    return true;
  }

  /** 팔레트에서만 뺍니다. 이미 그 색으로 칠한 칸은 그대로 남습니다. */
  removeColor(hex) {
    const before = this.palette.length;
    this.palette = this.palette.filter((c) => c !== hex);
    return this.palette.length !== before;
  }

  setBg(hex) {
    const color = normalizeHex(hex);
    if (!color || color === this.bg) return false;
    this.bg = color;
    return true;
  }

  /* ── 읽기 ─────────────────────────────────────────────── */

  setStyle(style) {
    if (style !== 'flat' && style !== 'round') return false;
    if (style === this.style) return false;
    this.style = style;
    this.clampProgress();
    return true;
  }

  /** 'rtl'(오른쪽→왼쪽) | 'ltr'. 1단은 겉면이라 늘 오른쪽부터 읽습니다. */
  direction(row) {
    return this.style === 'round' || row % 2 === 1 ? 'rtl' : 'ltr';
  }

  /** 평면뜨기에서 겉면/안면. 원통뜨기는 늘 겉면만 봅니다. */
  side(row) {
    return this.style === 'round' || row % 2 === 1 ? 'RS' : 'WS';
  }

  /**
   * 한 단을 읽는 순서대로 같은 색 구간으로 나눕니다.
   * @returns {{color:string, count:number, xs:number[]}[]}
   */
  runs(row) {
    if (row < 1 || row > this.height) return [];
    const y = this.yOfRow(row);
    const xs = Array.from({ length: this.width }, (_, i) => i);
    if (this.direction(row) === 'rtl') xs.reverse();
    const out = [];
    xs.forEach((x) => {
      const color = this.colorAt(x, y);
      const last = out[out.length - 1];
      if (last && last.color === color) {
        last.count += 1;
        last.xs.push(x);
      } else {
        out.push({ color, count: 1, xs: [x] });
      }
    });
    return out;
  }

  /* ── 진행 ─────────────────────────────────────────────── */
  /* 각 동작은 무슨 일이 있었는지 돌려줍니다: 'run'(구간 하나), 'row'(단이
     넘어감), 'complete'(마지막 단까지 다 뜸), 아무것도 못 했으면 null. */

  get complete() { return this.progress.rows >= this.height; }
  /** 지금 뜨는 단. 다 떴으면 null. */
  get workingRow() { return this.complete ? null : this.progress.rows + 1; }
  get fraction() { return this.progress.rows / this.height; }

  nextRun() {
    if (this.complete) return null;
    const runs = this.runs(this.workingRow);
    this.progress.runs += 1;
    if (this.progress.runs < runs.length) return 'run';
    return this.finishRow();
  }

  nextRow() {
    if (this.complete) return null;
    return this.finishRow();
  }

  finishRow() {
    this.progress.rows += 1;
    this.progress.runs = 0;
    return this.complete ? 'complete' : 'row';
  }

  /** 구간 하나 풀기 — 단 맨 앞에 있으면 앞 단의 마지막 구간으로 넘어갑니다. */
  backRun() {
    const p = this.progress;
    if (p.runs > 0) {
      p.runs -= 1;
      return 'run';
    }
    if (p.rows <= 0) return null;
    p.rows -= 1;
    p.runs = Math.max(0, this.runs(p.rows + 1).length - 1);
    return 'run';
  }

  /** 한 단 풀기 — 단 중간이면 그 단 처음으로, 처음이면 앞 단 전체를. */
  backRow() {
    const p = this.progress;
    if (p.runs > 0) {
      p.runs = 0;
      return 'row';
    }
    if (p.rows <= 0) return null;
    p.rows -= 1;
    return 'row';
  }

  /** 칸을 눌러 "여기까지 떴어요" — 그 칸이 든 구간까지 다 뜬 것으로. */
  jumpTo(x, y) {
    if (!this.inBounds(x, y)) return null;
    const row = this.rowOfY(y);
    const runs = this.runs(row);
    const k = runs.findIndex((run) => run.xs.includes(x));
    this.progress.rows = row - 1;
    this.progress.runs = k + 1;
    if (this.progress.runs >= runs.length) return this.finishRow();
    return 'run';
  }

  resetProgress() {
    const had = this.progress.rows > 0 || this.progress.runs > 0;
    this.progress = { rows: 0, runs: 0 };
    return had;
  }

  /** 크기·칸·읽는 방식이 바뀌어 구간 수가 달라졌을 때 진행을 맞춥니다. */
  clampProgress() {
    const p = this.progress;
    p.rows = clampInt(p.rows, 0, this.height);
    if (this.complete) {
      p.runs = 0;
    } else {
      p.runs = clampInt(p.runs, 0, Math.max(0, this.runs(p.rows + 1).length - 1));
    }
  }

  /* ── 저장 ─────────────────────────────────────────────── */
  /* 칸은 색 목록의 번호로 줄여 저장합니다(-1 = 바탕). 되돌리기 기록은
     저장하지 않습니다 — 새로 열면 지금 모습에서 시작합니다. */

  serialize() {
    const colors = [...new Set(this.cells.filter(Boolean))];
    const lookup = new Map(colors.map((c, i) => [c, i]));
    return {
      schema: SCHEMA,
      width: this.width,
      height: this.height,
      bg: this.bg,
      palette: [...this.palette],
      colors,
      cells: this.cells.map((c) => (c === null ? -1 : lookup.get(c))),
      style: this.style,
      progress: { ...this.progress }
    };
  }

  /** 저장해둔 값을 되돌립니다. 하나라도 이상하면 아무것도 안 바꾸고 false. */
  restore(data) {
    if (!data || typeof data !== 'object' || data.schema !== SCHEMA) return false;
    const { width, height } = data;
    const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!intIn(width, LIMITS.minW, LIMITS.maxW) || !intIn(height, LIMITS.minH, LIMITS.maxH)) return false;
    const bg = normalizeHex(data.bg);
    if (!bg) return false;
    if (!Array.isArray(data.palette) || !Array.isArray(data.colors) || !Array.isArray(data.cells)) return false;
    const palette = data.palette.map(normalizeHex);
    const colors = data.colors.map(normalizeHex);
    if (palette.includes(null) || colors.includes(null)) return false;
    if (data.cells.length !== width * height) return false;
    if (!data.cells.every((v) => intIn(v, -1, colors.length - 1))) return false;
    if (data.style !== 'flat' && data.style !== 'round') return false;
    const p = data.progress;
    if (!p || !intIn(p.rows, 0, height) || !intIn(p.runs, 0, width)) return false;

    this.width = width;
    this.height = height;
    this.bg = bg;
    this.palette = palette.slice(0, MAX_PALETTE);
    this.cells = data.cells.map((v) => (v === -1 ? null : colors[v]));
    this.style = data.style;
    this.progress = { rows: p.rows, runs: p.runs };
    this.undoStack = [];
    this.redoStack = [];
    this.clampProgress();
    return true;
  }
}
