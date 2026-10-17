/*!
 * 함뜨마을 동물 친구들 — 묘카 도안 화면
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 도안(chart.js)을 캔버스에 그리고, 화면 좌표를 칸 좌표로 바꿉니다.
 * 종이 도안과 같은 약속을 따릅니다:
 *   - 단 번호는 그 단을 읽기 시작하는 쪽에 둡니다(평면뜨기면 겉면 단은
 *     오른쪽, 안면 단은 왼쪽 — 번호만 봐도 지그재그 방향이 보입니다).
 *   - 코 번호는 오른쪽 끝이 1코입니다.
 *   - 5칸마다 조금 진하게, 10칸마다 굵게 선을 긋습니다(오른쪽·아래 기준).
 * 칠한 칸은 네모로 꽉 채우고, 그중 몇 칸에만 같은 색 계열로 발도장이
 * 찍혀 있습니다(묘카가 젤리로 찍은 자국). 처음엔 모든 칸을 발도장으로
 * 찍었는데, 칸이 많아지면 작은 무늬가 빼곡히 반복돼 징그럽다는 반응이
 * 있었습니다. 칸이 너무 작으면 발도장은 생략합니다.
 * 뜨기 화면에서는 아직 안 뜬 칸을 흐리게 덮어서, 뜰수록 원래 색이
 * 진하게 채워집니다(실제로 뜨면 그 칸이 생기는 것처럼). 다 뜬 단 끝엔
 * 발도장을 찍고, 지금 단과 지금 구간을 테두리로 짚어줍니다. 도안
 * 그리기 화면은 늘 원래 색 그대로입니다.
 */

const LABEL_W = 22;
const LABEL_W_TIGHT = 14; // 칸이 아주 작을 때(넓은 도안·좁은 화면)
const TOP = 6;
const BOTTOM = 18;
const MIN_CELL = 6;
const MAX_CELL = 28;
const MIN_PAW_CELL = 10; // 이보다 작은 칸엔 발도장을 안 찍습니다
const PAW_SHARE = 0.12;   // 칠한 칸 중 발도장이 찍힌 칸의 비율(대략)

/* 칸 자리마다 늘 같은 값이 나오는 의사난수(0~1). 다시 그릴 때마다
   발도장 자리가 바뀌면 화면이 지글거리니 자리로만 정합니다. */
function hash01(x, y) {
  let h = Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hasPaw = (x, y) => hash01(x, y) < PAW_SHARE;

/* 발도장 색 — 칸 색보다 살짝 진하게(어두운 칸이면 살짝 밝게). 칸과 전혀
   다른 색이면 도안의 색처럼 읽혀서, 같은 색의 자국으로만 보이게 합니다. */
const toneCache = new Map();
function pawTone(hex) {
  if (!toneCache.has(hex)) {
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lum = (0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]) / 255;
    // 남색처럼 중간보다 어두운 칸은 더 어둡게 찍으면 거의 안 보여서 밝게 찍습니다.
    const [target, t] = lum < 0.42 ? [255, 0.26] : [0, 0.2];
    toneCache.set(hex, `#${ch.map((c) => Math.round(c + (target - c) * t).toString(16).padStart(2, '0')).join('')}`);
  }
  return toneCache.get(hex);
}

