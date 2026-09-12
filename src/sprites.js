/*!
 * 단수달 (Knitting Companion) — 스프라이트 데이터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * 이 파일의 픽셀아트 데이터는 저작권 보호 대상입니다.
 * 무단 추출·재사용·재배포를 금합니다.
 * https://instagram.com/tteoboja_0
 */

import { pad, buffer, put, line } from './pixel.js';

export const SIGNATURE = '@tteoboja_0';

/* ── 팔레트 ───────────────────────────────────────────────── */

export const BODY = {
  o: '#6b4a30',  // 외곽선
  b: '#c08e5e',  // 몸통
  a: '#a3714a',  // 어깨 그늘
  l: '#f7e6cc',  // 배·주둥이·발바닥
  e: '#3b2a1c',  // 눈
  w: '#ffffff',  // 눈 하이라이트
  f: '#e0a89b',  // 볼터치·귀 안쪽
  m: '#7a5236',  // 코·입
  p: '#f7e6cc'   // 앞발
};

export const YARN = {
  k: '#3f7266',  // 실 외곽선
  y: '#9ad0c0',  // 실
  d: '#77b3a2',  // 코 무늬
  F: '#e8fff8'   // 새 단 반짝임
};

export const NEEDLE = {
  n: '#f7ebc6',  // 바늘 심
  g: '#4a3520',  // 바늘 테두리
  h: '#e0574f'   // 하트 마개
};

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? '');
  if (!m) return { r: 154, g: 208, b: 192 }; // 못 읽으면 원래 민트색(YARN.y)로.
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** amt>0 이면 흰색 쪽으로, amt<0 이면 검은색 쪽으로 그만큼 섞습니다. */
function shade(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const target = amt >= 0 ? 255 : 0;
  const p = Math.abs(amt);
  const mix = (c) => c + (target - c) * p;
  return rgbToHex(mix(r), mix(g), mix(b));
}

/**
 * 실 창고에서 고른 색 하나(base)로부터 실 스프라이트용 4색
 * (외곽선/실/코 무늬/반짝임)을 만들어냅니다. 기존 YARN 팔레트의
 * k/y/d/F 색 관계(외곽선은 크게 어둡게, 코 무늬는 살짝 어둡게,
 * 반짝임은 크게 밝게)를 그대로 흉내냅니다.
 */
export function paletteFor(base) {
  return {
    k: shade(base, -0.55),
    y: base,
    d: shade(base, -0.18),
    F: shade(base, 0.7)
  };
}

/* ── 고정 좌표 ────────────────────────────────────────────── */

export const LEFT_PIVOT = [8, 22];
export const RIGHT_PIVOT = [23, 22];
export const KNIT_TOP = 21;
export const MAX_KNIT = 9;

/* 어깨 — 몸통 실루엣의 가장자리 픽셀과 정확히 맞춥니다(body 20~21행
   참조). 팔이 여기서 시작해야 손이 몸에 붙어 보입니다. */
export const SHOULDER_L = [10, 21];
export const SHOULDER_R = [21, 21];

/* ── 몸 ───────────────────────────────────────────────────── */

const TAIL_ROWS = {
  24: '.....oooo.......................',
  25: '....obbbo.......................',
  26: '...obbbbo.......................',
  27: '..obbbbbo.......................',
  28: '..obbbbbo.......................',
  29: '...obbbbo.......................',
  30: '....ooooo.......................'
};

/**
 * 기본은 offset 0(고정 위치). 착용 중 신남을 표현할 땐 위아래로
 * 1px 씩 흔들리도록 offset 을 옮겨 찍습니다.
 */
export function tail(offset = 0) {
  if (offset === 0) return pad(TAIL_ROWS);
  const buf = buffer();
  Object.entries(TAIL_ROWS).forEach(([y, row]) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') put(buf, x, Number(y) + offset, row[x]);
    }
  });
  return pad(buf);
}

export const body = pad({
  20: '...........obbbbbbbbo...........',
  21: '..........obbbbbbbbbbo..........',
  22: '.........obbbbbbbbbbbbo.........',
  23: '.........obbbbbbbbbbbbo.........',
  24: '........obbbbbbbbbbbbbbo........',
  25: '........obbbbbbbbbbbbbbo........',
  26: '........obbbllllllllbbbo........',
  27: '........obbbllllllllbbbo........',
  28: '.........obbllllllllbbo.........',
  29: '..........ollbbbbbbllo..........',
  30: '..........oooooooooooo..........'
});

