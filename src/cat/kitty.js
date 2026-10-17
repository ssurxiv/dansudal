/*!
 * 함뜨마을 동물 친구들 — 묘카 캐릭터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 묘카의 자세와 애니메이션만 다룹니다. 도안(chart.js)은 모르고,
 * cat/main.js 가 "칠했다", "되돌렸다", "한 구간 떴다" 같은 일이 생길
 * 때마다 play()/weave() 로 동작을 틀어줍니다. 단수달·코토키의 engine.js
 * 처럼 상태 표 + requestAnimationFrame 한 바퀴 구조지만, 실 보존 같은
 * 모델이 없어서 훨씬 작습니다.
 *
 * 화면마다 하는 일이 다릅니다:
 *   그리기 — 젤리(발바닥)로 칸을 꾹 찍고, 지우개로 문지르고, 되돌리면 흥.
 *   뜨기   — 작은 베틀 뒤에 앉아 북을 구간만큼 보내고, 한 단을 마치면
 *            바디로 다집니다. 풀면 흥 하며 그만큼 풉니다.
 *   다 뜬 뒤 — 짠 양탄자를 떼어 들고 자랑하거나, 깔고 앉습니다.
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
 *   next     끝난 뒤 갈 상태. 'rest' 는 지금의 쉬는 자세
 *   blink    true 면 가끔 눈을 깜빡입니다
 *   wag      true 면 꼬리를 흔듭니다
 *   spark    (frame) => 반짝임 스프라이트 | null
 *   held     true 면 다 뜬 양탄자를 들어 보입니다
 *   loom     true 면 베틀 앞에 앉은 모습으로 그립니다
 *   full     true 면 베틀이 다 짜인 모습
 */
const STATES = {
  idle: { face: 'neutral', frames: null, frameMs: 200, blink: true },

  /* ── 그리기 ── */
  /* 칠하는 동안(누르고 있는 동안) — 물감 묻은 젤리를 들고 있습니다. */
  hold: { face: 'neutral', paw: () => 'up', frames: null, frameMs: 200 },
  /* 손을 떼면 꾹 — 든 발을 한 번 보여주고 내려놓습니다. */
  stamp: { face: 'neutral', paw: (f) => (f < 1 ? 'up' : null), frames: 3, frameMs: 110, next: 'rest' },
  /* 지우개질 — 분홍 젤리로 좌우로 문지릅니다. */
  wipe: { face: 'neutral', paw: (f) => (f % 2 ? 'wipeR' : 'wipeL'), pink: true, frames: null, frameMs: 130 },
  /* 흥 — 되돌리기. 고개를 돌리고 흘겨봅니다. 평소 눈이 이미 내리깐 눈이라
     고개까지 돌려야 평소 얼굴과 갈립니다. */
  huff: { face: 'huff', frames: 7, frameMs: 150, next: 'rest' },

  /* ── 뜨기 ── */
  /* 베틀 앞에서 쉬기 — 북은 다음에 짤 자리에 놓여 있습니다. */
  loom: { face: 'neutral', frames: null, frameMs: 200, blink: true, loom: true },
  /* 북 보내기·다지기·풀기 — 프레임마다 그릴 것을 weave() 가 미리 만들어
     timeline 에 넣고, 이 상태는 그걸 순서대로 틉니다. */
  weave: { face: 'neutral', frames: null, frameMs: 100, loom: true },
  /* 마지막 단 — 다 짜인 베틀에서 반짝임이 모였다 터지고, 떼어 들고
     자랑하기(또는 깔고 앉기)로 넘어갑니다. */
  complete: {
    face: 'proud',
    frames: 8,
    frameMs: 150,
    spark: (f) => (f === 3 ? K.sparkleBurst() : K.sparkles(f)),
    loom: true,
    full: true,
    next: 'rest'
  },

  /* ── 다 뜬 뒤 ── */
  /* 자랑하기 — 다 짠 양탄자를 펼쳐 들고 반짝임 속에서 살짝 들썩입니다. */
  showoff: { face: 'proud', frames: null, frameMs: 240, wag: true, held: true, spark: (f) => K.sparkles(f) },
  /* 깔고 앉기 — 지그시 눈을 감고 꼬리를 흔듭니다. */
  rug: { face: 'proud', frames: null, frameMs: 260, wag: true }
};

const RESTING = new Set(['idle', 'loom', 'rug', 'showoff']);
const HOLDING = new Set(['hold', 'wipe']);
const BLINK_EVERY = 3600;
const BLINK_MS = 140;
const STEP_MS = 100;   // 북이 한 칸 움직이는 박자
const BEAT_MS = 140;   // 바디로 다지는 박자

