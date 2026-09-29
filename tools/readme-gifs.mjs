/*!
 * 함뜨마을 동물 친구들 — README 움짤 만들기
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 *   node tools/readme-gifs.mjs
 *
 * 앱과 똑같은 engine.js·스프라이트 팩을 Node 에서 돌려 README 용 GIF 를
 * .github/readme/ 에 다시 뽑습니다. 캐릭터 그림을 고친 뒤 한 번 돌리면
 * README 의 움짤도 같이 맞춰집니다. 의존성은 없습니다 — 캔버스는
 * fillRect 만 받아 적는 가짜로, 시계는 performance.now 를 가상 시계로
 * 바꿔 돌리므로 매번 같은 프레임이 나옵니다.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Companion } from '../src/engine.js';
import * as otter from '../src/otter/sprites.js';
import * as rabbit from '../src/rabbit/sprites.js';
import { STASH } from '../src/stash.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'readme');

// 무대는 발끝(맨 아랫줄)을 맞춰 캐릭터를 앉힙니다. 코토키는 귀 자리
// 때문에 캔버스가 8줄 더 높아서(33×40), 단수달(33×32)은 위가 빕니다.
const STAGE_H = 40;
const MARGIN = 3;

const yarn = Object.fromEntries(STASH.map((s) => [s.id, s.color]));

const CHARACTERS = {
  dansudal: {
    sprites: otter,
    canvas: [33, 32],
    faceRows: [9, 18], // 눈썹부터 주둥이 아랫줄까지
    card: { bg: '#fffaf1', line: '#e0d2bd' },
    colors: [yarn.sage, yarn.butter, yarn.coral]
  },
  kotoki: {
    sprites: rabbit,
    canvas: [33, 40],
    faceRows: [17, 26],
    card: { bg: '#fffcfb', line: '#ecd8d5' },
    colors: [yarn.navy, yarn.butter, yarn.sage]
  }
};

/* ── 가상 시계 ─────────────────────────────────────────── */

let clock = 0;
performance.now = () => clock;
const TICK = 10; // GIF 지연 단위(1/100초)와 같게 맞춥니다.

/* ── 가짜 캔버스 ───────────────────────────────────────── */

function fakeCanvas(width, height) {
  const px = new Array(width * height).fill(null);
  const ctx = {
    canvas: { width, height },
    imageSmoothingEnabled: false,
    fillStyle: null,
    clearRect() { px.fill(null); },
    fillRect(x, y, w, h) {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (xx >= 0 && yy >= 0 && xx < width && yy < height) px[yy * width + xx] = this.fillStyle;
        }
      }
    }
  };
  return { width, height, px, getContext: () => ctx };
}

/* ── 고개 돌리기 ───────────────────────────────────────── */

/**
 * 얼굴 줄(faceRows)에서 윤곽선(o) 안쪽만 dx 칸 옆으로 밉니다. 머리
 * 실루엣은 그대로인데 눈·코·입·볼터치가 한쪽으로 쏠려서, 정면 그림
 * 한 장으로도 고개를 살짝 돌린 것처럼 읽힙니다. 밀려서 빈 자리는
 * 바로 옆 칸 색으로 채우고, 반대편은 그만큼 잘립니다(원근으로 줄어든
 * 쪽 볼).
 */
function turnHead(sprite, [from, to], dx) {
  if (!dx) return sprite;
  return sprite.map((row, y) => {
    if (y < from || y > to) return row;
    const l = row.indexOf('o');
    const r = row.lastIndexOf('o');
    if (l < 0 || r - l <= Math.abs(dx) + 1) return row;
    const inner = row.slice(l + 1, r);
    const moved = dx > 0
      ? inner[0].repeat(dx) + inner.slice(0, -dx)
      : inner.slice(-dx) + inner[inner.length - 1].repeat(-dx);
    return row.slice(0, l + 1) + moved + row.slice(r);
  });
}

/** 표정 덧그림은 얼굴 안에만 있으니 줄째로 밀면 됩니다. */
function turnLayer(sprite, [from, to], dx) {
  if (!dx) return sprite;
  const blank = '.'.repeat(Math.abs(dx));
  return sprite.map((row, y) => {
    if (y < from || y > to) return row;
    return dx > 0 ? blank + row.slice(0, -dx) : row.slice(-dx) + blank;
  });
}

