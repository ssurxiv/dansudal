/*!
 * 함뜨마을 동물 친구들 — 카냥이 스프라이트 데이터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * 이 파일의 픽셀아트 데이터는 저작권 보호 대상입니다.
 * 무단 추출·재사용·재배포를 금합니다.
 * https://instagram.com/tteoboja_0
 *
 * 몸통과 머리 실루엣은 단수달 것을 그대로 빌리고(코토키와 같은 방식),
 * 고양이다운 부분 — 세모 귀, 얼굴, 수염, 꼬리, 젤리 — 만 새로 그립니다.
 * 캐릭터 방향은 "약간 새초롬한 고양이": 내리깐 동글눈에 눈꼬리 속눈썹,
 * 입은 작은 ㅅ. 시안 비교 페이지에서 사용자가 고른 조합(눈 D · 회청색 ·
 * 작은 귀 · 오른쪽 세운 꼬리)입니다.
 *
 * 카냥이는 단수 카운터가 아니라 도안을 칠하는 친구라 engine.js 의
 * Companion(실 보존·뜨개감)을 쓰지 않습니다. 대신 kitty.js 가 이 팩을
 * 직접 그립니다.
 */

import { pad, buffer, put, shiftRows } from '../pixel.js';
import {
  body as otterBody,
  head as otterHead,
  WIDTH,
  SPARK,
  sparkles as otterSparkles,
  sparkleBurst as otterSparkleBurst
} from '../otter/sprites.js';

export { WIDTH, SPARK };

/* 캔버스는 33 × 44 입니다. 위로 4줄은 귀가 설 자리(SHIFT), 아래로
   8줄은 다 뜬 도안이 양탄자로 깔릴 바닥(FLOOR)입니다. 바닥을 4줄로
   잡았을 땐 양탄자 대부분이 고양이 몸에 가려 무늬가 하나도 안 보였습니다.
   단수달 좌표로 그린 스프라이트는 전부 SHIFT 만큼 내려 씁니다. */
export const SHIFT = 4;
export const FLOOR = 8;
export const HEIGHT = 32 + SHIFT + FLOOR;
const shift = (sprite) => shiftRows(sprite, SHIFT, HEIGHT);
const padC = (buf) => pad(buf, HEIGHT, WIDTH);
// 33열이라 대칭축이 가운데 열(x16) 위에 있습니다 — 픽셀 x 의 거울은
// 32 - x, 픽셀 중심(x + 0.5)으로 재는 연속 좌표의 거울은 33 - x 입니다.
const mirror = (x) => 32 - x;

/* ── 팔레트 ───────────────────────────────────────────────── */
/* 단수달 BODY 와 같은 키를 써서 빌려 온 몸통·머리가 그대로 칠해집니다.
   n(코)만 더했습니다. 갈색(단수달)·분홍(코토키)과 겹치지 않는 차가운
   회청색(러시안블루)이라 탭 색도 이 계열입니다. */
export const BODY = {
  o: '#3d4354', // 외곽선·수염
  b: '#a3adbf', // 털
  a: '#8792a8', // 그늘
  l: '#eef1f6', // 주둥이·배
  e: '#262a36', // 눈
  w: '#ffffff', // 눈 하이라이트·흰자
  f: '#e79aa8', // 귀 안쪽·볼터치·젤리
  m: '#5d6577', // 입
  p: '#eef1f6', // 앞발
  n: '#e0899a'  // 코
};

/* ── 몸통 ─────────────────────────────────────────────────── */

export const body = shift(otterBody);

/* ── 귀 ───────────────────────────────────────────────────── */
/* 낮고 넓은 세모 귀(시안 귀 B). 밑변 가운데를 머리 윗모서리에 두고
   바깥으로 12도 기울입니다. 머리보다 먼저 그려서 밑동은 머리에
   가려집니다. 좌표는 이미 밀린(최종) 좌표입니다. */
const EAR_BASE_X = 9.2;
const EAR_BASE_Y = 9.5;
const EAR_HALF_W = 4.2;
const EAR_H = 9.5;
const EAR_TILT = 12;

function triEar(buf, bx, by, angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const toLocal = (x, y) => {
    const dx = x - bx;
    const dy = y - by;
    return [dx * c + dy * s, -dx * s + dy * c];
  };
  // 로컬 좌표: 밑변이 y=0(x ∈ ±반폭), 꼭짓점이 (0, -높이). inset 만큼
  // 안으로 줄인 세모 안인지 봅니다.
  const inside = (lx, ly, inset) => {
    if (ly > -inset) return false;
    const t = -ly / EAR_H;
    return t <= 1 && Math.abs(lx) <= EAR_HALF_W * (1 - t) - inset * 1.15;
  };
  // 안쪽 분홍은 바깥쪽으로 살짝 치우쳐야 귀 안이 정면을 보는 것처럼
  // 읽힙니다(가운데에 두면 납작한 세모 무늬로 보였습니다).
  const lean = -0.6 * Math.sign(bx - 16.5);
  const layers = [[0, 'o', 0], [1, 'b', 0], [1.9, 'f', lean]];
  layers.forEach(([inset, ch, dx]) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const [lx, ly] = toLocal(x + 0.5, y + 0.5);
        if (inside(lx + dx, ly + (inset === 0 ? 0.01 : 0), inset)) put(buf, x, y, ch);
      }
    }
  });
}