/** 물감이 너무 밝으면(흰색 계열) 앞발 색에 묻혀 젤리가 안 보여서 분홍으로 둡니다. */
function visiblePad(color) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '');
  if (!m) return K.BODY.f;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.86 ? K.BODY.f : color;
}

/** 평직의 결 — 씨실이 날실 위·아래로 엇갈리는 자리마다 아주 옅게 어둡게. */
function woven(color, x, y) {
  if ((x + y) % 2 === 0) return color;
  const n = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) * 0.94);
  return `#${n.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

const sameLoom = (a, b) => a && b && a.row === b.row && a.band === b.band && a.doneCols === b.doneCols && a.full === b.full;

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
    // 베틀: loomShown 은 지금 그려진 짜임 상태
    // { row, band(아래부터 픽셀 줄), doneCols(그 줄에서 짠 칸 수), rtl, color, full }
    this.loomShown = null;
    this.loomColorAt = () => '#ffffff';
    this.timeline = null;
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

  /** { sample(u0, u1, v0, v1), fringe } 또는 null(아직 다 안 뜸). */
  setRug(rug) {
    this.rug = rug;
    this.render();
  }

  /** 짜는 칸 픽셀(c: 왼쪽부터, r: 아래부터)의 색을 알려주는 함수. */
  setLoomColors(fn) {
    this.loomColorAt = fn;
  }

  /** 애니메이션 없이 베틀 상태를 맞춥니다(화면 전환, 도안 수정 등). */
  setLoom(state) {
    if (this.state === 'weave') return; // 짜는 중이면 끝난 뒤 맞춰집니다
    this.loomShown = state;
    this.render();
  }

  play(name) {
    const target = name === 'rest' ? this.resting : name;
    if (!STATES[target]) return;
    this.state = target;
    this.frame = 0;
    this.lastStep = performance.now();
    if (target !== 'weave') this.timeline = null;
    this.render();
  }

  /** 누르고 있던 동작을 마칩니다(칠하기는 꾹 찍고, 지우개는 바로 쉼). */
  release() {
    if (this.state === 'hold') this.play('stamp');
    else if (HOLDING.has(this.state)) this.play('rest');
  }

  /**
   * 베틀을 지금 모습(loomShown)에서 to 로 짜거나 풉니다.
   * kind: 'forward'(구간·단을 떴음) | 'back'(풀었음) | 'complete'(마지막 단까지)
   */
  weave(to, kind) {
    // 앞 동작이 아직 짜는 중이면(연달아 누름) 그 동작이 끝날 모습에서 이어
    // 갑니다 — 그려진 모습에서 시작하면 이미 지나간 줄을 다시 짭니다.
    const from = (this.state === 'weave' && this.timeline ? this.timeline.last : this.loomShown) ?? to;
    const frames = [];
    const face = kind === 'back' ? 'huff' : 'neutral';
    const slide = (base, a, b) => {
      const steps = Math.max(2, Math.min(5, Math.ceil(Math.abs(b - a) / 4)));
      for (let i = 1; i <= steps; i++) {
        frames.push({ ms: STEP_MS, face, loom: { ...base, doneCols: Math.round(a + (b - a) * (i / steps)) } });
      }
    };
    const beat = (base) => {
      frames.push({ ms: BEAT_MS, face, beat: true, loom: base });
      frames.push({ ms: BEAT_MS, face, beat: true, loom: base });
    };
    const hold = (loom, n, ms = 150) => { for (let i = 0; i < n; i++) frames.push({ ms, face, loom }); };

    if (kind === 'back') {
      if (from.band === to.band && from.row === to.row) {
        slide(to, from.doneCols, to.doneCols);
      } else {
        // 앞 단으로 돌아갔으면 그 줄을 다 짠 모습에서 풀어 내립니다.
        slide(to, K.LOOM_W, to.doneCols);
      }
      hold(to, 4);
    } else if (from.row === to.row && !to.full) {
      slide(to, from.doneCols, to.doneCols);
    } else {
      // 단을 넘겼으면: 지금 줄 끝까지 북을 보내고 바디로 다진 뒤 새 줄 첫머리로.
      if (!from.full) {
        const end = { ...from, doneCols: K.LOOM_W };
        slide(end, from.doneCols, K.LOOM_W);
        beat(end);
      }
      if (!to.full) hold(to, 1, 160);
    }

    this.timeline = { frames, i: 0, then: kind === 'complete' ? 'complete' : 'rest', last: to };
    this.state = 'weave';
    this.frame = 0;
    this.lastStep = performance.now();
    if (!frames.length) this.finishTimeline();
    this.render();
  }

  finishTimeline() {
    const tl = this.timeline;
    this.timeline = null;
    this.loomShown = tl.last;
    this.play(tl.then);
  }

  step(now) {
    const def = STATES[this.state];
    if (this.state === 'weave' && this.timeline) {
      const tl = this.timeline;
      if (now - this.lastStep >= tl.frames[tl.i].ms) {
        this.lastStep = now;
        tl.i += 1;
        if (tl.i >= tl.frames.length) {
          this.finishTimeline();
          return;
        }
        this.render();
      }
      return;
    }
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

  /* ── 그리기 ─────────────────────────────────────────────── */

  pixels(list) {
    const ctx = this.ctx;
    list.forEach(([x, y, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  }

  render() {
    const ctx = this.ctx;
    const def = STATES[this.state];
    const tf = this.state === 'weave' ? this.timeline?.frames[this.timeline.i] : null;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 다 뜬 양탄자는 바닥에 깔려 있다가(깔고 앉기·그리기 화면) 자랑할 땐 들립니다.
    const onFloor = this.rug && !def.held && !def.loom;
    if (onFloor) this.pixels(K.rugPixels(this.rug.sample, 1, this.rug.fringe).map(([x, y, c]) => [x, y, woven(c, x, y)]));

    const wag = def.wag && this.frame % 8 >= 4 ? 1 : 0;
    blit(ctx, K.tail(wag), K.BODY);
    blit(ctx, K.body, K.BODY);
    blit(ctx, K.ears, K.BODY);
    const faceKey = tf?.face ?? def.face;
    const face = faceKey === 'neutral' && this.blinking ? 'blink' : faceKey;
    blit(ctx, K.heads[face], K.BODY);

    if (def.loom) {
      this.renderLoom(tf?.loom ?? this.loomShown, { full: def.full, beat: tf?.beat });
    } else if (def.held && this.rug) {
      // 두 박자마다 한 칸 들썩 — 들고 흔들며 자랑하는 느낌.
      const bob = this.frame % 4 < 2 ? 0 : 1;
      const { top, bottom } = K.HELD_RUG;
      this.pixels(K.heldRugPixels(this.rug.sample, this.rug.fringe, bob).map(([x, y, c]) => (
        y > top + bob && y < bottom + bob && c !== K.RUG.edge ? [x, y, woven(c, x, y)] : [x, y, c]
      )));
      blit(ctx, K.holdingPaws(bob), K.BODY);
    } else {
      const paw = def.paw?.(this.frame) ?? null;
      blit(ctx, K.restPaws({ left: !paw }), K.BODY);
      if (paw) {
        const pad = def.pink ? K.BODY.f : visiblePad(this.paint);
        blit(ctx, K.raisedPaw(paw), { ...K.BODY, f: pad });
      }
    }

    const spark = def.spark?.(this.frame);
    if (spark) blit(ctx, spark, K.SPARK);
  }

  /** 베틀 — 틀과 날실 위에 짜인 만큼 도안 색을 칠하고, 북과 앞발을 얹습니다. */
  renderLoom(loom, { full = false, beat = false } = {}) {
    const ctx = this.ctx;
    blit(ctx, K.loomFrame, K.LOOM_COLORS);
    if (!loom && !full) {
      blit(ctx, K.loomPaws, K.BODY);
      return;
    }
    const all = full || loom.full;
    const px = [];
    for (let r = 0; r < K.LOOM_H; r++) {
      const y = K.LOOM.bottom - r;
      for (let c = 0; c < K.LOOM_W; c++) {
        let done = all || r < loom.band;
        if (!done && r === loom.band) done = loom.rtl ? c >= K.LOOM_W - loom.doneCols : c < loom.doneCols;
        if (done) px.push([K.LOOM.left + c, y, woven(this.loomColorAt(c, r), K.LOOM.left + c, y)]);
      }
    }
    this.pixels(px);
    if (!all) {
      const y = K.LOOM.bottom - loom.band;
      if (beat) blit(ctx, K.beater(y), K.LOOM_COLORS);
      // 북은 다음에 짤 자리 바로 앞에. 줄 끝에 닿으면 틀 안쪽에 멈춥니다.
      const edgeCol = loom.rtl ? K.LOOM_W - 1 - loom.doneCols : loom.doneCols;
      const cx = K.LOOM.left + Math.max(2, Math.min(K.LOOM_W - 3, edgeCol));
      blit(ctx, K.shuttle(cx, y), { ...K.LOOM_COLORS, c: loom.color });
    }
    blit(ctx, K.loomPaws, K.BODY);
  }
}
