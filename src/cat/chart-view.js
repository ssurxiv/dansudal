/*!
 * 함뜨마을 동물 친구들 — 카냥이 도안 화면
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 도안(chart.js)을 캔버스에 그리고, 화면 좌표를 칸 좌표로 바꿉니다.
 * 종이 도안과 같은 약속을 따릅니다:
 *   - 단 번호는 그 단을 읽기 시작하는 쪽에 둡니다(평면뜨기면 겉면 단은
 *     오른쪽, 안면 단은 왼쪽 — 번호만 봐도 지그재그 방향이 보입니다).
 *   - 코 번호는 오른쪽 끝이 1코입니다.
 *   - 5칸마다 조금 진하게, 10칸마다 굵게 선을 긋습니다(오른쪽·아래 기준).
 * 뜨기 화면에서는 다 뜬 칸을 옅게 덮고, 다 뜬 단 끝에 발도장을 찍고,
 * 지금 단과 지금 구간을 테두리로 짚어줍니다.
 */

const LABEL_W = 22;
const LABEL_W_TIGHT = 14; // 칸이 아주 작을 때(넓은 도안·좁은 화면)
const TOP = 6;
const BOTTOM = 18;
const MIN_CELL = 6;
const MAX_CELL = 28;

export class ChartView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = 16;
    this.label = LABEL_W;
    this.cssW = 0;
    this.cssH = 0;
  }

  /** 담을 폭(availWidth, CSS px)에 맞춰 칸 크기를 정하고 캔버스 크기를 잡습니다. */
  layout(chart, availWidth) {
    let label = LABEL_W;
    let cell = Math.floor((availWidth - label * 2) / chart.width);
    if (cell < 10) {
      label = LABEL_W_TIGHT;
      cell = Math.floor((availWidth - label * 2) / chart.width);
    }
    cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
    this.cell = cell;
    this.label = label;
    this.cssW = label * 2 + cell * chart.width;
    this.cssH = TOP + cell * chart.height + BOTTOM;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** 화면 좌표 → 칸. 도안 밖이면 null(clamp 면 가장 가까운 칸). */
  cellFromPoint(chart, clientX, clientY, clamp = false) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - this.label) / this.cell);
    const y = Math.floor((clientY - rect.top - TOP) / this.cell);
    if (clamp) {
      return {
        x: Math.max(0, Math.min(chart.width - 1, x)),
        y: Math.max(0, Math.min(chart.height - 1, y))
      };
    }
    return chart.inBounds(x, y) ? { x, y } : null;
  }

  /**
   * @param {import('./chart.js').Chart} chart
   * @param {object} opts
   * @param {'edit'|'knit'} opts.mode
   * @param {{x0:number,y0:number,x1:number,y1:number,color:string|null}|null} [opts.preview]
   *   사각형 채우기를 끌고 있는 동안의 미리보기
   * @param {{ink:string, muted:string, accent:string, veil:string}} opts.colors
   */
  draw(chart, { mode, preview = null, colors }) {
    const { ctx, cell, label } = this;
    const W = chart.width;
    const H = chart.height;
    const left = label;
    const top = TOP;
    const cx = (x) => left + x * cell;
    const cy = (y) => top + y * cell;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // 칸 색
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        ctx.fillStyle = chart.colorAt(x, y);
        ctx.fillRect(cx(x), cy(y), cell, cell);
      }
    }

    // 사각형 미리보기 — 칠해질 색으로 덮고 점선 테두리
    if (preview) {
      const [x0, x1] = [Math.min(preview.x0, preview.x1), Math.max(preview.x0, preview.x1)];
      const [y0, y1] = [Math.min(preview.y0, preview.y1), Math.max(preview.y0, preview.y1)];
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = preview.color ?? chart.bg;
      ctx.fillRect(cx(x0), cy(y0), (x1 - x0 + 1) * cell, (y1 - y0 + 1) * cell);
      ctx.globalAlpha = 1;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.ink;
      ctx.strokeRect(cx(x0) + 1, cy(y0) + 1, (x1 - x0 + 1) * cell - 2, (y1 - y0 + 1) * cell - 2);
      ctx.setLineDash([]);
    }

    // 뜨기 화면: 다 뜬 칸은 옅게
    const p = chart.progress;
    const working = chart.workingRow;
    if (mode === 'knit') {
      ctx.fillStyle = colors.veil;
      for (let row = 1; row <= p.rows; row++) ctx.fillRect(cx(0), cy(chart.yOfRow(row)), W * cell, cell);
      if (working) {
        const y = chart.yOfRow(working);
        chart.runs(working).slice(0, p.runs).forEach((run) => {
          run.xs.forEach((x) => ctx.fillRect(cx(x), cy(y), cell, cell));
        });
      }
    }

    // 칸 선 — 1칸마다 옅게, 5칸마다 조금 진하게, 10칸마다 굵게.
    // 코는 오른쪽 끝, 단은 맨 아래가 1이라 거기서부터 셉니다.
    const lineFor = (n) => (n % 10 === 0 ? ['rgba(30,34,46,0.6)', 1.5]
      : n % 5 === 0 ? ['rgba(30,34,46,0.34)', 1]
        : ['rgba(30,34,46,0.16)', 1]);
    const thin = cell >= 7;
    for (let bx = 1; bx < W; bx++) {
      const n = W - bx;
      if (!thin && n % 5 !== 0) continue;
      const [color, width] = lineFor(n);
      ctx.fillStyle = color;
      ctx.fillRect(cx(bx) - width / 2, cy(0), width, H * cell);
    }
    for (let by = 1; by < H; by++) {
      const n = H - by;
      if (!thin && n % 5 !== 0) continue;
      const [color, width] = lineFor(n);
      ctx.fillStyle = color;
      ctx.fillRect(cx(0), cy(by) - width / 2, W * cell, width);
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.ink;
    ctx.strokeRect(cx(0) - 0.75, cy(0) - 0.75, W * cell + 1.5, H * cell + 1.5);

    // 뜨기 화면: 지금 단(강조색)과 지금 구간(진하게)
    if (mode === 'knit' && working) {
      const y = chart.yOfRow(working);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.accent;
      ctx.strokeRect(cx(0) - 1, cy(y) - 1, W * cell + 2, cell + 2);
      const run = chart.runs(working)[p.runs];
      if (run) {
        const x0 = Math.min(...run.xs);
        const x1 = Math.max(...run.xs);
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors.ink;
        ctx.strokeRect(cx(x0) + 1.5, cy(y) + 1.5, (x1 - x0 + 1) * cell - 3, cell - 3);
      }
    }

    // 단 번호 — 그 단을 읽기 시작하는 쪽. 칸이 작으면 1단과 5단마다만.
    const fontSize = Math.max(8, Math.min(11, Math.round(cell * 0.62)));
    ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const everyRow = cell >= 12;
    for (let row = 1; row <= H; row++) {
      const y = cy(chart.yOfRow(row)) + cell / 2;
      const startsRight = chart.direction(row) === 'rtl';
      const isWorking = mode === 'knit' && row === working;
      if (everyRow || row === 1 || row % 5 === 0 || isWorking) {
        ctx.fillStyle = isWorking ? colors.accent : colors.muted;
        ctx.font = `${isWorking ? '700 ' : ''}${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = startsRight ? 'left' : 'right';
        ctx.fillText(String(row), startsRight ? cx(W) + 4 : cx(0) - 4, y);
      }
      // 다 뜬 단은 끝나는 쪽에 발도장
      if (mode === 'knit' && row <= p.rows) {
        const mx = startsRight ? cx(0) - label / 2 : cx(W) + label / 2;
        drawPaw(ctx, mx, y, Math.min(cell, label - 6), colors.accent);
      }
    }

    // 코 번호 — 오른쪽 끝이 1코
    ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.muted;
    const step = cell >= 12 ? 5 : 10;
    for (let s = 1; s <= W; s++) {
      if (s !== 1 && s % step !== 0) continue;
      ctx.fillText(String(s), cx(W - s) + cell / 2, cy(H) + 4);
    }
  }
}

/** 작은 발도장(발바닥 하나 + 발가락 셋). 너무 작으면 점 하나. */
function drawPaw(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  if (size < 8) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, size / 3), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const s = size / 10;
  ctx.beginPath();
  ctx.ellipse(x, y + 1.6 * s, 2.6 * s, 2.1 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  [[-2.7, -1.6], [0, -2.9], [2.7, -1.6]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, 1.15 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}