/**
 * 원래 팩을 감싸 연출용 손잡이 두 개를 답니다. look 은 고개 방향
 * (-1 왼쪽, 1 오른쪽), face 는 상태 표와 상관없이 씌울 표정입니다.
 * engine.js 는 render() 때마다 S.head·S.faces 를 새로 읽으므로, 녹화
 * 도중에 값을 바꾸면 다음 프레임부터 그대로 반영됩니다.
 */
function stagePack(ch) {
  const base = ch.sprites;
  const pack = { ...base, look: 0, face: null };
  const heads = new Map();
  Object.defineProperty(pack, 'head', {
    get() {
      if (!heads.has(pack.look)) heads.set(pack.look, turnHead(base.head, ch.faceRows, pack.look));
      return heads.get(pack.look);
    }
  });
  pack.faces = new Proxy({}, {
    get(_, key) {
      const layers = base.faces[pack.face ?? key];
      return layers?.map((layer) => turnLayer(layer, ch.faceRows, pack.look));
    }
  });
  return pack;
}

/* ── 장면 녹화 ─────────────────────────────────────────── */

/**
 * 모델을 원하는 시점으로 곧장 맞춥니다. 실 총량 규칙(knitLength +
 * pile + ball)과 색 구간 형식은 engine.js 와 같게 지킵니다.
 */
function setup(c, { rows = 0, pile = 0, segments }) {
  c.rows = rows;
  c.knitLength = c.visualLength();
  c.pile = pile;
  c.ball = c.initialBall - c.knitLength - pile;
  c.colorSegments = segments.map(([from, color]) => ({ from, color }));
  c.currentColor = segments[segments.length - 1][1];
}

function makeActor(name, { init, x = 0, target = 9 }) {
  const ch = CHARACTERS[name];
  const canvas = fakeCanvas(...ch.canvas);
  const pack = stagePack(ch);
  const c = new Companion(canvas, { sprites: pack, target, yarn: 12, color: ch.colors[0] });
  c.lastBlink = Infinity; // 깜빡임은 장면에서 직접 넣습니다.
  setup(c, init(ch.colors));
  // lean 은 상대 쪽으로 몸을 붙이는 칸 수. leanTo 로 목표만 정하면
  // 한 칸씩 스르륵 움직입니다(한 번에 옮기면 순간이동처럼 보입니다).
  return { ch, canvas, pack, c, x, lean: 0, leanTo: 0 };
}

/**
 * 배우들을 한 무대(width × STAGE_H)에 발끝을 맞춰 세우고, steps 를 가상
 * 시간 위에서 재생하며 화면이 바뀔 때마다 프레임을 끊습니다. 각 단계는
 * [ms] (기다리기), [fn] (조작), ['until', 조건] (조건을 만족할 때까지
 * 돌리기) 중 하나이고, fn 과 조건은 cast 를 받습니다.
 */
function record({ width, actors, cast, steps }) {
  clock = 0;
  actors.forEach((a) => a.c.enter('idle'));

  const frames = [];
  const stage = () => {
    const px = new Array(width * STAGE_H).fill(null);
    for (const a of actors) {
      const [cw, chH] = a.ch.canvas;
      const ox = a.x + a.lean;
      const oy = STAGE_H - chH;
      for (let y = 0; y < chH; y++) {
        for (let x = 0; x < cw; x++) {
          const hex = a.canvas.px[y * cw + x];
          const sx = ox + x;
          if (hex && sx >= 0 && sx < width) px[(oy + y) * width + sx] = hex;
        }
      }
    }
    return px;
  };
  const snap = () => {
    const px = stage();
    const key = px.join();
    const last = frames[frames.length - 1];
    if (last && last.key === key) last.ms += TICK;
    else frames.push({ key, px, ms: TICK });
  };
  const tick = () => {
    clock += TICK;
    for (const a of actors) {
      a.c.step(clock);
      if (a.lean !== a.leanTo && clock % 80 === 0) a.lean += Math.sign(a.leanTo - a.lean);
    }
    snap();
  };

  for (const step of steps) {
    if (typeof step === 'number') {
      for (let t = 0; t < step; t += TICK) tick();
    } else if (typeof step === 'function') {
      step(cast); // 바뀐 모습은 다음 틱에 찍힙니다(조작 자체는 시간이 안 듭니다).
    } else if (step[0] === 'until') {
      for (let guard = 0; !step[1](cast); guard++) {
        if (guard > 3000) throw new Error('until 조건이 30초 안에 안 끝납니다');
        tick();
      }
    }
  }
  // 둘 이상이 각자 박자로 움직이면 한쪽만 바뀐 20~30ms짜리 프레임이
  // 사이사이 끼어 프레임 수만 두 배가 됩니다. 눈에 안 보이는 길이라
  // 앞 프레임에 합칩니다.
  const merged = [];
  for (const f of frames) {
    if (f.ms < 50 && merged.length) merged[merged.length - 1].ms += f.ms;
    else merged.push(f);
  }
  return { width, height: STAGE_H, frames: merged };
}