export const ears = (() => {
  const buf = buffer();
  triEar(buf, EAR_BASE_X, EAR_BASE_Y, -EAR_TILT);
  triEar(buf, WIDTH - EAR_BASE_X, EAR_BASE_Y, EAR_TILT);
  return padC(buf);
})();

/* ── 얼굴 ─────────────────────────────────────────────────── */
/* 단수달 머리의 외곽선은 그대로 두고 얼굴 줄(9~18)의 안쪽만 털로 비운 뒤
   고양이 얼굴을 찍습니다. 아래 좌표는 밀기 전(단수달) 좌표이고, 왼쪽만
   적으면 both() 가 오른쪽을 거울로 찍습니다. 단, 하이라이트·흰자처럼
   빛 방향이나 시선을 따르는 점은 거울이 아니라 두 눈 같은 쪽입니다. */
const FACE_TOP = 9;
const FACE_BOTTOM = 18;

const blankHead = otterHead.map((row, y) => {
  if (y < FACE_TOP || y > FACE_BOTTOM) return row;
  const l = row.indexOf('o');
  const r = row.lastIndexOf('o');
  return row.slice(0, l + 1) + 'b'.repeat(r - l - 1) + row.slice(r);
});

const both = (x, y, ch) => [[x, y, ch], [mirror(x), y, ch]];
const span = (y, x0, x1, ch) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, ch]);
const block = (xs, ys, ch) => ys.flatMap((y) => xs.flatMap((x) => both(x, y, ch)));

function stamp(rows, marks) {
  const out = rows.map((r) => r.split(''));
  marks.forEach(([x, y, ch]) => { if (out[y]) out[y][x] = ch; });
  return out.map((r) => r.join(''));
}

// 주둥이 — 단수달의 뺨까지 퍼진 띠 대신 코 밑에서 턱으로 퍼지는 반원.
const MUZZLE = [
  ...span(15, 13, 19, 'l'),
  ...span(16, 12, 20, 'l'),
  ...span(17, 11, 21, 'l'),
  ...span(18, 9, 23, 'l')
];
// 역삼각 분홍 코와 작은 ㅅ 입. 입은 다른 친구들처럼 작게 둡니다.
const NOSE = [...span(14, 15, 17, 'n'), [16, 15, 'n']];
const MOUTH = [[15, 16, 'm'], [17, 16, 'm']];
const BLUSH = [...both(7, 14, 'f'), ...both(8, 14, 'f')];
// 수염은 머리 외곽선 바깥으로만 뻗습니다. 안쪽까지 그으면 털 위에 선이
// 그어져 얼굴이 지저분해졌습니다.
const WHISKERS = [
  ...both(3, 14, 'o'), ...both(2, 14, 'o'), ...both(1, 13, 'o'),
  ...both(3, 16, 'o'), ...both(2, 17, 'o'), ...both(4, 16, 'o')
];

// 까만 3×3 눈(x10~12 / x20~22, y11~13). 윗줄을 눈꺼풀(외곽선 색)로 덮어
// 내리깔고, 눈꼬리에 속눈썹 한 칸을 올립니다.
const EYE_X = [10, 11, 12];
const LID = [...[9, 10, 11, 12].flatMap((x) => both(x, 11, 'o')), ...both(8, 10, 'o')];

const EYES = {
  // 평소 — 시큰둥하게 내려다보는 눈. 하이라이트는 두 눈 다 왼쪽.
  neutral: [...block(EYE_X, [11, 12, 13], 'e'), ...LID, [10, 12, 'w'], [20, 12, 'w']],
  // 깜빡 — 눈꺼풀이 맨 아래 줄까지 내려옵니다.
  blink: [...[9, 10, 11, 12].flatMap((x) => both(x, 13, 'o')), ...both(8, 12, 'o')],
  // 흥 — 흰자를 안쪽에 남겨 눈동자를 바깥으로 흘깁니다. 고개 돌리기와
  // 같이 써야 평소 얼굴(이미 내리깐 눈)과 확실히 갈립니다.
  huff: [...block(EYE_X, [11, 12, 13], 'e'), ...LID,
    [10, 12, 'w'], [10, 13, 'w'], [20, 12, 'w'], [20, 13, 'w']],
  // 지그시 — 아래로 둥근 감은 눈(︶)에 속눈썹. 완성하고 뿌듯할 때.
  proud: [...both(9, 12, 'o'), ...both(10, 13, 'o'), ...both(11, 13, 'o'), ...both(12, 12, 'o'),
    ...both(8, 11, 'o')]
};

