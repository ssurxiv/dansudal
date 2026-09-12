/*!
 * 단수달 (Knitting Companion) — 엔진
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 */

import { SIZE, blit, sliceRows } from './pixel.js';
import * as S from './sprites.js';
import { STATES, ENTRY } from './states.js';

/**
 * 손을 몸통 폭 밖으로 넓게 벌리는 자세(자랑하기/입어보기 전환)에서
 * 쓰는 레이어 세트. 어깨(SHOULDER_L/R)에서 손까지 팔을 그어야
 * 손이 몸에 붙어 보입니다 — 팔 없이 paws() 만 찍으면 손이 따로 뜹니다.
 */
function spreadHold(top) {
  const lx = 4, rx = 24;
  return [
    [S.arm(S.SHOULDER_L[0], S.SHOULDER_L[1], lx + 3, top + 1), S.BODY],
    [S.arm(S.SHOULDER_R[0], S.SHOULDER_R[1], rx, top + 1), S.BODY],
    [S.paws(lx, top, rx, top), S.BODY]
  ];
}

/**
 * 실뭉치·바닥·가닥처럼 "지금 쓰는 실 색 하나"만 필요한 실용 레이어의
 * 팔레트. 색 구간(colorSegments)까지 따질 필요 없이 늘 최근 색입니다.
 */
function currentPalette(c) {
  return S.paletteFor(c.currentColor);
}

/**
 * 뜨개감(knit)은 실 교체가 있었으면 knitLength 구간별로 색이 달라져야
 * 하니, 한 스프라이트를 색 구간 수만큼 잘라 각기 다른 팔레트로 겹쳐
 * 그릴 레이어 목록을 만듭니다.
 */
/**
 * KNIT_TOP(맨 위, 고정)은 바늘·손이 항상 있는 자리라 실제로는
 * "가장 최근에 뜬 코"이고, 아래쪽 움직이는 테두리가 캐스트온(가장
 * 먼저 뜬 코)입니다 — 새 단을 뜨면 반짝임도 늘 KNIT_TOP+1 에서
 * 터지는 게 그 증거입니다. 그래서 최근 색이 위로, 오래된 색이
 * 아래로 쌓이도록 knitLength 를 뒤집어 배치합니다.
 */
function knitLayers(c, flash) {
  if (c.knitLength <= 0) return [];
  const full = S.knit(c.knitLength, flash);
  const segs = c.segmentsUpTo(c.knitLength);
  const length = c.knitLength;
  const layers = [
    // 바늘 쪽(맨 위, 고정) 테두리는 실제로 떠진 가장 최근 색.
    [sliceRows(full, S.KNIT_TOP, S.KNIT_TOP), S.paletteFor(segs[segs.length - 1].color)]
  ];
  segs.forEach((seg) => {
    const fromY = S.KNIT_TOP + length - seg.to + 1;
    const toY = S.KNIT_TOP + length - seg.from;
    layers.push([sliceRows(full, fromY, toY), S.paletteFor(seg.color)]);
  });
  // 캐스트온 쪽(맨 아래, 움직이는) 테두리는 처음 썼던 색.
  const bottomY = Math.min(S.KNIT_TOP + length + 1, 30);
  layers.push([sliceRows(full, bottomY, bottomY), S.paletteFor(segs[0].color)]);
  return layers;
}

/**
 * 완성 후에는 knitLength 가 늘 MAX_KNIT 로 고정되니, colorSegments 를
 * 0~MAX_KNIT 비율로 매핑해 완성품·목에 두른 스카프에도 실 교체
 * 이력이 줄무늬로 남게 합니다. knitLayers 와 같은 방향(최근 색이
 * 위)으로 맞추려고 비율을 뒤집어서 씁니다.
 */
function colorForFraction(c, frac) {
  const unit = Math.round((1 - frac) * S.MAX_KNIT);
  let color = c.colorSegments[0].color;
  for (const seg of c.colorSegments) {
    if (seg.from <= unit) color = seg.color;
    else break;
  }
  return color;
}