/* ── 혼자 나오는 장면 (기능 표) ────────────────────────── */

// 이 장면들의 단계는 Companion 하나(c)를 받습니다.
const idle = ['until', (c) => c.state === 'idle'];
const blink = (c) => { c.blink = true; c.render(); };
const unblink = (c) => { c.blink = false; c.render(); };
const addRow = (c) => c.addRow();
const ripRow = (c) => c.ripRow();
const wind = (c) => c.wind();
const swapTo = (i) => (c) => c.swapYarn(COLORS_BY_PACK.get(c.S)[i]);
const COLORS_BY_PACK = new Map();

const SCENES = {
  // 한 단씩 떠서 편물이 자랍니다.
  knit: {
    init: ([a]) => ({ rows: 2, segments: [[0, a]] }),
    steps: [600, blink, 140, unblink, 400, addRow, idle, 350, addRow, idle, 350, addRow, idle, 900]
  },
  // 느낌표 → 바늘 뽑기 → 잡아당기기. 푼 실은 바닥에 쌓입니다.
  rip: {
    init: ([a]) => ({ rows: 6, segments: [[0, a]] }),
    steps: [700, ripRow, idle, 400, ripRow, idle, 1100]
  },
  // 바닥에 쌓인 실을 실뭉치로 다시 감습니다.
  wind: {
    init: ([a]) => ({ rows: 4, pile: 3, segments: [[0, a]] }),
    steps: [700, wind, idle, 1100]
  },
  // 실 색을 바꿔가며 뜨면 그대로 줄무늬가 됩니다.
  stripes: {
    init: ([a]) => ({ rows: 2, segments: [[0, a]] }),
    steps: [500, swapTo(1), 300, addRow, idle, 250, addRow, idle, 350, swapTo(2), 300,
      addRow, idle, 250, addRow, idle, 1100]
  },
  // 마지막 한 단 → 완성 반짝임 → 자랑하기 → 입어보기.
  finish: {
    init: ([a, b, cc]) => ({ rows: 8, segments: [[0, a], [3, b], [6, cc]] }),
    steps: [600, addRow, ['until', (c) => c.state === 'showoff'], 1800,
      (c) => c.tryOn(), ['until', (c) => c.state === 'wearing'], 2800]
  }
};

function recordSolo(name, scene) {
  const actor = makeActor(name, scene);
  COLORS_BY_PACK.set(actor.pack, actor.ch.colors);
  return record({ width: 33, actors: [actor], cast: actor.c, steps: scene.steps });
}

/* ── 둘이 같이 나오는 배너 ─────────────────────────────── */

// 이 단계들은 cast = { o: 단수달, r: 코토키 } 를 받습니다.
// 단수달 캔버스 오른쪽 끝엔 실뭉치 자리만 있어서, 살짝 겹쳐 세워야
// 둘이 나란히 붙어 앉은 거리가 됩니다.
const GAP = -2;
const turn = (who, dir) => (d) => { d[who].pack.look = dir; d[who].c.render(); };
const face = (who, key) => (d) => { d[who].pack.face = key; d[who].c.render(); };
const lean = (who, dx) => (d) => { d[who].leanTo = dx; };
const act = (who, fn) => (d) => fn(d[who].c);
const until = (fn) => ['until', fn];
const is = (who, state, frame = 0) => (d) => d[who].c.state === state && d[who].c.frame >= frame;