export class ChartView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = 16;
    this.label = LABEL_W;
    this.cssW = 0;
    this.cssH = 0;
  }

  /**
   * 담을 폭·높이(CSS px)에 맞춰 칸 크기를 정하고 캔버스 크기를 잡습니다.
   * 높이에도 맞추는 건 캐릭터와 도안 전체가 한 화면에 같이 보이게 하려는
   * 것입니다 — 폭에만 맞췄을 땐 노트북 화면에서 도안 아래쪽이 잘려,
   * 거기를 칠하려고 내리면 캐릭터가 화면 밖으로 나갔습니다.
   */
  layout(chart, availWidth, availHeight = Infinity) {
    let label = LABEL_W;
    let cell = Math.floor((availWidth - label * 2) / chart.width);
    if (cell < 10) {
      label = LABEL_W_TIGHT;
      cell = Math.floor((availWidth - label * 2) / chart.width);
    }
    cell = Math.min(cell, Math.floor((availHeight - TOP - BOTTOM) / chart.height));
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
   * @param {{boxes:{x0:number,y0:number,x1:number,y1:number}[], color:string}|null} [opts.preview]
   *   사각형 채우기를 끌고 있는 동안의 미리보기(대칭이면 상자가 여럿)
   * @param {{x0:number,y0:number,x1:number,y1:number}[]|null} [opts.hover]
   *   그리기 화면에서 커서 아래(붓 굵기만큼) 칸들 — 대칭이면 거울 자리까지
   * @param {'none'|'x'|'y'|'xy'} [opts.mirror] 그리기 화면에서 대칭 축을 점선으로
   * @param {{ink:string, muted:string, accent:string, veil:string}} opts.colors
   */
  draw(chart, { mode, preview = null, hover = null, mirror = 'none', colors }) {
    const { ctx, cell, label } = this;
    const W = chart.width;
    const H = chart.height;
    const left = label;
    const top = TOP;
    const cx = (x) => left + x * cell;
    const cy = (y) => top + y * cell;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // 바탕을 한 번에 깔고 칠한 칸을 채운 뒤, 정해진 몇 칸에만 발도장을
    // 찍습니다. 사각형을 끌고 있는 동안엔 그 안을 칠해질 색으로 미리 보여줍니다.
    const boxes = preview?.boxes ?? [];
    const inBox = (x, y) => boxes.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    ctx.fillStyle = chart.bg;
    ctx.fillRect(cx(0), cy(0), W * cell, H * cell);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const color = inBox(x, y) ? preview.color : chart.cellAt(x, y);
        if (color === null || color === chart.bg) continue;
        ctx.fillStyle = color;
        ctx.fillRect(cx(x), cy(y), cell, cell);
        if (cell >= MIN_PAW_CELL && hasPaw(x, y)) stampPaw(ctx, cx(x), cy(y), cell, pawTone(color));
      }
    }

    // 사각형 미리보기 테두리
    boxes.forEach(({ x0, x1, y0, y1 }) => {
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.ink;
      ctx.strokeRect(cx(x0) + 1, cy(y0) + 1, (x1 - x0 + 1) * cell - 2, (y1 - y0 + 1) * cell - 2);
      ctx.setLineDash([]);
    });

    // 뜨기 화면: 아직 안 뜬 칸은 흐리게 — 뜬 칸만 원래 색으로 진합니다.
    const p = chart.progress;
    const working = chart.workingRow;
    if (mode === 'knit') {
      ctx.fillStyle = colors.veil;
      for (let row = p.rows + 1; row <= H; row++) {
        const y = chart.yOfRow(row);
        if (row !== working) {
          ctx.fillRect(cx(0), cy(y), W * cell, cell);
          continue;
        }
        chart.runs(row).slice(p.runs).forEach((run) => {
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

    // 그리기 화면 대칭 축 — 도안 한가운데에 강조색 점선. 칸 수가 홀수면
    // 가운데 칸 한복판을 지나고, 그 칸은 자기 자신의 거울입니다.
    if (mode === 'edit' && mirror !== 'none') {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.accent;
      ctx.beginPath();
      if (mirror === 'x' || mirror === 'xy') {
        const ax = cx(0) + (W * cell) / 2;
        ctx.moveTo(ax, cy(0) - 4);
        ctx.lineTo(ax, cy(H) + 4);
      }
      if (mirror === 'y' || mirror === 'xy') {
        const ay = cy(0) + (H * cell) / 2;
        ctx.moveTo(cx(0) - 4, ay);
        ctx.lineTo(cx(W) + 4, ay);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 그리기 화면: 커서 아래 칸들(붓 굵기만큼) — 어두운 테두리 안에 흰
    // 테두리를 한 겹 더 둘러 칸 색이 밝든 어둡든 보이게 합니다.
    (hover ?? []).forEach((h) => {
      const hx = cx(h.x0);
      const hy = cy(h.y0);
      const hw = (h.x1 - h.x0 + 1) * cell;
      const hh = (h.y1 - h.y0 + 1) * cell;
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.ink;
      ctx.strokeRect(hx + 1, hy + 1, hw - 2, hh - 2);
      if (cell >= 8) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(hx + 2.5, hy + 2.5, hw - 5, hh - 5);
      }
    });

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
        const size = Math.min(cell, label - 4);
        const mx = startsRight ? cx(0) - label / 2 : cx(W) + label / 2;
        if (size >= 8) {
          stampPaw(ctx, mx - size / 2, y - size / 2, size, colors.accent);
        } else {
          ctx.fillStyle = colors.accent;
          ctx.beginPath();
          ctx.arc(mx, y, Math.max(1.5, size / 3), 0, Math.PI * 2);
          ctx.fill();
        }
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

/* 고양이 발도장 하나 — 발가락 넷이 둥글게 둘러싼 큰 발바닥. size × size
   칸의 왼쪽 위(x, y) 기준 비율로 잡아 칸 크기가 달라도 같은 모양입니다.
   바깥 발가락은 안쪽보다 조금 낮게 둬야 고양이 발로 읽힙니다(넷을 한 줄로
   세우면 꽃이나 구름 같았습니다). */
const TOES = [[0.18, 0.4, 0.1], [0.38, 0.23, 0.105], [0.62, 0.23, 0.105], [0.82, 0.4, 0.1]];
const PAD = [0.5, 0.68, 0.24, 0.195];

function stampPaw(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + PAD[0] * size, y + PAD[1] * size, PAD[2] * size, PAD[3] * size, 0, 0, Math.PI * 2);
  TOES.forEach(([tx, ty, r]) => {
    ctx.moveTo(x + (tx + r) * size, y + ty * size);
    ctx.arc(x + tx * size, y + ty * size, r * size, 0, Math.PI * 2);
  });
  ctx.fill();
}