function stripedRows(c, sprite, fromY, toY) {
  const span = toY - fromY;
  const layers = [];
  for (let y = fromY; y <= toY; y++) {
    const frac = span <= 0 ? 1 : (y - fromY) / span;
    layers.push([sliceRows(sprite, y, y), S.paletteFor(colorForFraction(c, frac))]);
  }
  return layers;
}

function pieceLayers(c, top) {
  return stripedRows(c, S.finishedPiece(top), top, top + S.FINISHED_PIECE_SPAN + 1);
}

function scarfLayers(c) {
  return stripedRows(c, S.wornScarf(), 19, 28);
}

/**
 * 자세 하나는 캐릭터 앞쪽에 그릴 레이어를 정합니다.
 * 뒤쪽(꼬리·몸통·머리)은 모든 자세가 공유합니다.
 */
const POSES = {
  holdWork(c) {
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), currentPalette(c)],
        [S.floorBall(c.ball), currentPalette(c)]
      ],
      front: [
        [S.needles(1, 0), S.NEEDLE],
        ...knitLayers(c, false),
        [S.paws(7, 21, 21, 21), S.BODY]
      ]
    };
  },

  knitting(c, frame) {
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), currentPalette(c)],
        [S.floorBall(c.ball), currentPalette(c)]
      ],
      front: [
        [S.needles(frame, 0), S.NEEDLE],
        ...knitLayers(c, c.flash),
        [S.paws(7, 21, 21, 21), S.BODY]
      ]
    };
  },

  /* 오른쪽 바늘을 코에서 뽑으면서, 화면 밖으로 미끄러져 나가
     "갑자기 사라지는" 대신 귀 뒤에 꽂아둔 것처럼 보이게 합니다. */
  pullingNeedle(c, frame) {
    const step = Math.min(frame, 1);
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), currentPalette(c)],
        [S.floorBall(c.ball), currentPalette(c)],
        ...(step >= 1 ? [[S.earNeedle(), S.NEEDLE]] : [])
      ],
      front: [
        [S.needles(1, step * 2), S.NEEDLE],
        ...knitLayers(c, false),
        [S.paws(7, 21, 21 + step * 2, 21 - step * 2), S.BODY]
      ]
    };
  },

  yanking(c, frame) {
    const [rx, ry] = S.yanks[frame % S.yanks.length];
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), currentPalette(c)],
        [S.floorBall(c.ball), currentPalette(c)],
        [S.earNeedle(), S.NEEDLE]
      ],
      front: [
        [S.needles(1, 2), S.NEEDLE],
        ...knitLayers(c, false),
        [S.pulledYarn(rx, ry), currentPalette(c)],
        [S.paws(7, 21, rx, ry), S.BODY]
      ]
    };
  },

  /* 완성 — frame 0~2 는 마지막 반짝임이 커지는 예고, frame 3 에서
     편물이 처음으로 다른 물건(finishedPiece)이 되는 순간을 한꺼번에
     반짝이는 sparkleBurst 로 못박고, 이후엔 잦아드는 반짝임입니다. */
  complete(c, frame) {
    if (frame < 3) {
      return {
        behind: [
          [S.feedStrand(c.knitLength, c.ball), currentPalette(c)],
          [S.floorBall(c.ball), currentPalette(c)]
        ],
        front: [
          [S.needles(1, 0), S.NEEDLE],
          ...knitLayers(c, true),
          [S.paws(7, 21, 21, 21), S.BODY]
        ]
      };
    }
    // 완성되는 순간(반짝임이 한꺼번에 터지는 여기)에 실뭉치도 함께
    // 치웁니다 — 다 떴으니 더 쓸 일이 없는 실뭉치를 계속 바닥에
    // 그려두는 게 어색해서, 이미 있는 "짜잔" 전환 프레임에 얹었습니다.
    return {
      behind: [],
      front: [
        ...pieceLayers(c, 20),
        [S.paws(7, 21, 21, 21), S.BODY],
        [frame === 3 ? S.sparkleBurst() : S.sparkles(frame), S.SPARK]
      ]
    };
  },

  /* 자랑하기 — 양팔을 넓게 벌려 들어 보이며 살짝 흔듭니다. */
  showoff(c, frame) {
    const top = 19 - ((frame % 8 < 4) ? 0 : 1);
    return {
      behind: [],
      front: [
        ...pieceLayers(c, top),
        [S.sparkles(frame), S.SPARK],
        ...spreadHold(top)
      ]
    };
  },

  /* 입어보기 예비 동작 — 반짝임이 몰아치는 짧은 전환. */
  wrapping(c, frame) {
    return {
      behind: [],
      front: [
        ...pieceLayers(c, 19),
        [S.sparkles(frame * 2), S.SPARK],
        ...spreadHold(19)
      ]
    };
  },

  /* 실 감기 예비 동작 — 바늘·편물을 내려놓고 실뭉치를 들기 전
     잠깐 손을 늦춥니다. frame 0 은 아직 평소처럼 쥐고 있는 모습. */
  settingDown(c, frame) {
    if (frame === 0) return POSES.holdWork(c);
    return {
      behind: [
        [S.asideKnit, currentPalette(c)],
        [S.asideNeedle(), S.NEEDLE],
        [S.floorBall(c.ball), currentPalette(c)]
      ],
      front: [
        [S.paws(6, 25, 20, 25), S.BODY]
      ]
    };
  },

  /* 착용 — 목에 두른 wornScarf. 손은 편하게 내려놓고, 하트가
     옆에서 은은하게 떠오릅니다. */
  wearing(c, frame) {
    return {
      behind: [],
      front: [
        ...scarfLayers(c),
        [S.paws(7, 21, 21, 21), S.BODY],
        [S.hearts(frame), S.NEEDLE]
      ]
    };
  },

  /* 편물은 옆에 내려놓고 실뭉치를 품에 안습니다. */
  winding(c, frame) {
    const held = S.heldBall(c.ball);
    const [rx, ry] = held.arc[frame % held.arc.length];
    const [lx, ly] = held.leftPaw;
    return {
      behind: [
        [S.asideKnit, currentPalette(c)],
        [S.asideNeedle(), S.NEEDLE],
        [S.windStrand(c.ball), currentPalette(c)],
        [held.sprite, currentPalette(c)]
      ],
      front: [
        [S.paws(lx, ly, rx, ry), S.BODY]
      ]
    };
  }
};