// 힐끔 볼 땐 얼굴만 1칸, 대놓고 마주 볼 땐 2칸 돌립니다.
const BANNER = {
  o: { init: ([a, b, cc]) => ({ rows: 7, segments: [[0, a], [3, b], [6, cc]] }) },
  r: { init: ([a, b, cc]) => ({ rows: 7, segments: [[0, a], [2, b], [5, cc]] }) },
  steps: [
    // 나란히 한 단씩.
    400, act('o', addRow), 250, act('r', addRow), until((d) => is('o', 'idle')(d) && is('r', 'idle')(d)),
    200, act('o', blink), 140, act('o', unblink), 300,
    // 힐끔 — 서로 쳐다봤다가 다시 제 뜨개로.
    turn('o', 1), turn('r', -1), 900, turn('o', 0), turn('r', 0), 300,
    act('r', blink), 140, act('r', unblink), 200,
    // 단수달이 먼저 완성. 반짝이는 순간 코토키가 돌아보며 "우와".
    act('o', addRow), until(is('o', 'complete', 3)),
    turn('r', -2), face('r', 'starry'),
    until(is('o', 'showoff')), turn('o', 2), lean('o', 2), 1600,
    // 코토키도 마지막 한 단. 단수달은 목도리를 든 채 지켜봅니다.
    face('r', null), turn('r', 0), 250,
    act('r', addRow), until(is('r', 'showoff')), turn('r', -2), lean('r', -2), 2000,
    // 둘 다 입어보고 마주 보며 뿌듯.
    act('o', (c) => c.tryOn()), 250, act('r', (c) => c.tryOn()),
    until((d) => is('o', 'wearing')(d) && is('r', 'wearing')(d)),
    lean('o', 1), lean('r', -1), 2600
  ]
};

const DUO_W = 33 + GAP + 33;

function recordBanner() {
  const o = makeActor('dansudal', BANNER.o);
  const r = makeActor('kotoki', { ...BANNER.r, x: 33 + GAP });
  return record({ width: DUO_W, actors: [o, r], cast: { o, r }, steps: BANNER.steps });
}

// README 맨 위 배너 카드. 공원 잔디에 피크닉 매트를 깔고 둘이 나란히
// 앉아 뜹니다(paintPicnic). 폭은 README 본문 폭 안에서 줄어들지 않고
// 선명하게 보이도록 4배율 기준 768px(192칸)이고, 오른쪽에 나무가 설
// 자리를 남기느라 두 친구는 가운데보다 살짝 왼쪽에 앉습니다.
const BANNER_W = 192;
const BANNER_LEFT = 58;
const BANNER_CARD = {
  bg: '#bce4f7', // 배경은 paintPicnic 이 전부 덮습니다
  pad: { left: BANNER_LEFT, top: 5, right: BANNER_W - BANNER_LEFT - DUO_W, bottom: 3 },
  scene: paintPicnic
};

/* ── 배너 배경: 공원 피크닉 ────────────────────────────── */

const PICNIC = {
  sky: ['#a6d9f4', '#bce4f7', '#d4eefa'],
  cloud: { W: '#ffffff', S: '#e4f3fb' },
  hill: '#95cf79',
  hillTop: '#86c56b',
  grass: '#aadb88',
  tuft: '#8fcb6d',
  shadow: '#97cf76',
  petal: ['#ffffff', '#f7b3c2'],
  center: '#f6c945',
  mat: { base: '#fff4cf', stripe: '#f7d66c', cross: '#eeba36', edge: '#d6a331' },
  // 가까운 나무와, 옅게 칠해 뒤쪽에 선 것처럼 보이는 먼 나무.
  tree: {
    leaf: '#7cc464', leafLight: '#9ad97c', leafDark: '#5fa94f', leafEdge: '#4a8b40',
    bark: '#a3724a', barkDark: '#83573a', barkEdge: '#6a4530'
  },
  farTree: {
    leaf: '#93cf7a', leafLight: '#abdf92', leafDark: '#7fbf69', leafEdge: '#6aac5b',
    bark: '#b58a64', barkDark: '#9c7352', barkEdge: '#85624a'
  },
  // 매트 위에 놓을 실뭉치 색(실 창고에서).
  balls: { left: [yarn.sage, yarn.blush, yarn.navy], right: [yarn.charcoal, yarn.plum, yarn.coral] }
};