export const head = pad({
  2:  '...........oooooooooo...........',
  3:  '.........oobbbbbbbbbboo.........',
  4:  '........obbbbbbbbbbbbbbo........',
  5:  '.......obbbbbbbbbbbbbbbbo.......',
  6:  '......obbbbbbbbbbbbbbbbbbo......',
  7:  '......obbbbbbbbbbbbbbbbbbo......',
  8:  '.....obbbbbbbbbbbbbbbbbbbbo.....',
  9:  '.....obbbbbbbbbbbbbbbbbbbbo.....',
  10: '.....obbbweebbbbbbbbweebbbo.....',
  11: '.....obbbeeebbbbbbbbeeebbbo.....',
  12: '.....obbbeeebbbbbbbbeeebbbo.....',
  13: '....offfbeeebbbbbbbbeeebfffo....',
  14: '....offfbblllllmmlllllbbfffo....',
  15: '....offfbbllllllllllllbbfffo....',
  16: '.....offbbllllmmmmllllbbffo.....',
  17: '......obbllllllllllllllbbo......',
  18: '........obbllllllllllbbo........',
  19: '..........oooooooooooo..........'
});

/* ── 귀 ───────────────────────────────────────────────────── */

export const ears = {
  normal: pad({
    4: '.....ooo................ooo.....',
    5: '.....ofo................ofo.....',
    6: '.....ooo................ooo.....'
  }),
  // 한쪽만 내려간 귀. 짜증·귀찮음의 주 신호입니다.
  droop: pad({
    4: '.....ooo........................',
    5: '.....ofo..................ooo...',
    6: '.....ooo..................ofo...',
    7: '..........................ooo...'
  })
};

/* ── 표정 ─────────────────────────────────────────────────── */
/* 눈 4줄(10~13)과 입 1줄(16)만 덮어쓰는 방식입니다.            */
/* 얼굴 본체는 하나뿐이라 조합만 바꿔 표정을 늘릴 수 있습니다.  */

const EYE_COVER = pad({
  10: '.........bbb........bbb.........',
  11: '.........bbb........bbb.........',
  12: '.........bbb........bbb.........',
  13: '.........bbb........bbb.........'
});

export const faces = {
  // 기본: 덮어쓰지 않음 (큰 눈 + 무표정)
  neutral: null,

  // 일자 눈. 깜빡임과 감기에 함께 씁니다.
  // 지속 시간이 달라서 화면에서는 헷갈리지 않습니다.
  flat: [EYE_COVER, pad({ 12: '.........eee........eee.........' })],

  // 눈꺼풀을 반쯤 내리고 입을 짧게·비대칭으로.
  annoyed: [pad({
    10: '.........bbb........bbb.........',
    11: '.........ooo........ooo.........',
    16: '..............mmll..............'
  })],

  // 입꼬리 대신 눈을 접어 뿌듯함을 표현합니다. ㄷ을 시계방향으로
  // 90도 돌린(= 위는 막히고 아래가 트인 ⊓자) 모양입니다.
  // (README 원칙: 이 캐릭터는 입보다 눈·귀로 표현합니다.)
  proud: [EYE_COVER, pad({
    12: '.........eee........eee.........',
    13: '.........e.e........e.e.........'
  })],

  // neutral 의 기본 눈(하이라이트 점 하나)은 그대로 두고, 대각선
  // 아래쪽에 반짝임 한 점을 더해 초롱초롱하게 만듭니다. 덮어쓰지
  // 않으므로 다른 표정과 달리 EYE_COVER 가 필요 없습니다.
  starry: [pad({
    11: '...........w..........w.........'
  })]
};

export const bang = pad({
  2: '..............................h.',
  3: '..............................h.',
  5: '..............................h.'
});

/**
 * 단수 메모(알림)가 뜰 때 잠깐 띄우는 말풍선 아이콘. 32px 안에는
 * 자유 텍스트를 그릴 폰트가 없어서, 실제 문구는 #status 줄로 보여주고
 * 이 아이콘은 "지금 알림이 떴다"는 신호만 냅니다. bang 이 오른쪽 위
 * (귀 옆)를 쓰므로 겹치지 않게 왼쪽 위 빈 공간에 둡니다.
 */