/* 상태가 프레임 위에서 호출하는 액션들. 모델만 건드립니다. */
const ACTIONS = {
  flashOn(c) { c.flash = true; },
  flashOff(c) { c.flash = false; },

  dropRow(c) {
    c.rows = Math.max(0, c.rows - 1);
    c.ripped += 1;
    const want = c.visualLength();
    while (c.knitLength > want && c.pile < S.MAX_PILE) {
      c.knitLength -= 1;
      c.pile += 1;
    }
    c.emit();
  },

  windOne(c) {
    if (c.pile <= 0) return;
    c.pile -= 1;
    c.ball += 1;
    c.emit();
  }
};

const CONDITIONS = {
  always: () => true,
  pileRemains: (c) => c.pile > 0
};

const FINISHED_STATES = new Set(['complete', 'showoff', 'wrapping', 'wearing']);

// 저장 데이터 스키마 버전. 필드 구성이 바뀌면 올립니다 — 나중에 여러
// 프로젝트 지원 등으로 확장할 때 기존 사용자 데이터를 마이그레이션할
// 유일한 단서라 지금부터 넣어둡니다.
// v1 → v2: notes(단수 메모) 필드 추가. restore() 에서 v1 데이터는
// 버리지 않고 notes: [] 로 보정합니다.
const SCHEMA = 2;