// 나무 잎 덩어리(원) 배치. 뿌리(ground) 기준 [dx, dy, 반지름]이고,
// 크기 s 만큼 통째로 줄이거나 좌우를 뒤집어서 여러 그루로 씁니다.
const TREE_LOBES = [[-6, -21, 6.5], [6, -21, 6.5], [0, -27, 7.5], [-1, -19, 6.5], [9, -26, 4.5], [-9, -27, 4.5]];

// 매트 위 실뭉치. 색은 앱 속 실뭉치와 같은 규칙(paletteFor)으로 뽑아
// k 테두리, y 실, d 감긴 실결, F 볕 드는 자리를 칠합니다.
const BALL_BIG = [
  '..kkk..',
  '.kFyyk.',
  'kFyydyk',
  'kyydyyk',
  'kydyydk',
  '.kyydk.',
  '..kkk..'
];
const BALL_SMALL = [
  '.kkk.',
  'kFydk',
  'kydyk',
  'kdyyk',
  '.kkk.'
];

const CLOUD_BIG = [
  '......WWWW........',
  '...WWWWWWWWW.WWW..',
  '.WWWWWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWWWWW',
  '.SSSSSSSSSSSSSSSS.'
];
const CLOUD_SMALL = [
  '...WWW....',
  '.WWWWWWW..',
  'WWWWWWWWWW',
  '.SSSSSSSS.'
];