export const noteBubble = pad({
  1: '.ggg............................',
  2: 'g.h.g...........................',
  3: 'g...g...........................',
  4: '.ggg............................',
  5: '..g.............................'
});

/**
 * 한 단 풀기 중 오른쪽 바늘을 잠깐 귀 뒤에 꽂아둔 모습. 렌더 순서상
 * 귀·머리보다 먼저(behind) 그려서 끝만 삐죽 나오고 나머지는 가려지게
 * 합니다 — 화면 밖으로 미끄러져 사라지던 것보다 자연스럽습니다.
 */
export function earNeedle() {
  const buf = buffer();
  const base = [23, 5];
  const tip = [28, 1];
  line(buf, base[0], base[1] + 1, tip[0], tip[1] + 1, 'g');
  line(buf, base[0], base[1] - 1, tip[0], tip[1] - 1, 'g');
  line(buf, base[0], base[1], tip[0], tip[1], 'n');
  put(buf, tip[0], tip[1], 'h');
  return pad(buf);
}

/* ── 앞발 ─────────────────────────────────────────────────── */
/* 좌우 위치를 모두 인자로 받습니다. 상태마다 자세가 다릅니다.  */

/**
 * 어깨(SHOULDER_L/R)에서 손 위치까지 잇는 팔. 손이 몸에서 멀리
 * 벌어지는 자세(자랑하기 등)에서 이게 없으면 손만 따로 떠 보입니다.
 * 바늘과 같은 이중선 기법(테두리 두 줄 + 심 한 줄)을 씁니다.
 */
export function arm(x0, y0, x1, y1) {
  const buf = buffer();
  line(buf, x0, y0 + 1, x1, y1 + 1, 'o');
  line(buf, x0, y0 - 1, x1, y1 - 1, 'o');
  line(buf, x0, y0, x1, y1, 'a');
  return pad(buf);
}

/**
 * 위·아래를 어두운 캡(o)으로 막아야 배경과 경계가 생깁니다.
 * 원래는 윗줄이 속살(p)이라 밝은 배경 위에서 위쪽 테두리가 없어
 * 손끝이 배경에 스몄습니다.
 */
export function paws(lx, ly, rx, ry) {
  const buf = buffer();
  const cap = ['o', 'o', 'o', 'a'];
  const capMirror = ['a', 'o', 'o', 'o'];
  const fill = ['o', 'p', 'p', 'a'];
  const fillMirror = ['a', 'p', 'p', 'o'];
  [cap, fill, cap].forEach((row, r) => {
    row.forEach((ch, i) => put(buf, lx + i, ly + r, ch));
  });
  [capMirror, fillMirror, capMirror].forEach((row, r) => {
    row.forEach((ch, i) => put(buf, rx + i, ry + r, ch));
  });
  return pad(buf);
}

export const PAWS_REST = { lx: 7, ly: 21, rx: 21, ry: 21 };

/* ── 바늘 ─────────────────────────────────────────────────── */
/* 축은 앞발 안에 고정. 양 끝이 반대로 움직여야 회전으로 읽힙니다. */

export const needleFrames = [
  { lLong: [2, 27], lShort: [13, 20], rLong: [29, 28], rShort: [18, 19] },
  { lLong: [2, 27], lShort: [13, 20], rLong: [29, 25], rShort: [18, 21] },
  { lLong: [2, 26], lShort: [13, 20], rLong: [29, 27], rShort: [18, 20] }
];

/** 마개는 각도를 따라 붙습니다. 정면 고정 도장을 찍으면 납작해집니다. */
function stopper(buf, tip, inward) {
  put(buf, tip[0], tip[1], 'h');
  put(buf, tip[0], tip[1] - 1, 'h');
  put(buf, tip[0] + inward, tip[1], 'h');
}

/**
 * @param {number} frame  0-2
 * @param {number} pullOut 0=제자리, 1=빠지는 중, 2=완전히 뺌
 */