let noteSeq = 0;
const makeNoteId = () => `note-${Date.now().toString(36)}-${(noteSeq++).toString(36)}`;

/**
 * 메모 입력을 검증하고 정규화합니다. row(특정 단)와 every(N단마다)는
 * 정확히 하나만 있어야 하고, message 는 비어있지 않아야 합니다.
 * 조건을 못 만족하면 null 을 돌려줍니다.
 */
function normalizeNote(input, id) {
  const row = Number.isFinite(input?.row) ? Math.floor(input.row) : null;
  const every = Number.isFinite(input?.every) ? Math.floor(input.every) : null;
  const message = typeof input?.message === 'string' ? input.message.trim() : '';
  if (!message) return null;
  const hasRow = row !== null && row >= 1;
  const hasEvery = every !== null && every >= 1;
  if (hasRow === hasEvery) return null; // 둘 다 없거나 둘 다 있으면 무효
  return { id: id ?? makeNoteId(), row: hasRow ? row : null, every: hasEvery ? every : null, message };
}

/* 벗고 다시 자랑할 때 매번 같은 말이면 심심하니 랜덤으로 고릅니다. */
const SHOWOFF_LINES = ['예쁘죠?', '뿌듯하다!', '짜잔!', '완전 마음에 들어!', '이야, 잘 됐다!'];
/* 처음 들어왔을 때·초기화했을 때도 매번 같은 문구면 심심하니까. */
const IDLE_GREETINGS = ['같이 떠요 :)', '오늘은 뭘 뜨지 o_o?', '뭐부터 떠볼까?', '실 준비됐어요!'];
const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];

export class Companion {
  constructor(canvas, options = {}) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // 모델. 실 총량은 knitLength + pile + ball 로 보존되지만, 실
    // 교체(swapYarn) 시점에는 새 실뭉치가 열리는 거라 ball 이 다시
    // 가득 채워집니다 — 그 사이 구간에서만 보존됩니다.
    this.target = options.target ?? 20;
    this.rows = 0;
    this.ripped = 0;
    this.knitLength = 0;
    this.pile = 0;
    this.initialBall = options.yarn ?? 12;
    this.ball = this.initialBall;

    // 다 쓴 볼 수(usedBall)와 보유 볼 수(totalBall)는 뜨개 진행량에서
    // 계산하지 않고, 실물 실뭉치 개수를 사용자가 직접 매기는 수동
    // 카운터입니다. ball(화면 속 게이지)과는 서로 다른 개념입니다.
    this.initialColor = options.color ?? null;
    this.currentColor = this.initialColor;
    this.usedBall = 0;
    this.totalBall = options.totalBall ?? null;

    // 실을 교체한 knitLength 지점을 경계로 색 구간을 기록합니다.
    // 예: [{from:0,color:A},{from:4,color:B}] → 1~4단은 A, 5단부터는 B.
    // 바닥·실뭉치는 구간을 나누지 않고 늘 currentColor 하나로 단순화합니다.
    this.colorSegments = [{ from: 0, color: this.initialColor }];

    // 단수 메모 — 특정 단/N단마다 말풍선으로 알려줄 목록. 언제든
    // 추가·수정·삭제할 수 있는 사용자 데이터라 모델에 포함해 저장합니다.
    this.notes = options.notes ?? [];
    // 메모가 여러 개 겹칠 때 순서대로 보여줄 큐 — 연출용 일시 상태라 저장하지 않습니다.
    this.bubbleQueue = [];
    this.bubbleTimer = null;

    this.flash = false;
    this.blink = false;
    this.onChange = options.onChange ?? (() => {});
    // (text, kind) 형태로 부릅니다. kind 는 기본 'chat'(평소 멘트)이고,
    // 메모 알림만 'note' 를 넘겨 main.js 가 말풍선 색을 다르게 그립니다.
    this.onStatus = options.onStatus ?? (() => {});
    // Companion 은 localStorage 를 모릅니다 — "모델이 바뀌었다"만
    // 알리고, 실제 저장은 주입받은 콜백(main.js)이 담당합니다.
    this.onPersist = options.onPersist ?? (() => {});