/** 자리마다 늘 같은 값이 나오는 의사난수(0~1). 풀포기를 흩뿌릴 때 씁니다. */
function hash01(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * 파란 하늘, 초록 잔디, 양쪽의 나무, 실뭉치를 늘어놓은 노란 체크무늬
 * 피크닉 매트. 전부 논리 픽셀 단위로 그려서 캐릭터와 같은 크기의
 * 픽셀로 키워집니다. stage 는 캐릭터들이 앉는 자리(발끝이 stage 맨
 * 아랫줄)입니다.
 */
function paintPicnic({ put, width, height, stage }) {
  const C = PICNIC;
  const horizon = stage.y + 25;
  const right = stage.x + stage.width;
  const stamp = (rows, ox, oy, colors) => rows.forEach((row, y) => {
    [...row].forEach((ch, x) => { if (colors[ch]) put(ox + x, oy + y, colors[ch]); });
  });

  // 하늘 — 위가 진하고 지평선 쪽이 옅은 세 띠. 띠가 바뀌는 줄은 두
  // 색을 체크로 섞어 경계를 부드럽게 합니다.
  const bands = [Math.round(horizon * 0.38), Math.round(horizon * 0.72)];
  for (let y = 0; y < horizon; y++) {
    const band = y < bands[0] ? 0 : y < bands[1] ? 1 : 2;
    const dither = bands.includes(y);
    for (let x = 0; x < width; x++) put(x, y, C.sky[dither && (x + y) % 2 === 0 ? band - 1 : band]);
  }
  stamp(CLOUD_SMALL, 46, 2, C.cloud);
  stamp(CLOUD_SMALL, stage.x + 12, 3, C.cloud);
  stamp(CLOUD_BIG, right + 2, 7, C.cloud);

  // 지평선의 낮은 덤불 — 사인 두 개를 겹쳐 울퉁불퉁하게.
  for (let x = 0; x < width; x++) {
    const h = Math.max(1, Math.round(2.2 + 1.3 * Math.sin(x * 0.23) + 0.9 * Math.sin(x * 0.61 + 1.3)));
    for (let y = horizon - h; y < horizon; y++) put(x, y, y === horizon - h ? C.hillTop : C.hill);
  }

  // 잔디와 풀포기(∨ 모양).
  for (let y = horizon; y < height; y++) {
    for (let x = 0; x < width; x++) put(x, y, C.grass);
  }
  for (let y = horizon + 2; y < height - 1; y++) {
    for (let x = 1; x < width - 3; x++) {
      if (hash01(x, y) < 0.02) { put(x, y, C.tuft); put(x + 2, y, C.tuft); put(x + 1, y + 1, C.tuft); }
    }
  }

  // 나무 한 그루 — 그림자, 줄기, 잎 덩어리 순서로 겹칩니다.
  const tree = (tx, ground, { s = 1, flip = false, far = false } = {}) => {
    const P = far ? C.farTree : C.tree;
    const [rx, ry] = [11.5 * s, Math.max(1.5, 2.2 * s)];
    for (let y = Math.floor(ground - ry); y <= ground + ry; y++) {
      for (let x = Math.floor(tx - rx); x <= tx + rx; x++) {
        if (((x + 0.5 - tx) / rx) ** 2 + ((y + 0.5 - ground) / ry) ** 2 <= 1) put(x, y, C.shadow);
      }
    }
    const half = s >= 0.9 ? 2 : 1;
    for (let y = Math.round(ground - 20 * s); y <= ground; y++) {
      const flare = half > 1 && y >= ground - 1 ? 1 : 0; // 큰 나무는 뿌리 쪽을 한 칸씩 넓게
      const [l, r] = [tx - half - flare, tx + half + flare];
      for (let x = l; x <= r; x++) {
        put(x, y, x === l || x === r || y === ground ? P.barkEdge : x >= tx + 1 ? P.barkDark : P.bark);
      }
    }
    const lobes = TREE_LOBES.map(([dx, dy, r]) => [tx + (flip ? -dx : dx) * s, ground + dy * s, r * s]);
    const inCanopy = (x, y) => lobes.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
    const canopyBottom = Math.max(...lobes.map(([, cy, r]) => cy + r));
    for (let y = 0; y < ground; y++) {
      for (let x = Math.floor(tx - 16 * s); x <= tx + 16 * s; x++) {
        if (!inCanopy(x, y)) continue;
        const edge = !inCanopy(x - 1, y) || !inCanopy(x + 1, y) || !inCanopy(x, y - 1) || !inCanopy(x, y + 1);
        // 덩어리마다 왼쪽 위에 볕 드는 자리를 둬서 잎이 뭉게뭉게 보이게 합니다.
        const lit = lobes.some(([cx, cy, r]) =>
          (x + 0.5 - (cx - r * 0.3)) ** 2 + (y + 0.5 - (cy - r * 0.35)) ** 2 <= (r * 0.45) ** 2);
        const shade = y >= canopyBottom - 4 * s;
        put(x, y, edge ? P.leafEdge : lit ? P.leafLight : shade ? P.leafDark : P.leaf);
      }
    }
  };
  // 양쪽에 두 그루씩 — 바깥은 가까운 큰 나무, 안쪽은 뒤에 선 작은 나무.
  // 뒤에 있는 나무부터 그려야 앞 나무가 덮습니다.
  tree(38, horizon + 3, { s: 0.72, far: true, flip: true });
  tree(right + 31, horizon + 3, { s: 0.72, far: true });
  tree(15, horizon + 7);
  tree(width - 15, horizon + 6, { flip: true });

  // 들꽃 몇 송이 — 매트와 나무 그림자를 피해서.
  const flower = (x, y, petal) => {
    [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => put(x + dx, y + dy, petal));
    put(x, y, C.center);
  };
  const [white, pink] = C.petal;
  [[5, 43, white], [22, 45, pink], [31, 41, white],
    [right + 24, 43, pink], [right + 36, 40, white], [width - 22, 44, white], [width - 6, 42, pink]]
    .forEach(([x, y, petal]) => flower(x, y, petal));

  // 노란 체크무늬 피크닉 매트. 아래로 갈수록 넓어지는 사다리꼴이고,
  // 세로 줄무늬도 양옆 변을 따라 벌어져서 바닥에 깔린 것처럼 보입니다.
  // 두 친구 양옆에 실뭉치를 놓을 자리까지 넉넉하게 폅니다.
  const top = stage.y + 31;
  const bottom = height - 2;
  const left0 = stage.x - 16;
  const right0 = right + 15;
  const columns = Math.round((right0 - left0) / 4);
  for (let y = top; y <= bottom; y++) {
    const grow = Math.floor((y - top) / 3);
    const l = left0 - grow;
    const r = right0 + grow;
    for (let x = l; x <= r; x++) {
      const edge = y === top || y === bottom || x === l || x === r;
      const across = Math.floor(((x - l) / (r - l + 1)) * columns) % 2 === 0;
      const down = Math.floor((y - top) / 2) % 2 === 0;
      put(x, y, edge ? C.mat.edge : across && down ? C.mat.cross : across || down ? C.mat.stripe : C.mat.base);
    }
  }

  // 매트 위 실뭉치 — 양옆에 한 무더기씩(뒤에 놓인 것부터), 앞쪽
  // 실뭉치에서는 실 한 가닥이 매트 밖 잔디까지 풀려 나옵니다.
  const ball = (rows, x, y, hex) => stamp(rows, x, y, otter.paletteFor(hex));
  const strand = (points, hex) => points.forEach(([x, y]) => put(x, y, otter.paletteFor(hex).y));
  const [backL, bigL, frontL] = C.balls.left;
  const [backR, bigR, frontR] = C.balls.right;
  ball(BALL_SMALL, stage.x - 11, top - 1, backL);
  ball(BALL_BIG, stage.x - 14, top + 2, bigL);
  ball(BALL_SMALL, stage.x - 7, top + 4, frontL);
  strand([[stage.x - 15, top + 7], [stage.x - 16, top + 8], [stage.x - 17, top + 8], [stage.x - 18, top + 9],
    [stage.x - 19, top + 9], [stage.x - 20, top + 10], [stage.x - 21, top + 10]], bigL);
  ball(BALL_SMALL, right + 6, top - 1, backR);
  ball(BALL_BIG, right + 3, top + 2, bigR);
  ball(BALL_SMALL, right + 10, top + 4, frontR);
  strand([[right + 15, top + 7], [right + 16, top + 8], [right + 17, top + 8], [right + 18, top + 9],
    [right + 19, top + 9], [right + 20, top + 9], [right + 21, top + 8]], frontR);
}

/* ── 카드에 올려서 크게 키우기 ─────────────────────────── */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 무대의 논리 픽셀을 카드에 올리고 scale 배로 키웁니다. 카드는 둥근
 * 모서리이고 모서리 밖은 투명이라, README 의 밝은/어두운 테마 어디서든
 * 카드만 떠 보입니다. card.line 이 있으면 테두리를 두르고, card.scene
 * 이 있으면 배경을 그 함수로 그립니다. card.pad 는 무대 둘레의 여백입니다.
 */
function compose({ width, height, frames }, card, scale) {
  const pad = { left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN, ...card.pad };
  const cw = pad.left + width + pad.right;
  const ch = pad.top + height + pad.bottom;
  const W = cw * scale;
  const H = ch * scale;
  const radius = 3 * scale;
  const border = Math.max(2, Math.round(scale / 2));

  const background = new Array(cw * ch).fill(card.bg);
  card.scene?.({
    put(x, y, hex) { if (x >= 0 && y >= 0 && x < cw && y < ch) background[y * cw + x] = hex; },
    width: cw,
    height: ch,
    stage: { x: pad.left, y: pad.top, width, height }
  });

  // 0 번은 투명(카드 모서리 밖), 나머지는 쓰이는 순서대로.
  const palette = [[0, 0, 0]];
  const index = new Map();
  const colorIndex = (hex) => {
    if (!index.has(hex)) { index.set(hex, palette.length); palette.push(hexToRgb(hex)); }
    return index.get(hex);
  };
  const line = card.line ? colorIndex(card.line) : null;

  // 카드와 배경은 모든 프레임이 같으니 한 번만 계산합니다.
  const base = new Uint8Array(W * H);
  const inside = (x, y, inset) => {
    const r = radius - inset;
    const cx = Math.min(Math.max(x + 0.5, inset + r), W - inset - r);
    const cy = Math.min(Math.max(y + 0.5, inset + r), H - inset - r);
    return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
      && x >= inset && y >= inset && x < W - inset && y < H - inset;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y, 0)) continue;
      base[y * W + x] = line !== null && !inside(x, y, border)
        ? line
        : colorIndex(background[Math.floor(y / scale) * cw + Math.floor(x / scale)]);
    }
  }

  const out = [];
  for (const { px, ms } of frames) {
    const img = base.slice();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hex = px[y * width + x];
        if (!hex) continue;
        const idx = colorIndex(hex);
        const sx = (pad.left + x) * scale;
        const sy = (pad.top + y) * scale;
        for (let dy = 0; dy < scale; dy++) img.fill(idx, (sy + dy) * W + sx, (sy + dy) * W + sx + scale);
      }
    }
    const last = out[out.length - 1];
    if (last && last.img.every((v, i) => v === img[i])) last.ms += ms;
    else out.push({ img, ms });
  }

  if (palette.length > 256) throw new Error('GIF 한 장에 색이 256개를 넘습니다');
  return { width: W, height: H, palette, frames: out };
}