/** 얼굴 줄에서 외곽선 안쪽만 dx 칸 밀어 고개를 돌린 것처럼 보이게 합니다
    (tools/readme-gifs.mjs 의 turnHead 와 같은 방식). */
function turn(rows, dx) {
  if (!dx) return rows;
  return rows.map((row, y) => {
    if (y < FACE_TOP || y > FACE_BOTTOM) return row;
    const l = row.indexOf('o');
    const r = row.lastIndexOf('o');
    const inner = row.slice(l + 1, r);
    const moved = dx > 0
      ? inner[0].repeat(dx) + inner.slice(0, -dx)
      : inner.slice(-dx) + inner[inner.length - 1].repeat(-dx);
    return row.slice(0, l + 1) + moved + row.slice(r);
  });
}

function makeHead(eyes, look = 0) {
  let rows = stamp(blankHead, [...MUZZLE, ...NOSE, ...MOUTH, ...BLUSH]);
  rows = turn(stamp(rows, eyes), look);
  // 수염은 돌린 뒤에 찍어야 머리 밖에서 제자리를 지킵니다.
  return shift(stamp(rows, WHISKERS));
}

const LOOK_AWAY = 2;
export const heads = {
  neutral: makeHead(EYES.neutral),
  blink: makeHead(EYES.blink),
  huff: makeHead(EYES.huff, LOOK_AWAY),
  proud: makeHead(EYES.proud)
};

/* ── 꼬리 ─────────────────────────────────────────────────── */
/* 몸통 오른쪽 뒤에서 나와 옆선을 따라 세우고 끝만 바깥으로 꺾은 가는
   꼬리. 굵기는 원을 베지어 곡선을 따라 찍어 냅니다. 처음엔 왼쪽에
   그렸다가 오른쪽으로 옮겨서(사용자 요청), 왼쪽 곡선을 그린 뒤 좌우를
   뒤집습니다 — 33열이라 뒤집기만 해도 가운데 열 기준으로 정확히 대칭입니다. */
function disk(buf, cx, cy, r, ch) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(buf, x, y, ch);
    }
  }
}

function bezier(pts, t) {
  let p = pts;
  while (p.length > 1) {
    p = p.slice(1).map((q, i) => [p[i][0] + (q[0] - p[i][0]) * t, p[i][1] + (q[1] - p[i][1]) * t]);
  }
  return p[0];
}

const TAIL_PATH = [
  [[11, 29.5], [5.5, 30.6], [4.3, 28], [4.3, 24.5]],
  [[4.3, 24.5], [4.3, 22.3], [3.7, 21], [2.8, 20.6]]
];
const TAIL_OUTER = 1.7;
const TAIL_INNER = 0.65;

function drawTail(dx) {
  const buf = buffer();
  const samples = TAIL_PATH.flatMap((pts) => Array.from({ length: 61 }, (_, i) => bezier(pts, i / 60)));
  samples.forEach(([x, y]) => disk(buf, x + dx, y, TAIL_OUTER, 'o'));
  samples.forEach(([x, y]) => disk(buf, x + dx, y, TAIL_INNER, 'b'));
  return shift(pad(buf, 32, WIDTH)).map((row) => [...row].reverse().join(''));
}

// 흔들 땐 꼬리 끝이 몸 쪽으로 한 칸 들어옵니다(뒤집기 전 좌표라 +1).
const TAIL_FRAMES = [drawTail(0), drawTail(1)];
export function tail(wag = 0) {
  return TAIL_FRAMES[wag ? 1 : 0];
}

/* ── 앞발 ─────────────────────────────────────────────────── */
/* 앉아 있을 때 앞발 둘(단수달 앞발 모양을 그대로, 4×3). 들어 올린 발
   쪽은 빼고 그릴 수 있게 한쪽씩 그립니다. 최종 좌표입니다. */
const REST_PAW_L = [10, 27 + SHIFT];
const REST_PAW_R = [19, 27 + SHIFT];

function restPaw(buf, [x, y]) {
  ['oooo', 'oppo', 'oooo'].forEach((row, dy) => {
    [...row].forEach((ch, dx) => put(buf, x + dx, y + dy, ch));
  });
}

export function restPaws({ left = true, right = true } = {}) {
  const buf = buffer();
  if (left) restPaw(buf, REST_PAW_L);
  if (right) restPaw(buf, REST_PAW_R);
  return padC(buf);
}