    this.state = 'idle';
    this.frame = 0;
    this.lastStep = 0;
    this.lastBlink = 0;
    this.running = false;
  }

  emit() {
    this.onChange(this.snapshot());
    this.onPersist(this.serialize());
  }

  snapshot() {
    return {
      rows: this.rows,
      target: this.target,
      ripped: this.ripped,
      pile: this.pile,
      ball: this.ball,
      usedBall: this.usedBall,
      totalBall: this.totalBall,
      currentColor: this.currentColor,
      notes: this.notes,
      percent: Math.min(100, Math.round((this.rows / this.target) * 100)),
      finished: this.rows >= this.target,
      wearing: this.state === 'wearing' || this.state === 'wrapping'
    };
  }

  /**
   * 저장 대상은 모델 값뿐입니다. state/frame/flash/blink 같은 연출용
   * 일시 상태는 뺍니다 — 애니메이션 중간 프레임에서 복원하면 어색합니다.
   */
  serialize() {
    return {
      schema: SCHEMA,
      target: this.target,
      rows: this.rows,
      ripped: this.ripped,
      knitLength: this.knitLength,
      pile: this.pile,
      ball: this.ball,
      initialBall: this.initialBall,
      usedBall: this.usedBall,
      totalBall: this.totalBall,
      initialColor: this.initialColor,
      currentColor: this.currentColor,
      colorSegments: this.colorSegments,
      notes: this.notes
    };
  }

  /**
   * 저장된 값을 되돌립니다. 손상되었거나 스키마가 다르면 아무것도
   * 바꾸지 않고 false 를 돌려줍니다 — 부분 복원은 하지 않습니다.
   * 어중간하게 복원된 상태가 더 찾기 어려운 버그를 만듭니다.
   */
  restore(data) {
    if (!data || typeof data !== 'object') return false;
    // v1 에는 notes 가 없었을 뿐 나머지 필드는 그대로 호환되므로,
    // 버리지 않고 빈 메모 목록으로 보정해 v2로 올립니다.
    if (data.schema === 1) data = { ...data, schema: SCHEMA, notes: [] };
    if (data.schema !== SCHEMA) return false;

    const isNonNegNumber = (v) => Number.isFinite(v) && v >= 0;
    if (!isNonNegNumber(data.target) || data.target < 1) return false;
    if (!isNonNegNumber(data.rows)) return false;
    if (!isNonNegNumber(data.ripped)) return false;
    if (!isNonNegNumber(data.knitLength) || data.knitLength > S.MAX_KNIT) return false;
    if (!isNonNegNumber(data.pile) || data.pile > S.MAX_PILE) return false;
    if (!isNonNegNumber(data.ball)) return false;
    if (!isNonNegNumber(data.initialBall)) return false;
    if (!isNonNegNumber(data.usedBall)) return false;
    if (data.totalBall !== null && !isNonNegNumber(data.totalBall)) return false;
    if (typeof data.currentColor !== 'string') return false;
    if (data.initialColor !== null && typeof data.initialColor !== 'string') return false;
    if (!Array.isArray(data.colorSegments) || data.colorSegments.length === 0) return false;
    for (const seg of data.colorSegments) {
      if (!seg || !Number.isFinite(seg.from) || typeof seg.color !== 'string') return false;
    }
    if (!Array.isArray(data.notes)) return false;
    for (const n of data.notes) {
      if (!normalizeNote(n, n?.id)) return false;
    }

    this.target = Math.floor(data.target);
    this.rows = Math.floor(data.rows);
    this.ripped = Math.floor(data.ripped);
    this.knitLength = Math.floor(data.knitLength);
    this.pile = Math.floor(data.pile);
    this.ball = Math.floor(data.ball);
    this.initialBall = Math.floor(data.initialBall);
    this.usedBall = Math.floor(data.usedBall);
    this.totalBall = data.totalBall === null ? null : Math.floor(data.totalBall);
    this.initialColor = data.initialColor;
    this.currentColor = data.currentColor;
    this.colorSegments = data.colorSegments.map((seg) => ({ from: seg.from, color: seg.color }));
    this.notes = data.notes.map((n) => normalizeNote(n, n.id));

    // complete 는 "방금 완성한 순간"에만 의미가 있는 반짝임 연출이라,
    // 페이지를 열 때마다 재생되면 성가십니다. showoff/idle 로 바로 갑니다.
    this.state = this.rows >= this.target ? 'showoff' : 'idle';
    this.frame = 0;
    return true;
  }

  visualLength() {
    return Math.min(S.MAX_KNIT, Math.round((this.rows / this.target) * S.MAX_KNIT));
  }

  /** colorSegments 를 length 까지로 잘라 [{from,to,color}] 로 돌려줍니다. */
  segmentsUpTo(length) {
    const segs = this.colorSegments;
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      const from = segs[i].from;
      if (from >= length) break;
      const to = i + 1 < segs.length ? Math.min(segs[i + 1].from, length) : length;
      out.push({ from, to, color: segs[i].color });
    }
    return out;
  }

  /* ── 조작 ─────────────────────────────────────────────── */

  addRow() {
    if (this.rows >= this.target) {
      this.onStatus('목표 단수에 도달했습니다');
      return;
    }
    this.rows += 1;
    const want = this.visualLength();
    let grew = false;
    while (this.knitLength < want && this.ball > 0) {
      this.knitLength += 1;
      this.ball -= 1;
      grew = true;
    }
    const hits = this.notes.filter(
      (n) => n.row === this.rows || (n.every && this.rows % n.every === 0)
    );
    if (hits.length) {
      this.queueBubble(hits.map((n) => n.message));
    } else if (this.bubbleQueue.length === 0 && !this.bubbleTimer) {
      // 말풍선이 재생 중일 때는 평범한 진행 문구로 덮어쓰지 않습니다.
      // 재생이 끝나면(advanceBubble 이 bubbleTimer 를 비우면) 다시 정상 표시됩니다.
      if (!grew && this.knitLength < want && this.ball <= 0) {
        this.onStatus('실뭉치가 비었습니다. 실을 감아주세요.');
      } else {
        this.onStatus(this.rows >= this.target ? '다 떴다!' : '뜨는 중');
      }
    }
    this.emit();
    this.enter(ENTRY.knit);
  }

  ripRow() {
    if (this.rows <= 0) {
      this.onStatus('풀 게 없습니다');
      return;
    }
    if (this.pile >= S.MAX_PILE) {
      this.onStatus('바닥이 꽉 찼습니다. 실을 감아주세요.');
      return;
    }
    this.onStatus('한 단 푸는 중');
    this.enter(ENTRY.rip);
  }

  wind() {
    if (this.pile <= 0) {
      this.onStatus('바닥에 실이 없습니다');
      return;
    }
    this.onStatus('실뭉치를 감는 중');
    this.enter(ENTRY.wind);
  }

  /**
   * 실 창고에서 새 색을 골라 배색을 바꿨을 때. 볼을 다 써서 새로
   * 열었는지 아니면 색만 바꾼 것인지는 알 수 없으므로(둘 다 같은
   * 동작으로 보임), usedBall 은 여기서 건드리지 않습니다 — 그건
   * 사용자가 setUsedBall 로 직접 매기는 수동 카운터입니다.
   */
  swapYarn(color) {
    this.currentColor = color;
    const last = this.colorSegments[this.colorSegments.length - 1];
    if (last.from === this.knitLength) {
      last.color = color; // 뜨기 전에 또 바꾸면 그 자리 색만 갱신.
    } else {
      this.colorSegments.push({ from: this.knitLength, color });
    }
    this.ball = this.initialBall; // 새 실뭉치라 다시 가득 채웁니다.
    this.onStatus('실 색을 바꿨어요');
    this.emit();
  }

  /** 실물로 다 쓴 볼 개수. 사용자가 직접 올리고 내리는 수동 카운터. */
  setUsedBall(value) {
    if (!Number.isFinite(value)) return;
    this.usedBall = Math.max(0, Math.floor(value));
    this.emit();
  }

  /** 갖고 있는 볼 개수. 선택 입력이라 비워두면 null 을 허용합니다. */
  setTotalBall(value) {
    if (value === null) {
      this.totalBall = null;
    } else {
      if (!Number.isFinite(value) || value < 0) return;
      this.totalBall = Math.floor(value);
    }
    this.emit();
  }

  setTarget(value) {
    if (!Number.isFinite(value) || value < 1) return;
    this.target = Math.floor(value);
    // rows 는 클램프하지 않습니다 — target 은 "어디까지 뜰 것인가"고
    // rows 는 "실제로 뜬 기록"이라, 목표를 바꿨다고 이미 뜬 단수가
    // 사라질 이유가 없습니다. rows > target 은 초과 달성으로 봅니다.
    const want = this.visualLength();
    // 목표 변경으로 줄어든 실은 바닥이 아니라 실뭉치로 돌아갑니다.
    // 푼 게 아니기 때문입니다.
    while (this.knitLength < want && this.ball > 0) { this.knitLength++; this.ball--; }
    while (this.knitLength > want) { this.knitLength--; this.ball++; }

    // 목표를 늘려 미완성으로 돌아가거나, 줄여서 바로 완성되는 경우
    // 둘 다 여기서 상태를 맞춰줍니다.
    const isFinished = FINISHED_STATES.has(this.state);
    if (this.rows >= this.target && !isFinished) {
      this.enter('complete');
    } else if (this.rows < this.target && isFinished) {
      this.enter('idle');
    } else {
      this.emit();
      this.render();
    }
  }

  tryOn() {
    if (this.state !== 'showoff') return;
    this.onStatus('입어보는 중');
    this.enter('wrapping');
  }

  takeOff() {
    if (this.state !== 'wearing') return;
    this.onStatus(pickLine(SHOWOFF_LINES));
    this.enter('showoff');
  }

  /** 목표 단수는 그대로 두고 진행 상황만 처음으로 되돌립니다. */
  reset() {
    this.rows = 0;
    this.ripped = 0;
    this.knitLength = 0;
    this.pile = 0;
    this.ball = this.initialBall;
    this.usedBall = 0;
    this.currentColor = this.initialColor;
    this.colorSegments = [{ from: 0, color: this.initialColor }];
    this.onStatus(pickLine(IDLE_GREETINGS));
    this.enter('idle');
  }

  /* ── 단수 메모 ────────────────────────────────────────── */

  /** 새 메모를 추가합니다. 무효하면(메시지 없음, row/every 둘 다이거나 둘 다 아님) null. */
  addNote(input) {
    const note = normalizeNote(input);
    if (!note) return null;
    this.notes.push(note);
    this.emit();
    return note.id;
  }

  /** 기존 메모를 교체합니다. id가 없거나 입력이 무효하면 false. */
  updateNote(id, input) {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    const note = normalizeNote(input, id);
    if (!note) return false;
    this.notes[idx] = note;
    this.emit();
    return true;
  }

  removeNote(id) {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length !== before) this.emit();
  }

  /**
   * 한 단에 메모가 여러 개 겹치면 말풍선을 동시에 띄우지 않고 순서대로
   * 하나씩 보여줍니다. onStatus 에 'note' 종류를 넘겨서, main.js 가
   * 말풍선 색으로 평소 멘트와 구분해 그릴 수 있게 합니다. bubbleQueue
   * 는 연출용 일시 상태라 serialize() 대상이 아닙니다 — blink 와 같은
   * 취급입니다.
   */
  queueBubble(messages) {
    this.bubbleQueue.push(...messages);
    if (!this.bubbleTimer) this.advanceBubble();
  }

  advanceBubble() {
    if (this.bubbleQueue.length === 0) {
      this.bubbleTimer = null;
      return;
    }
    this.onStatus(this.bubbleQueue.shift(), 'note');
    this.bubbleTimer = setTimeout(() => this.advanceBubble(), 2200);
  }

  /* ── 상태 기계 ────────────────────────────────────────── */

  enter(name) {
    this.state = name;
    this.frame = 0;
    this.lastStep = performance.now();
    const def = STATES[name];
    if (def?.onEnter) ACTIONS[def.onEnter](this);
    this.runFrameActions(def, 0);
    this.emit();
    this.render();
  }

  /** def.next 는 보통 문자열이지만, knit 처럼 모델을 봐야 갈림길이
      갈리는 상태는 함수로 둡니다. */
  resolveNext(def) {
    const next = typeof def.next === 'function' ? def.next(this) : def.next;
    return next ?? 'idle';
  }

  runFrameActions(def, frame) {
    if (!def?.onFrame) return;
    const key = def.everyN ? (frame % def.everyN) : frame;
    const action = def.onFrame[key];
    if (action) ACTIONS[action](this);
  }

  step(now) {
    const def = STATES[this.state];
    if (!def) return;

    if (now - this.lastStep >= def.frameMs) {
      this.lastStep = now;
      this.frame += 1;

      if (def.frames === null) {
        // everyN 이 있는 반복 상태는 한 주기(everyN 프레임)를 다 돌고
        // 나서만 계속할지 판단합니다. 매 프레임 판단하면 방금 마지막
        // 한 코를 감은 바로 다음 프레임에 뚝 끊겨 액션이 거의 안
        // 보입니다.
        const atBoundary = !def.everyN || this.frame % def.everyN === 0;
        if (atBoundary) {
          const keepGoing = CONDITIONS[def.repeatIf](this);
          if (!keepGoing) {
            this.onStatus('다 감았습니다');
            this.enter(this.resolveNext(def));
            return;
          }
        }
        this.runFrameActions(def, this.frame);
      } else if (this.frame >= def.frames) {
        this.enter(this.resolveNext(def));
        return;
      } else {
        this.runFrameActions(def, this.frame);
      }
      this.render();
    }

    // 깜빡임은 idle 에서만. 감기의 일자 눈과 겹치지 않습니다.
    if (this.state === 'idle' && now - this.lastBlink > 3600) {
      this.lastBlink = now;
      this.blink = true;
      this.render();
      setTimeout(() => { this.blink = false; this.render(); }, 140);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      this.step(now);
      requestAnimationFrame(loop);
    };
    if (this.state === 'idle') this.onStatus(pickLine(IDLE_GREETINGS));
    this.emit();
    this.render();
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  /* ── 렌더 ─────────────────────────────────────────────── */

  render() {
    const ctx = this.ctx;
    const def = STATES[this.state] ?? STATES.idle;
    const pose = POSES[def.pose](this, this.frame);

    ctx.clearRect(0, 0, SIZE, SIZE);
    const tailOffset = def.wagTail ? (this.frame % 8 < 4 ? 0 : 1) : 0;
    blit(ctx, S.tail(tailOffset), S.BODY);
    blit(ctx, S.body, S.BODY);

    pose.behind.forEach(([sprite, palette]) => blit(ctx, sprite, palette));

    blit(ctx, S.ears[def.ears], S.BODY);
    blit(ctx, S.head, S.BODY);

    const faceKey = (def.face === 'neutral' && this.blink) ? 'flat' : def.face;
    const layers = S.faces[faceKey];
    if (layers) layers.forEach((layer) => blit(ctx, layer, S.BODY));
    if (def.showBang) blit(ctx, S.bang, S.NEEDLE);

    pose.front.forEach(([sprite, palette]) => blit(ctx, sprite, palette));

    blit(ctx, S.pile(this.pile), S.paletteFor(this.currentColor));
  }
}
