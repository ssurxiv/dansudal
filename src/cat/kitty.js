/*!
 * 함뜨마을 동물 친구들 — 카냥이 캐릭터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 카냥이의 자세와 애니메이션만 다룹니다. 도안(chart.js)은 모르고,
 * cat/main.js 가 "칠했다", "되돌렸다", "한 구간 떴다" 같은 일이 생길
 * 때마다 play() 로 동작을 틀어줍니다. 단수달·코토키의 engine.js 처럼
 * 상태 표 + requestAnimationFrame 한 바퀴 구조지만, 실 보존 같은 모델이
 * 없어서 훨씬 작습니다.
 */

import { blit } from '../pixel.js';
import * as K from './sprites.js';

/**
 * 상태 하나:
 *   face     heads 의 키 ('neutral' | 'huff' | 'proud')
 *   paw      (frame) => 들어 올린 발 자세 | null. 없으면 두 발 다 바닥에
 *   pink     true 면 젤리를 늘 분홍으로(물감 안 묻힘)
 *   frames   이 상태의 프레임 수. null 이면 다른 동작이 올 때까지 반복
 *   frameMs  프레임 간격
 *   next     끝난 뒤 갈 상태. 'rest' 는 지금의 쉬는 자세(idle 또는 rug)
 *   blink    true 면 가끔 눈을 깜빡입니다
 *   wag      true 면 꼬리를 흔듭니다
 *   spark    (frame) => 반짝임 스프라이트 | null
 */
const STATES = {
  idle: { face: 'neutral', frames: null, frameMs: 200, blink: true },

  /* 칠하는 동안(누르고 있는 동안) — 물감 묻은 젤리를 들고 있습니다. */
  hold: { face: 'neutral', paw: () => 'up', frames: null, frameMs: 200 },

  /* 손을 떼면 꾹 — 든 발을 한 번 보여주고 내려놓습니다. */
  stamp: { face: 'neutral', paw: (f) => (f < 1 ? 'up' : null), frames: 3, frameMs: 110, next: 'rest' },

  /* 지우개질 — 분홍 젤리로 좌우로 문지릅니다. */
  wipe: { face: 'neutral', paw: (f) => (f % 2 ? 'wipeR' : 'wipeL'), pink: true, frames: null, frameMs: 130 },

  /* 흥 — 되돌리기·풀기. 고개를 돌리고 흘겨봅니다. 평소 눈이 이미
     내리깐 눈이라, 고개까지 돌려야 평소 얼굴과 갈립니다. */
  huff: { face: 'huff', frames: 7, frameMs: 150, next: 'rest' },

  /* 진행 체크 — 젤리로 칸을 톡. */
  tap: { face: 'neutral', paw: (f) => (f < 1 ? 'up' : null), pink: true, frames: 3, frameMs: 120, next: 'rest' },

  /* 마지막 단 — 반짝임이 모였다가 한 번에 터지고 양탄자로 넘어갑니다. */
  complete: {
    face: 'proud',
    frames: 8,
    frameMs: 150,
    spark: (f) => (f === 3 ? K.sparkleBurst() : K.sparkles(f)),
    next: 'rug'
  },

  /* 다 뜬 양탄자 위 — 지그시 눈을 감고 꼬리를 흔듭니다. */
  rug: { face: 'proud', frames: null, frameMs: 260, wag: true }
};

const RESTING = new Set(['idle', 'rug']);
const HOLDING = new Set(['hold', 'wipe']);
const BLINK_EVERY = 3600;
const BLINK_MS = 140;

/** 물감이 너무 밝으면(흰색 계열) 앞발 색에 묻혀 젤리가 안 보여서 분홍으로 둡니다. */
function visiblePad(color) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '');
  if (!m) return K.BODY.f;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.86 ? K.BODY.f : color;
}

export class Kitty {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.state = 'idle';
    this.resting = 'idle';
    this.frame = 0;
    this.lastStep = 0;
    this.lastBlink = 0;
    this.blinking = false;
    this.paint = null;
    this.rug = null;
    this.running = false;
  }

  /** 쉬는 자세를 바꿉니다. 지금 쉬고 있으면 바로 그 자세로 옮깁니다. */
  setResting(name) {
    this.resting = name;
    if (RESTING.has(this.state) && this.state !== name) this.play(name);
  }

  setPaint(color) {
    this.paint = color;
    if (this.state === 'hold') this.render();
  }

  /** { sample(u, v), fraction, fringe } 또는 null. */
  setRug(rug) {
    this.rug = rug;
    this.render();
  }

  play(name) {
    const target = name === 'rest' ? this.resting : name;
    if (!STATES[target]) return;
    this.state = target;
    this.frame = 0;
    this.lastStep = performance.now();
    this.render();
  }

  /** 누르고 있던 동작을 마칩니다(칠하기는 꾹 찍고, 지우개는 바로 쉼). */
  release() {
    if (this.state === 'hold') this.play('stamp');
    else if (HOLDING.has(this.state)) this.play('rest');
  }

  step(now) {
    const def = STATES[this.state];
    if (now - this.lastStep >= def.frameMs) {
      this.lastStep = now;
      this.frame += 1;
      if (def.frames !== null && this.frame >= def.frames) {
        this.play(def.next ?? 'rest');
        return;
      }
      this.render();
    }
    if (def.blink && now - this.lastBlink > BLINK_EVERY) {
      this.lastBlink = now;
      this.blinking = true;
      this.render();
      setTimeout(() => { this.blinking = false; this.render(); }, BLINK_MS);
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
    this.render();
    requestAnimationFrame(loop);
  }

  render() {
    const ctx = this.ctx;
    const def = STATES[this.state];
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 양탄자가 맨 뒤 — 고양이가 그 위에 앉습니다.
    if (this.rug) {
      K.rugPixels(this.rug.sample, this.rug.fraction, this.rug.fringe).forEach(([x, y, color]) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    }

    const wag = def.wag && this.frame % 8 >= 4 ? 1 : 0;
    blit(ctx, K.tail(wag), K.BODY);
    blit(ctx, K.body, K.BODY);
    blit(ctx, K.ears, K.BODY);
    const face = def.face === 'neutral' && this.blinking ? 'blink' : def.face;
    blit(ctx, K.heads[face], K.BODY);

    const paw = def.paw?.(this.frame) ?? null;
    blit(ctx, K.restPaws({ left: !paw }), K.BODY);
    if (paw) {
      const pad = def.pink ? K.BODY.f : visiblePad(this.paint);
      blit(ctx, K.raisedPaw(paw), { ...K.BODY, f: pad });
    }

    const spark = def.spark?.(this.frame);
    if (spark) blit(ctx, spark, K.SPARK);
  }
}