/* 들어 올린 왼발 — 발바닥이 보이게 들어서 분홍 젤리(발가락 셋 + 큰
   발바닥, f)가 드러납니다. 칠할 땐 kitty.js 가 f 를 고른 색으로 바꿔
   칠해서 젤리에 물감이 묻어나 보입니다. 오른발을 들면 오른쪽 꼬리와
   겹쳐서 왼발로 칠합니다. 몸통 왼쪽 가장자리에 걸쳐야 팔 없이도 발이
   몸에 붙어 보입니다(머리 옆으로 올렸더니 팔이 가려져 발만 떴습니다). */
const RAISED_PAW = [
  '.ooooo.',
  'ofpfpfo',
  'opppppo',
  'opfffpo',
  'opfffpo',
  '.ooooo.'
];

const PAW_POSES = {
  up: [4, 19 + SHIFT],
  // 지우개질 — 들어 올린 발을 좌우로 문지릅니다.
  wipeL: [3, 20 + SHIFT],
  wipeR: [5, 20 + SHIFT]
};

export function raisedPaw(pose = 'up') {
  const [x, y] = PAW_POSES[pose] ?? PAW_POSES.up;
  const buf = buffer();
  RAISED_PAW.forEach((row, dy) => {
    [...row].forEach((ch, dx) => { if (ch !== '.') put(buf, x + dx, y + dy, ch); });
  });
  return padC(buf);
}

/* ── 반짝임 ───────────────────────────────────────────────── */

export function sparkles(frame) { return shift(otterSparkles(frame)); }
export function sparkleBurst() { return shift(otterSparkleBurst()); }

/* ── 양탄자 ───────────────────────────────────────────────── */
/* 다 뜬 도안은 고양이가 앉는 양탄자가 됩니다. 바닥에 깔린 모양이라 앞이
   넓고 뒤가 좁은 사다리꼴이고, 뒤쪽은 고양이 몸에 가려 옆으로만
   보입니다. 1단(도안 맨 아래)이 앞쪽 끝이라, 뜰수록 앞에서부터 뒤로
   자랍니다. 무늬는 도안을 줄여서 칠합니다 — 양탄자 한 픽셀이 도안 몇
   칸을 덮는지(u·v 구간)를 넘겨, 고르는 쪽이 그 칸들에서 색을 정합니다.
   색이 정해져 있지 않으므로 문자 스프라이트가 아니라 [x, y, 색] 목록으로
   내줍니다. */
export const RUG = {
  back: 31,       // 뒤쪽 테두리 줄 (고양이 몸 뒤)
  front: 42,      // 앞쪽 테두리 줄
  backLeft: 5,    // 뒤쪽 테두리의 왼쪽 끝 x (오른쪽은 거울)
  frontLeft: 1,
  edge: '#5a5f6e'
};
const RUG_ROWS = RUG.front - RUG.back - 1; // 무늬가 들어가는 줄 수 (10)

function rugLeft(y) {
  const t = (y - RUG.back) / (RUG.front - RUG.back);
  return Math.round(RUG.backLeft + (RUG.frontLeft - RUG.backLeft) * t);
}

/**
 * @param {(u0:number, u1:number, v0:number, v1:number) => string} sample
 *   양탄자 픽셀 하나가 덮는 도안 구간의 색. u 는 왼쪽 0 → 오른쪽 1,
 *   v 는 앞(1단) 0 → 뒤(맨 윗단) 1
 * @param {number} fraction  다 뜬 비율(0~1). 0 이면 아무것도 없습니다.
 * @param {string} fringe   술 색
 * @returns {Array<[number, number, string]>}
 */
export function rugPixels(sample, fraction, fringe) {
  if (!(fraction > 0)) return [];
  const shown = Math.max(1, Math.min(RUG_ROWS, Math.ceil(fraction * RUG_ROWS)));
  const top = RUG.front - shown - 1; // 지금까지 뜬 만큼의 뒤쪽 테두리
  const px = [];
  for (let y = top; y <= RUG.front; y++) {
    const left = rugLeft(y);
    const right = mirror(left);
    for (let x = left; x <= right; x++) {
      const edge = y === top || y === RUG.front || x === left || x === right;
      if (edge) {
        px.push([x, y, RUG.edge]);
      } else {
        const inner = right - left - 1;
        const u0 = (x - left - 1) / inner;
        const v0 = (RUG.front - 1 - y) / RUG_ROWS;
        px.push([x, y, sample(u0, u0 + 1 / inner, v0, v0 + 1 / RUG_ROWS)]);
      }
    }
  }
  // 앞쪽 끝의 술 — 한 칸 걸러 하나씩. 33열이라 좌우 대칭이 맞습니다.
  const fl = rugLeft(RUG.front);
  for (let x = fl + 1; x <= mirror(fl) - 1; x += 2) px.push([x, RUG.front + 1, fringe]);
  return px;
}