export function needles(frame, pullOut = 0) {
  const buf = buffer();
  const f = needleFrames[frame % needleFrames.length];
  const segments = [
    [LEFT_PIVOT, f.lLong],
    [LEFT_PIVOT, f.lShort]
  ];

  if (pullOut < 2) {
    const off = pullOut * 5;
    const pivot = [RIGHT_PIVOT[0] + off, RIGHT_PIVOT[1] - off];
    segments.push([pivot, [f.rLong[0] + off, f.rLong[1] - off]]);
    segments.push([pivot, [f.rShort[0] + off, f.rShort[1] - off]]);
  }

  // 어두운 테두리 두 줄 → 밝은 심 한 줄. 밝은 배경과 어두운 몸통
  // 어느 쪽에서든 최소 한 겹은 살아남습니다.
  segments.forEach(([a, b]) => {
    line(buf, a[0], a[1] + 1, b[0], b[1] + 1, 'g');
    line(buf, a[0], a[1] - 1, b[0], b[1] - 1, 'g');
  });
  segments.forEach(([a, b]) => line(buf, a[0], a[1], b[0], b[1], 'n'));

  stopper(buf, f.lLong, 1);
  if (pullOut < 2) {
    stopper(buf, [f.rLong[0] + pullOut * 5, f.rLong[1] - pullOut * 5], -1);
  }
  return pad(buf);
}

/* ── 뜨개감 ───────────────────────────────────────────────── */

export function knit(length, flash = false) {
  const buf = {};
  if (length <= 0) return pad(buf);
  buf[KNIT_TOP] = '............kkkkkkkk............';
  for (let i = 1; i <= length; i++) {
    const y = KNIT_TOP + i;
    if (y > 29) break;
    buf[y] = (i % 2)
      ? '............kydydydk............'
      : '............kdydydyk............';
  }
  if (flash && KNIT_TOP + 1 <= 29) {
    buf[KNIT_TOP + 1] = '............kFFFFFFk............';
  }
  buf[Math.min(KNIT_TOP + length + 1, 30)] = '............kkkkkkkk............';
  return pad(buf);
}

/** 감는 동안 옆에 내려둔 편물. */
export const asideKnit = pad({
  26: '.......................kkkkkk...',
  27: '.......................kydydk...',
  28: '.......................kdydyk...',
  29: '.......................kydydk...',
  30: '.......................kkkkkk...'
});

export function asideNeedle() {
  const buf = buffer();
  line(buf, 23, 31, 30, 27, 'g');
  line(buf, 23, 29, 30, 25, 'g');
  line(buf, 23, 30, 30, 26, 'n');
  stopper(buf, [30, 26], -1);
  return pad(buf);
}

/* ── 실뭉치 ───────────────────────────────────────────────── */

export function ballTier(amount) {
  if (amount <= 0) return 0;
  if (amount <= 2) return 1;
  if (amount <= 5) return 2;
  return 3;
}

const FLOOR_BALL = {
  0: pad({}),
  1: pad({
    28: '.........................kyk....',
    29: '........................kyyk....',
    30: '.........................kyk....'
  }),
  2: pad({
    27: '.........................kyk....',
    28: '........................kyyyk...',
    29: '........................kyyyk...',
    30: '.........................kyk....'
  }),
  3: pad({
    26: '........................kyyk....',
    27: '.......................kyyyyk...',
    28: '.......................kyyyyk...',
    29: '.......................kyyyyk...',
    30: '........................kyyk....'
  })
};

export function floorBall(amount) {
  return FLOOR_BALL[ballTier(amount)];
}

export function floorBallAnchor(amount) {
  const t = ballTier(amount);
  if (t === 3) return [24, 27];
  if (t === 2) return [24, 28];
  return [25, 29];
}

/**
 * 품에 안은 실뭉치. 크기별로 스프라이트·왼발 좌표·바닥 y·오른발
 * 원운동을 한 덩어리로 묶어둡니다. 흩어놓으면 크기를 바꿀 때
 * 한 군데를 빼먹고 발이 파묻힙니다.
 */
