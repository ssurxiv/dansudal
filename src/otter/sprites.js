/*!
 * 함뜨마을 동물 친구들 — 단수달 스프라이트 데이터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * 이 파일의 픽셀아트 데이터는 저작권 보호 대상입니다.
 * 무단 추출·재사용·재배포를 금합니다.
 * https://instagram.com/tteoboja_0
 */

import { SIZE, pad, buffer, put, line } from '../pixel.js';

export const SIGNATURE = '@tteoboja_0';

/* 이 모듈의 픽셀은 32열 좌표계로 그려져 있습니다 — 좌우 대칭축이
   열과 열 사이(x15.5)에 떨어지는 격자라, 가운데에 두는 것은 무엇이든
   짝수 폭일 수밖에 없습니다(1px 인중을 못 그립니다). 내보낼 때 한가운데
   열을 복제해 33열로 넓히면 대칭축이 가운데 열(x16) 위에 올라가
   홀수 폭 디테일도 정확히 가운데 정렬됩니다.

   몸통·머리처럼 가운데가 단색인 부위는 같은 색 한 줄이 늘 뿐이라
   티가 안 나고, 오른쪽에 있던 것들은 한 칸씩 밀려 새 축에 맞습니다 —
   그래서 아래 좌표 상수들은 32열 기준 그대로 둬도 됩니다. 가운데로
   무늬가 지나가는 편물(knit)만은 복제하면 코가 겹쳐 보여서 처음부터
   33열로 그립니다. */
export const WIDTH = 33;
const CENTER = 16;
const widen = (sprite) => sprite.map((row) => row.slice(0, CENTER) + row[CENTER - 1] + row.slice(CENTER));
/** 스프라이트를 내주는 함수를 넓혀서 내보내는 래퍼. */
const wide = (fn) => (...args) => widen(fn(...args));
const padW = (rows) => pad(rows, SIZE, WIDTH);


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
function raw_tail(offset = 0) {
  if (offset === 0) return pad(TAIL_ROWS);
  const buf = buffer();
  Object.entries(TAIL_ROWS).forEach(([y, row]) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') put(buf, x, Number(y) + offset, row[x]);
    }
  });
  return pad(buf);
}

