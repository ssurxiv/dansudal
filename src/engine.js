/*!
 * 단수달 (Knitting Companion) — 엔진
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 */

import { SIZE, blit } from './pixel.js';
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
 * 자세 하나는 캐릭터 앞쪽에 그릴 레이어를 정합니다.
 * 뒤쪽(꼬리·몸통·머리)은 모든 자세가 공유합니다.
 */
const POSES = {
  holdWork(c) {
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), S.YARN],
        [S.floorBall(c.ball), S.YARN]
      ],
      front: [
        [S.needles(1, 0), S.NEEDLE],
        [S.knit(c.knitLength, false), S.YARN],
        [S.paws(7, 21, 21, 21), S.BODY]
      ]
    };
  },

  knitting(c, frame) {
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), S.YARN],
        [S.floorBall(c.ball), S.YARN]
      ],
      front: [
        [S.needles(frame, 0), S.NEEDLE],
        [S.knit(c.knitLength, c.flash), S.YARN],
        [S.paws(7, 21, 21, 21), S.BODY]
      ]
    };
  },

  pullingNeedle(c, frame) {
    const step = Math.min(frame, 1);
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), S.YARN],
        [S.floorBall(c.ball), S.YARN]
      ],
      front: [
        [S.needles(1, step), S.NEEDLE],
        [S.knit(c.knitLength, false), S.YARN],
        [S.paws(7, 21, 21 + step * 2, 21 - step * 2), S.BODY]
      ]
    };
  },

  yanking(c, frame) {
    const [rx, ry] = S.yanks[frame % S.yanks.length];
    return {
      behind: [
        [S.feedStrand(c.knitLength, c.ball), S.YARN],
        [S.floorBall(c.ball), S.YARN]
      ],
      front: [
        [S.needles(1, 2), S.NEEDLE],
        [S.knit(c.knitLength, false), S.YARN],
        [S.pulledYarn(rx, ry), S.YARN],
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
          [S.feedStrand(c.knitLength, c.ball), S.YARN],
          [S.floorBall(c.ball), S.YARN]
        ],
        front: [
          [S.needles(1, 0), S.NEEDLE],
          [S.knit(c.knitLength, true), S.YARN],
          [S.paws(7, 21, 21, 21), S.BODY]
        ]
      };
    }
    return {
      behind: [[S.floorBall(c.ball), S.YARN]],
      front: [
        [S.finishedPiece(20), S.YARN],
        [S.bow(20), S.NEEDLE],
        [S.paws(7, 21, 21, 21), S.BODY],
        [frame === 3 ? S.sparkleBurst() : S.sparkles(frame), S.SPARK]
      ]
    };
  },

  /* 자랑하기 — 양팔을 넓게 벌려 들어 보이며 살짝 흔듭니다. */
  showoff(c, frame) {
    const top = 19 - ((frame % 8 < 4) ? 0 : 1);
    return {
      behind: [[S.floorBall(c.ball), S.YARN]],
      front: [
        [S.finishedPiece(top), S.YARN],
        [S.bow(top), S.NEEDLE],
        [S.sparkles(frame), S.SPARK],
        ...spreadHold(top)
      ]
    };
  },

  /* 입어보기 예비 동작 — 반짝임이 몰아치는 짧은 전환. */
  wrapping(c, frame) {
    return {
      behind: [[S.floorBall(c.ball), S.YARN]],
      front: [
        [S.finishedPiece(19), S.YARN],
        [S.bow(19), S.NEEDLE],
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
        [S.asideKnit, S.YARN],
        [S.asideNeedle(), S.NEEDLE],
        [S.floorBall(c.ball), S.YARN]
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
      behind: [[S.floorBall(c.ball), S.YARN]],
      front: [
        [S.wornScarf(), S.YARN],
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
        [S.asideKnit, S.YARN],
        [S.asideNeedle(), S.NEEDLE],
        [S.windStrand(c.ball), S.YARN],
        [held.sprite, S.YARN]
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

export class Companion {
  constructor(canvas, options = {}) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // 모델. 실 총량은 knitLength + pile + ball 로 항상 보존됩니다.
    this.target = options.target ?? 20;
    this.rows = 0;
    this.ripped = 0;
    this.knitLength = 0;
    this.pile = 0;
    this.initialBall = options.yarn ?? 12;
    this.ball = this.initialBall;

    this.flash = false;
    this.blink = false;
    this.onChange = options.onChange ?? (() => {});
    this.onStatus = options.onStatus ?? (() => {});

    this.state = 'idle';
    this.frame = 0;
    this.lastStep = 0;
    this.lastBlink = 0;
    this.running = false;
  }

  emit() { this.onChange(this.snapshot()); }

  snapshot() {
    return {
      rows: this.rows,
      target: this.target,
      ripped: this.ripped,
      pile: this.pile,
      ball: this.ball,
      percent: Math.min(100, Math.round((this.rows / this.target) * 100)),
      finished: this.rows >= this.target,
      wearing: this.state === 'wearing' || this.state === 'wrapping'
    };
  }

  visualLength() {
    return Math.min(S.MAX_KNIT, Math.round((this.rows / this.target) * S.MAX_KNIT));
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
    if (!grew && this.knitLength < want && this.ball <= 0) {
      this.onStatus('실뭉치가 비었습니다. 감기부터 하세요');
    } else {
      this.onStatus(this.rows >= this.target ? '목표 달성' : '뜨는 중');
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
      this.onStatus('바닥이 꽉 찼습니다. 감기부터 하세요');
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

  setTarget(value) {
    if (!Number.isFinite(value) || value < 1) return;
    this.target = Math.floor(value);
    if (this.rows > this.target) this.rows = this.target;
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
    this.onStatus('다시 자랑하는 중');
    this.enter('showoff');
  }

  /** 목표 단수는 그대로 두고 진행 상황만 처음으로 되돌립니다. */
  reset() {
    this.rows = 0;
    this.ripped = 0;
    this.knitLength = 0;
    this.pile = 0;
    this.ball = this.initialBall;
    this.onStatus('초기화했습니다');
    this.enter('idle');
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
        const keepGoing = CONDITIONS[def.repeatIf](this);
        if (!keepGoing) {
          this.onStatus('다 감았습니다');
          this.enter(this.resolveNext(def));
          return;
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
    blit(ctx, S.tail, S.BODY);
    blit(ctx, S.body, S.BODY);

    pose.behind.forEach(([sprite, palette]) => blit(ctx, sprite, palette));

    blit(ctx, S.ears[def.ears], S.BODY);
    blit(ctx, S.head, S.BODY);

    const faceKey = (def.face === 'neutral' && this.blink) ? 'flat' : def.face;
    const layers = S.faces[faceKey];
    if (layers) layers.forEach((layer) => blit(ctx, layer, S.BODY));
    if (def.showBang) blit(ctx, S.bang, S.BODY);

    pose.front.forEach(([sprite, palette]) => blit(ctx, sprite, palette));

    blit(ctx, S.pile(this.pile), S.YARN);
  }
}