export const HELD_BALL = {
  1: {
    sprite: pad({
      23: '...............kk...............',
      24: '..............kyyk..............',
      25: '...............kk...............'
    }),
    leftPaw: [10, 23],
    bottom: 25,
    arc: [[17, 21], [19, 23], [17, 25], [19, 23]]
  },
  2: {
    sprite: pad({
      21: '..............kyyk..............',
      22: '.............kyyyyk.............',
      23: '.............kyyyyk.............',
      24: '.............kyyyyk.............',
      25: '..............kyyk..............'
    }),
    leftPaw: [9, 22],
    bottom: 25,
    arc: [[18, 20], [20, 22], [18, 25], [20, 22]]
  },
  3: {
    sprite: pad({
      20: '..............kyyk..............',
      21: '.............kyyyyk.............',
      22: '............kyyyyyyk............',
      23: '............kyyyyyyk............',
      24: '............kyyyyyyk............',
      25: '.............kyyyyk.............',
      26: '..............kyyk..............'
    }),
    leftPaw: [8, 22],
    bottom: 26,
    arc: [[19, 19], [22, 22], [19, 25], [22, 22]]
  }
};

export function heldBall(amount) {
  return HELD_BALL[Math.max(1, ballTier(amount))];
}

/* ── 실 가닥 ──────────────────────────────────────────────── */

export function feedStrand(knitLength, ballAmount) {
  if (ballAmount <= 0) return pad({});
  const buf = buffer();
  const anchor = floorBallAnchor(ballAmount);
  line(buf, 20, Math.min(KNIT_TOP + knitLength, anchor[1] - 1),
       anchor[0] - 1, anchor[1], 'k');
  return pad(buf);
}

export function windStrand(ballAmount) {
  const buf = buffer();
  line(buf, 13, 31, 15, heldBall(ballAmount).bottom, 'k');
  return pad(buf);
}

/** 당기는 중의 실. 한 번 꺾여야 팽팽하게 읽힙니다. */
export function pulledYarn(rx, ry) {
  const buf = buffer();
  const mx = Math.round((20 + rx) / 2);
  const my = Math.round((KNIT_TOP + ry + 1) / 2) - 1;
  line(buf, 20, KNIT_TOP, mx, my, 'k');
  line(buf, mx, my, rx, ry + 1, 'k');
  return pad(buf);
}

/* ── 바닥에 풀린 실 ───────────────────────────────────────── */
/* 무작위로 흩뿌리면 프레임마다 모양이 바뀌어 지글거립니다.     */
/* 쌓이는 순서를 고정해둡니다.                                  */

const PILE = [
  {},
  { 31: '..............kk................' },
  { 31: '.............kkkk...............' },
  { 30: '...............k................',
    31: '............kkkkkk..............' },
  { 30: '..............k.k...............',
    31: '...........kkkkkkkk.............' },
  { 30: '.............k.k.k..............',
    31: '..........kkkkkkkkkk............' },
  { 29: '...............k................',
    30: '............k.k.k.k.............',
    31: '.........kkkkkkkkkkkk...........' },
  { 29: '..............k.k...............',
    30: '...........k.k.k.k.k............',
    31: '........kkkkkkkkkkkkkk..........' },
  { 29: '.............k.k.k..............',
    30: '..........k.k.k.k.k.k...........',
    31: '.......kkkkkkkkkkkkkkkk.........' },
  { 29: '............k.k.k.k.............',
    30: '.........k.k.k.k.k.k.k..........',
    31: '......kkkkkkkkkkkkkkkkkk........' }
];

export const MAX_PILE = PILE.length - 1;

export function pile(amount) {
  return pad(PILE[Math.max(0, Math.min(amount, MAX_PILE))]);
}

export const yanks = [[21, 21], [25, 18], [23, 20]];

/* ── 완성품 ───────────────────────────────────────────────── */
/* top 을 인자로 받아 같은 모양을 여러 높이에서 재사용합니다.   */
/* 두르기 전(complete/showoff)과 목에 두른 뒤(wearing)는       */
/* 형태 자체가 달라서 별도 스프라이트(wornScarf)로 둡니다.      */

/** top~bottom 사이 몸통 길이. 9로 늘려봤다가 너무 길어서 되돌렸습니다. */
export const FINISHED_PIECE_SPAN = 6;