/* ── GIF89a 인코더 ─────────────────────────────────────── */

function lzw(indices, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let dict = new Map();
  const bytes = [];
  let acc = 0;
  let bits = 0;
  const emit = (code) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) { bytes.push(acc & 255); acc >>>= 8; bits -= 8; }
  };

  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const found = dict.get(key);
    if (found !== undefined) { prefix = found; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      dict = new Map();
      codeSize = minCodeSize + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      dict.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) bytes.push(acc & 255);
  return bytes;
}

/** 앞 프레임과 달라진 픽셀을 모두 담는 가장 작은 사각형. */
function changedRect(img, prev, width, height) {
  if (!prev) return { x: 0, y: 0, w: width, h: height };
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < img.length; i++) {
    if (img[i] === prev[i]) continue;
    const x = i % width;
    const y = (i - x) / width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function encodeGif({ width, height, palette, frames }) {
  const tableBits = Math.max(2, Math.ceil(Math.log2(palette.length)));
  const tableSize = 1 << tableBits;
  const b = [];
  const u16 = (n) => b.push(n & 255, (n >> 8) & 255);
  const ascii = (s) => { for (const ch of s) b.push(ch.charCodeAt(0)); };

  ascii('GIF89a');
  u16(width); u16(height);
  b.push(0x80 | ((tableBits - 1) << 4) | (tableBits - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) b.push(...(palette[i] ?? [0, 0, 0]));

  // 무한 반복.
  b.push(0x21, 0xff, 11); ascii('NETSCAPE2.0'); b.push(3, 1, 0, 0, 0);

  // 배경은 그대로고 캐릭터만 움직이니, 둘째 프레임부터는 앞 프레임과
  // 달라진 사각형만 덧그립니다(처리 방식 1: 앞 프레임을 그대로 둠).
  // 투명 색(0번)은 카드 바깥 모서리뿐이라 덧그려도 앞 프레임과 같습니다.
  let prev = null;
  for (const { img, ms } of frames) {
    const { x, y, w, h } = changedRect(img, prev, width, height);
    const sub = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) sub.set(img.subarray((y + row) * width + x, (y + row) * width + x + w), row * w);

    b.push(0x21, 0xf9, 4, (1 << 2) | 1); u16(Math.max(2, Math.round(ms / 10))); b.push(0, 0);
    b.push(0x2c); u16(x); u16(y); u16(w); u16(h); b.push(0);
    b.push(tableBits);
    const data = lzw(sub, tableBits);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      b.push(chunk.length, ...chunk);
    }
    b.push(0);
    prev = img;
  }
  b.push(0x3b);
  return Uint8Array.from(b);
}


/* ── 실행 ──────────────────────────────────────────────── */

const SCALE = 4;

function save(file, gif) {
  writeFileSync(join(OUT_DIR, file), gif);
  console.log(`${file}  ${(gif.length / 1024).toFixed(1)}KB`);
}

mkdirSync(OUT_DIR, { recursive: true });
save('banner.gif', encodeGif(compose(recordBanner(), BANNER_CARD, SCALE)));
for (const [name, ch] of Object.entries(CHARACTERS)) {
  for (const [scene, def] of Object.entries(SCENES)) {
    save(`${name}-${scene}.gif`, encodeGif(compose(recordSolo(name, def), ch.card, SCALE)));
  }
}