const raw_body = pad({
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

const raw_head = pad({
  2:  '...........oooooooooo...........',
  3:  '.........oobbbbbbbbbboo.........',
  4:  '........obbbbbbbbbbbbbbo........',
  5:  '.......obbbbbbbbbbbbbbbbo.......',
  6:  '......obbbbbbbbbbbbbbbbbbo......',
  7:  '......obbbbbbbbbbbbbbbbbbo......',
  8:  '.....obbbbbbbbbbbbbbbbbbbbo.....',
  // 눈썹 — 눈 위로 한 줄 띄우고 눈 안쪽 두 칸에만 짧게. 눈 폭만큼 길게
  // 그으면 진지해 보이고 화난 표정에서 눈꺼풀과 겹쳐 무거워져서, 작은
  // 점처럼 두어 '말수 적은 감자' 같은 순한 인상을 냅니다.
  9:  '.....obbbbbmmbbbbbbmmbbbbbo.....',
  10: '.....obbbbbbbbbbbbbbbbbbbbo.....',
  11: '.....obbbbweebbbbbbweebbbbo.....',
  12: '.....obbbbeeebbbbbbeeebbbbo.....',
  13: '....obfffbeeebbbbbbeeebfffbo....',
  14: '....offfbblllllmmlllllbbfffo....',
  15: '....offfbbllllllllllllbbfffo....',
  16: '.....offbbllllmmmmllllbbffo.....',
  17: '......obbllllllllllllllbbo......',
  18: '........ollllllllllllllo........',
  19: '..........oooooooooooo..........'
});

/* ── 귀 ───────────────────────────────────────────────────── */

const raw_ears = {
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
/* 눈 3줄(11~13)과 입 1줄(16)만 덮어쓰는 방식입니다.            */
/* 얼굴 본체는 하나뿐이라 조합만 바꿔 표정을 늘릴 수 있습니다.  */

/* 눈은 3열×3행(y11~13, x10~12 / x19~21)입니다. 한때 3×4 였다가 눈
   사이가 멀어 보여 안쪽으로 당겼고, 이 자리를 쓰는 표정도 모두 맞췄습니다. */
const EYE_COVER = pad({
  11: '..........bbb......bbb..........',
  12: '..........bbb......bbb..........',
  13: '..........bbb......bbb..........'
});

const raw_faces = {
  // 기본: 덮어쓰지 않음 (큰 눈 + 무표정)
  neutral: null,

  // 일자 눈. 깜빡임과 감기에 함께 씁니다.
  // 지속 시간이 달라서 화면에서는 헷갈리지 않습니다.
  flat: [EYE_COVER, pad({ 12: '..........eee......eee..........' })],
  // 눈꺼풀을 반쯤 내리고 입을 짧게·비대칭으로.
  annoyed: [pad({
    11: '..........ooo......ooo..........',
    16: '..............mmll..............'
  })],

  // 입꼬리 대신 눈을 접어 뿌듯함을 표현합니다. ㄷ을 시계방향으로
  // 90도 돌린(= 위는 막히고 아래가 트인 ⊓자) 모양입니다.
  // (README 원칙: 이 캐릭터는 입보다 눈·귀로 표현합니다.)
  proud: [EYE_COVER, pad({
    12: '..........eee......eee..........',
    13: '..........e.e......e.e..........'
  })],
  // neutral 의 기본 눈(하이라이트 점 하나)은 그대로 두고, 대각선
  // 아래쪽에 반짝임 한 점을 더해 초롱초롱하게 만듭니다. 덮어쓰지
  // 않으므로 다른 표정과 달리 EYE_COVER 가 필요 없습니다.
  starry: [pad({
    12: '............w........w..........'
  })]
};

const raw_bang = pad({
  2: '..............................h.',
  3: '..............................h.',
  5: '..............................h.'
});

/**
 * 한 단 풀기 중 오른쪽 바늘을 잠깐 귀 뒤에 꽂아둔 모습. 렌더 순서상
 * 귀·머리보다 먼저(behind) 그려서 밑동은 가려지고 끝만 귀 위로
 * 삐죽 튀어나오게 합니다 — 화면 밖으로 미끄러져 사라지던 것보다
 * 자연스럽습니다.
 *
 * base 는 droop 귀 상자(행5~7, 열26~28) 한가운데, tip 은 거의 수직
 * 위(귀보다 위)로 둡니다. 대각선으로 옆(31,2)까지 뉘어놨던 이전
 * 버전은 "귀 위로 솟음"이 아니라 "옆으로 삐져나옴"으로 보였습니다.
 * 거의 수직인 선이라 두께를 만드는 겹선도 세로(y)가 아니라
 * 가로(x)로 ±1 오프셋해야 합니다 — 세로로 오프셋하면 선 방향과
 * 같은 축이라 두께가 거의 안 생깁니다.
 */
function raw_earNeedle() {
  const buf = buffer();
  const base = [27, 7];
  const tip = [28, 1];
  line(buf, base[0] + 1, base[1], tip[0] + 1, tip[1], 'g');
  line(buf, base[0] - 1, base[1], tip[0] - 1, tip[1], 'g');
  line(buf, base[0], base[1], tip[0], tip[1], 'n');
  // 마개도 겹선 두 끝(tip±1)까지 덮어야 옆에 어두운 테두리 점이
  // 남지 않습니다 — needles() 의 stopper() 와 같은 이유의 수정입니다.
  put(buf, tip[0] - 1, tip[1], 'h');
  put(buf, tip[0], tip[1], 'h');
  put(buf, tip[0] + 1, tip[1], 'h');
  return pad(buf);
}

/* ── 앞발 ─────────────────────────────────────────────────── */
/* 좌우 위치를 모두 인자로 받습니다. 상태마다 자세가 다릅니다.  */

/**
 * 어깨(SHOULDER_L/R)에서 손 위치까지 잇는 팔. 손이 몸에서 멀리
 * 벌어지는 자세(자랑하기 등)에서 이게 없으면 손만 따로 떠 보입니다.
 * 바늘과 같은 이중선 기법(테두리 두 줄 + 심 한 줄)을 씁니다.
 */
function raw_arm(x0, y0, x1, y1) {
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
 *
 * 몸 쪽(안쪽) 한 줄만 테두리 대신 그늘(a)이었습니다 — 팔이 거기
 * 붙으니 이어 보이라고 그랬지만, 팔 없이 손만 찍는 자세(편물을 쥔
 * 평소 모습)에서는 안쪽 면만 테두리가 없어 손이 편물에 스몄습니다.
 * 네 면을 다 두르고, 팔은 어차피 손보다 먼저 그려져 손 뒤로 들어갑니다.
 */
function raw_paws(lx, ly, rx, ry) {
  const buf = buffer();
  const cap = ['o', 'o', 'o', 'o'];
  const fill = ['o', 'p', 'p', 'o'];
  [cap, fill, cap].forEach((row, r) => {
    row.forEach((ch, i) => {
      put(buf, lx + i, ly + r, ch);
      put(buf, rx + i, ry + r, ch);
    });
  });
  return pad(buf);
}

export const PAWS_REST = { lx: 7, ly: 21, rx: 21, ry: 21 };

// 자랑하기·입어보기 전환에서 완성품을 잡는 자리. 예전에는 engine.js
// 안에 lx 4 / rx 24 로 박혀 있었는데, 그러면 손이 목도리(x9~23) 양
// 끝보다 한참 밖에 놓여 목도리만 두 손 사이에 붕 떠 보였습니다.
export const SPREAD_PAWS = { lx: 6, rx: 22 };

/* ── 바늘 ─────────────────────────────────────────────────── */
/* 축은 앞발 안에 고정. 양 끝이 반대로 움직여야 회전으로 읽힙니다. */

export const needleFrames = [
  { lLong: [2, 27], lShort: [13, 20], rLong: [29, 28], rShort: [18, 19] },
  { lLong: [2, 27], lShort: [13, 20], rLong: [29, 25], rShort: [18, 21] },
  { lLong: [2, 26], lShort: [13, 20], rLong: [29, 27], rShort: [18, 20] }
];

/**
 * 마개는 각도를 따라 붙습니다. 정면 고정 도장을 찍으면 납작해집니다.
 * ㄴ자 모양(하트를 흉내낸 모양, tip·tip-1·tip+inward 세 점)이
 * 원래 의도입니다 — tip+1 까지 'h'로 채우면 ㄴ 대신 ㅓ 모양이
 * 됩니다. 다만 겹선(needles() 의 offset ±1) 중 tip+1 쪽 끝은
 * 지우지 않으면 어두운 갈색(거의 검정) 점이 마개 옆에 남으므로,
 * 색칠하지 않고 투명 처리만 해서 지웁니다.
 */
function stopper(buf, tip, inward) {
  put(buf, tip[0], tip[1] + 1, '.');
  put(buf, tip[0], tip[1], 'h');
  put(buf, tip[0], tip[1] - 1, 'h');
  put(buf, tip[0] + inward, tip[1], 'h');
}

/**
 * @param {number} frame  0-2
 * @param {number} pullOut 0=제자리, 1=빠지는 중, 2=완전히 뺌
 */
function raw_needles(frame, pullOut = 0) {
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

/* 편물만은 widen() 을 안 거치고 처음부터 33열로 그립니다 — 코 무늬가
   한가운데를 지나가서, 가운데 열을 복제하면 같은 코가 두 번 찍혀
   체크무늬에 세로 이음매가 생깁니다. 폭은 9칸(x12~20, 합 32 → 대칭). */
const KNIT_LEFT = 12;
const KNIT_RIGHT = 20;
const KNIT_LAST_ROW = 29; // 캐스트온 테두리는 그 아래 한 줄(30)까지

export function knit(length, flash = false) {
  const buf = buffer();
  if (length <= 0) return padW(buf);
  const edge = (y) => {
    for (let x = KNIT_LEFT; x <= KNIT_RIGHT; x++) put(buf, x, y, 'k');
  };
  edge(KNIT_TOP);
  for (let i = 1; i <= length; i++) {
    const y = KNIT_TOP + i;
    if (y > KNIT_LAST_ROW) break;
    for (let x = KNIT_LEFT; x <= KNIT_RIGHT; x++) {
      const edgeCol = x === KNIT_LEFT || x === KNIT_RIGHT;
      put(buf, x, y, edgeCol ? 'k' : (((x + i) % 2) ? 'd' : 'y'));
    }
  }
  if (flash && KNIT_TOP + 1 <= KNIT_LAST_ROW) {
    for (let x = KNIT_LEFT + 1; x < KNIT_RIGHT; x++) put(buf, x, KNIT_TOP + 1, 'F');
  }
  edge(Math.min(KNIT_TOP + length + 1, KNIT_LAST_ROW + 1));
  return padW(buf);
}

/** 감는 동안 옆에 내려둔 편물. */
const raw_asideKnit = pad({
  26: '.......................kkkkkk...',
  27: '.......................kydydk...',
  28: '.......................kdydyk...',
  29: '.......................kydydk...',
  30: '.......................kkkkkk...'
});

function raw_asideNeedle() {
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

function raw_floorBall(amount) {
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

function raw_heldBall(amount) {
  return HELD_BALL[Math.max(1, ballTier(amount))];
}

/* ── 실 가닥 ──────────────────────────────────────────────── */

function raw_feedStrand(knitLength, ballAmount) {
  if (ballAmount <= 0) return pad({});
  const buf = buffer();
  const anchor = floorBallAnchor(ballAmount);
  line(buf, 20, Math.min(KNIT_TOP + knitLength, anchor[1] - 1),
       anchor[0] - 1, anchor[1], 'k');
  return pad(buf);
}

function raw_windStrand(ballAmount) {
  const buf = buffer();
  line(buf, 13, 31, 15, heldBall(ballAmount).bottom, 'k');
  return pad(buf);
}

/** 당기는 중의 실. 한 번 꺾여야 팽팽하게 읽힙니다. */
function raw_pulledYarn(rx, ry) {
  const buf = buffer();
  const mx = Math.round((20 + rx) / 2);
  const my = Math.round((KNIT_TOP + ry + 1) / 2) - 1;
  line(buf, 20, KNIT_TOP, mx, my, 'k');
  line(buf, mx, my, rx, ry + 1, 'k');
  return pad(buf);
}

/* ── 바닥에 풀린 실 ───────────────────────────────────────── */
/* 무작위로 흩뿌리면 프레임마다 모양이 바뀌어 지글거립니다.     */
/* 바닥에 쌓인 실. 쌓이는 순서를 고정해두고, widen() 을 안 거치고
   처음부터 33열로 그립니다 — 한 칸 걸러 하나씩 얹는 무늬가 한가운데를
   지나가서, 가운데 열을 복제하면 그 자리만 두 칸이 붙어 버립니다.

   각 단계는 [맨 아랫줄, 가운뎃줄, 윗줄]의 반폭입니다(대칭축 x16 에서
   좌우로 뻗는 칸 수). 맨 아랫줄만 꽉 채우고 위는 한 칸 걸러 얹습니다.
   32열 시절에는 이 무더기가 한 칸 왼쪽으로 치우쳐 있었는데, 반폭으로
   그리면서 자연히 가운데에 맞았습니다. */
const PILE_TIERS = [
  [], [1], [2], [3, 0], [4, 1], [5, 2], [6, 3, 0], [7, 4, 1], [8, 5, 2], [9, 6, 3]
];

export const MAX_PILE = PILE_TIERS.length - 1;

export function pile(amount) {
  const buf = buffer();
  const tier = PILE_TIERS[Math.max(0, Math.min(amount, MAX_PILE))];
  const [bottom, middle, top] = tier;
  if (bottom !== undefined) {
    for (let x = CENTER - bottom; x <= CENTER + bottom; x++) put(buf, x, 31, 'k');
  }
  if (middle !== undefined) {
    for (let x = CENTER - middle; x <= CENTER + middle; x += 2) put(buf, x, 30, 'k');
  }
  if (top !== undefined) {
    for (let x = CENTER - top; x <= CENTER + top; x += 2) put(buf, x, 29, 'k');
  }
  return padW(buf);
}


export const yanks = [[21, 21], [25, 18], [23, 20]];

/* ── 완성품 ───────────────────────────────────────────────── */
/* top 을 인자로 받아 같은 모양을 여러 높이에서 재사용합니다.   */
/* 두르기 전(complete/showoff)과 목에 두른 뒤(wearing)는       */
/* 형태 자체가 달라서 별도 스프라이트(wornScarf)로 둡니다.      */

/** top~bottom 사이 몸통 길이. 9로 늘려봤다가 너무 길어서 되돌렸습니다. */
export const FINISHED_PIECE_SPAN = 6;

/* 완성품·착용 목도리는 widen() 을 안 거치고 처음부터 33열로 그립니다 —
   술이 한 칸 걸러 하나씩 달리고 자락도 좌우 한 쌍이라, 가운데 열을
   복제하면 그 간격이 한 군데만 어긋나 좌우가 틀어집니다. */
export function finishedPiece(top = 20) {
  const buf = buffer();
  const left = 9;
  const right = 23; // 9+23=32 → 가운데 열(x16) 기준 좌우 대칭
  const bottom = top + FINISHED_PIECE_SPAN;
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
  return padW(buf);
}

/** 목에 두른 뒤의 모습. 어깨선을 덮고 앞으로 두 자락이 늘어집니다. */
export function wornScarf() {
  const buf = buffer();
  // 목에 두른 부분. 양 끝도 테두리로 막아야 아래 자락처럼 윤곽이
  // 있는 것으로 보입니다 — 없으면 색만 있고 테두리 없이 붕 뜹니다.
  const left = 9;
  const right = 23;
  for (let x = left; x <= right; x++) {
    const edge = x === left || x === right;
    put(buf, x, 19, 'k');
    put(buf, x, 20, edge ? 'k' : 'y');
    put(buf, x, 21, edge ? 'k' : 'd');
  }
  // 앞으로 늘어뜨린 두 자락. 좌우 합이 32 라 가운데 열 기준 대칭입니다.
  const tails = [[11, 14], [18, 21]];
  for (let y = 22; y <= 27; y++) {
    const ch = (y % 2) ? 'y' : 'd';
    tails.forEach(([l, r]) => {
      for (let x = l; x <= r; x++) put(buf, x, y, (x === l || x === r) ? 'k' : ch);
    });
  }
  // 자락 끝 술.
  tails.forEach(([l, r]) => {
    put(buf, l + 1, 28, 'k');
    put(buf, r - 1, 28, 'k');
  });
  return padW(buf);
}

/* ── 반짝임 ───────────────────────────────────────────────── */
/* 머리 실루엣 바깥 여섯 지점에서 프레임마다 엇갈려 반짝입니다.  */

export const SPARK = { s: '#ffd76b', t: '#fff3c4' };

const SPARK_SPOTS = [[2, 4], [29, 5], [2, 12], [29, 13], [3, 20], [28, 19]];

function raw_sparkles(frame) {
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

function raw_hearts(frame) {
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

function raw_sparkleBurst() {
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


/* ── 33열로 넓혀서 내보내기 ───────────────────────────────── */
/* 위 raw_* 는 전부 32열 좌표계로 그린 원본입니다. 바깥에서 쓰는 건
   여기 넓힌 것들뿐이라, 그리는 쪽은 32열 좌표 그대로 생각하면 됩니다. */

export const body = widen(raw_body);

/* 주둥이 줄(y14~18)은 넓힌 뒤 33열 좌표로 다시 씁니다. widen() 은 가운데
   열을 복제하므로 출력의 x15 와 x16 이 늘 같은 값이 되고, 그 탓에 가운데
   정렬이 되는 폭은 3·5·7칸뿐입니다 — 1칸짜리 코를 가운데에 찍으려면
   이 줄들만은 직접 써야 합니다.

   주둥이는 폭 11→13→15→15→15 로 아래로 갈수록 넓어지는 반원이고,
   코는 1칸, 입은 3칸(둘 다 x16 중심). 볼터치도 이 줄들에 걸쳐 있어
   함께 그립니다 — 윗줄(y13, 원본 머리)과 이어서 3·5·5·3 타원입니다. */
const MUZZLE_ROWS = {
  14: '....offfffblllllmlllllbfffffo....',
  15: '....offffflllllllllllllfffffo....',
  16: '.....offfllllllmmmllllllfffo.....',
  17: '......obblllllllllllllllbbo......',
  18: '........olllllllllllllllo........'
};

export const head = widen(raw_head).map((row, y) => MUZZLE_ROWS[y] ?? row);
export const bang = widen(raw_bang);
export const asideKnit = widen(raw_asideKnit);
export const ears = Object.fromEntries(
  Object.entries(raw_ears).map(([key, sprite]) => [key, widen(sprite)])
);
export const faces = Object.fromEntries(
  Object.entries(raw_faces).map(([key, layers]) => [key, layers?.map(widen) ?? null])
);

export const tail = wide(raw_tail);
export const earNeedle = wide(raw_earNeedle);
export const arm = wide(raw_arm);
export const paws = wide(raw_paws);
export const needles = wide(raw_needles);
export const asideNeedle = wide(raw_asideNeedle);
export const floorBall = wide(raw_floorBall);
export const feedStrand = wide(raw_feedStrand);
export const windStrand = wide(raw_windStrand);
export const pulledYarn = wide(raw_pulledYarn);
export const sparkles = wide(raw_sparkles);
export const hearts = wide(raw_hearts);
export const sparkleBurst = wide(raw_sparkleBurst);

/* heldBall 은 스프라이트 하나와 좌표 여러 개를 함께 돌려줍니다.
   좌표는 그리기 함수의 인자로만 쓰여 32열 기준이어야 하므로(그 함수가
   결과를 알아서 넓힙니다) 스프라이트만 넓힙니다. */
export function heldBall(amount) {
  const held = raw_heldBall(amount);
  return { ...held, sprite: widen(held.sprite) };
}