export function finishedPiece(top = 20) {
  const buf = buffer();
  const left = 9, right = 22, bottom = top + FINISHED_PIECE_SPAN;
  for (let x = left; x <= right; x++) {
    put(buf, x, top, 'k');
    put(buf, x, bottom, 'k');
  }
  for (let y = top; y <= bottom; y++) {
    put(buf, left, y, 'k');
    put(buf, right, y, 'k');
  }
  for (let y = top + 1; y < bottom; y++) {
    const stripe = ((y - top) % 2) ? 'y' : 'd';
    for (let x = left + 1; x < right; x++) put(buf, x, y, stripe);
  }
  for (let x = left + 1; x < right; x += 2) put(buf, x, bottom + 1, 'k');
  return pad(buf);
}

/** 목에 두른 뒤의 모습. 어깨선을 덮고 앞으로 두 자락이 늘어집니다. */
export function wornScarf() {
  const buf = buffer();
  for (let x = 9; x <= 22; x++) {
    put(buf, x, 19, 'k');
    // 목 두른 부분 양 끝(9, 22)도 테두리로 막아야 아래 자락처럼
    // 윤곽이 있는 것으로 보입니다 — 없으면 목도리가 색만 있고
    // 테두리 없이 붕 떠 보입니다.
    put(buf, x, 20, (x === 9 || x === 22) ? 'k' : 'y');
    put(buf, x, 21, (x === 9 || x === 22) ? 'k' : 'd');
  }
  for (let y = 22; y <= 27; y++) {
    const ch = (y % 2) ? 'y' : 'd';
    put(buf, 12, y, 'k');
    put(buf, 13, y, ch);
    put(buf, 14, y, ch);
    put(buf, 15, y, 'k');
    put(buf, 18, y, 'k');
    put(buf, 19, y, ch);
    put(buf, 20, y, ch);
    put(buf, 21, y, 'k');
  }
  put(buf, 13, 28, 'k');
  put(buf, 14, 28, 'k');
  put(buf, 19, 28, 'k');
  put(buf, 20, 28, 'k');
  return pad(buf);
}

/* ── 반짝임 ───────────────────────────────────────────────── */
/* 머리 실루엣 바깥 여섯 지점에서 프레임마다 엇갈려 반짝입니다.  */

export const SPARK = { s: '#ffd76b', t: '#fff3c4' };

const SPARK_SPOTS = [[2, 4], [29, 5], [2, 12], [29, 13], [3, 20], [28, 19]];

export function sparkles(frame) {
  const buf = buffer();
  SPARK_SPOTS.forEach(([x, y], i) => {
    if ((frame + i) % 3 !== 0) return;
    put(buf, x, y, 's');
    put(buf, x - 1, y, 't');
    put(buf, x + 1, y, 't');
    put(buf, x, y - 1, 't');
    put(buf, x, y + 1, 't');
  });
  return pad(buf);
}

/** 완성되는 순간 한 프레임만 모든 지점이 한꺼번에 반짝입니다. */
/**
 * 착용 중 옆으로 은은하게 떠오르는 하트. 리본·바늘 마개와 같은
 * 빨강(NEEDLE 팔레트의 h)을 재사용해 색을 새로 늘리지 않습니다.
 * 캐릭터 양옆(머리 폭 바깥)에서 시작해 위로 흐르다 화면 밖에서
 * 사라지고, 각자 다른 위상으로 시작해 겹치지 않게 흩어집니다.
 */
const HEART_SPOTS = [
  { x: 2, phase: 0 },
  { x: 29, phase: 9 },
  { x: 4, phase: 18 }
];
const HEART_CYCLE = 26;

export function hearts(frame) {
  const buf = buffer();
  HEART_SPOTS.forEach(({ x, phase }) => {
    const y = 24 - ((frame + phase) % HEART_CYCLE);
    if (y < -2) return;
    put(buf, x, y, 'h');
    put(buf, x + 2, y, 'h');
    put(buf, x, y + 1, 'h');
    put(buf, x + 1, y + 1, 'h');
    put(buf, x + 2, y + 1, 'h');
    put(buf, x + 1, y + 2, 'h');
  });
  return pad(buf);
}

export function sparkleBurst() {
  const buf = buffer();
  SPARK_SPOTS.forEach(([x, y]) => {
    put(buf, x, y, 's');
    put(buf, x - 1, y, 't');
    put(buf, x + 1, y, 't');
    put(buf, x, y - 1, 't');
    put(buf, x, y + 1, 't');
  });
  return pad(buf);
}
