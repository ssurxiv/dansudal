/*!
 * 코토키 (Crochet Companion) — 스프라이트 데이터
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 단수달(sprites.js)의 스프라이트 팩입니다. engine.js 의 Companion 은
 * 캐릭터를 하드코딩하지 않고 `options.sprites` 로 받은 팩(이 모듈
 * 전체)을 통해서만 그립니다 — 이 파일이 그 팩입니다.
 *
 * 몸통·얼굴·팔·발은 단수달과 완전히 같은 실루엣이라(사용자 요청)
 * sprites.js 것을 그대로 재사용합니다. 다만 토끼 귀가 설 공간이
 * 필요해서(사용자 피드백 — 처음엔 이마를 압축했다가 "못생겼다",
 * "위에 공간을 더 늘리면 안 되냐"는 지적을 받고) 캔버스를 32×32
 * 정사각형 그대로 두지 않고 세로로 8px 더 키웠습니다(32×40).
 * pixel.js 는 이제 캔버스 크기를 고정 상수로 가정하지 않으므로
 * (pad/blit/sliceRows 가 실제 배열 길이를 따라갑니다) 이게 가능
 * 합니다. 재사용하는 모든 스프라이트는 SHIFT(=8)만큼 아래로
 * shiftRows() 해서 원래 실루엣은 그대로 두고 위쪽에 귀가 설 진짜
 * 빈 공간을 만듭니다. 좌표값(팔·발을 그릴 때 넘기는 인자 등)은
 * 그대로 단수달 좌표계를 쓰고, 그 결과 스프라이트만 미는 방식이라 —
 * 단수달 쪽 shared 그리기 함수는 항상 자기 좌표계 안에서만 계산하고,
 * "어디에 찍힐지"만 이 팩이 나중에 옮깁니다.
 */

import { pad, buffer, put, line, shiftRows } from '../pixel.js';
import {
  body as otterBody,
  head as otterHead,
  faces as otterFaces,
  bang as otterBang,
  arm as otterArm,
  paws as otterPaws,
  SHOULDER_L,
  SHOULDER_R,
  LEFT_PIVOT,
  RIGHT_PIVOT,
  KNIT_TOP as OTTER_KNIT_TOP,
  MAX_KNIT,
  knit as otterKnit,
  asideKnit as otterAsideKnit,
  ballTier,
  floorBall as otterFloorBall,
  floorBallAnchor,
  heldBall as otterHeldBall,
  feedStrand as otterFeedStrand,
  windStrand as otterWindStrand,
  pulledYarn as otterPulledYarn,
  MAX_PILE,
  pile as otterPile,
  yanks,
  finishedPiece as otterFinishedPiece,
  FINISHED_PIECE_SPAN,
  wornScarf as otterWornScarf,
  SPARK,
  sparkles as otterSparkles,
  sparkleBurst as otterSparkleBurst,
  hearts as otterHearts,
  paletteFor
} from '../otter/sprites.js';

// 캔버스를 32×32 대신 32×(32+SHIFT) 로 씁니다. 재사용하는 모든
// 스프라이트는 이 값만큼 shiftRows() 로 아래로 밀립니다.
// engine.js 의 pieceLayers()/scarfLayers() 가 S.SHIFT 를 참조해
// "단수달 좌표로 그려진 뒤 통째로 밀린 스프라이트"에서 같은 구간을
// 다시 잘라낼 때 같이 보정합니다.
export const SHIFT = 8;
const HEIGHT = 32 + SHIFT;

const shift = (sprite) => shiftRows(sprite, SHIFT, HEIGHT);

export const body = shift(otterBody);

// 단수달의 주둥이(연한 l 영역)는 뺨에서 뺨까지 넓게 퍼진 가로 띠라
// 수달답지만 토끼에는 헐렁해 보입니다 — 같은 자리(코·입 픽셀은 그대로)
// 를 좁은 위 + 넓은 아래, 즉 아래쪽이 더 두툼한 반원으로 다시 그립니다.
// 각 줄은 머리 대칭축(x15.5)을 기준으로 짝수 칸이어야 합니다 — 홀수
// 칸이면 한쪽으로 반 칸 치우쳐 대칭이 깨집니다.
// 아래 세 줄(16~18)은 x11~20, 위 두 줄은 x12~19 / x13~18 로 좁힙니다.
// 머리 외곽선과 볼터치(fff)는 단수달 것을 그대로 둡니다.
const MUZZLE_ROWS = {
  14: '....offfbbbbbllmmllbbbbbfffo....',
  15: '....offfbbbbllllllllbbbbfffo....',
  16: '.....offbbblllmmmmlllbbbffo.....',
  17: '......obbbbllllllllllbbbbo......'
};

export const head = shift(otterHead.map((row, y) => MUZZLE_ROWS[y] ?? row));
export const bang = shift(otterBang);
export const faces = Object.fromEntries(
  Object.entries(otterFaces).map(([key, layers]) => [
    key,
    layers === null ? null : layers.map(shift)
  ])
);

export function arm(x0, y0, x1, y1) { return shift(otterArm(x0, y0, x1, y1)); }
export function paws(lx, ly, rx, ry) { return shift(otterPaws(lx, ly, rx, ry)); }
export function knit(length, flash) { return shift(otterKnit(length, flash)); }
export const asideKnit = shift(otterAsideKnit);
export function floorBall(amount) { return shift(otterFloorBall(amount)); }
export function feedStrand(knitLength, ballAmount) { return shift(otterFeedStrand(knitLength, ballAmount)); }
export function windStrand(ballAmount) { return shift(otterWindStrand(ballAmount)); }
export function pulledYarn(rx, ry) { return shift(otterPulledYarn(rx, ry)); }
export function pile(amount) { return shift(otterPile(amount)); }
export function finishedPiece(top) { return shift(otterFinishedPiece(top)); }
export function wornScarf() { return shift(otterWornScarf()); }
export function sparkles(frame) { return shift(otterSparkles(frame)); }
export function sparkleBurst() { return shift(otterSparkleBurst()); }
export function hearts(frame) { return shift(otterHearts(frame)); }

/**
 * heldBall() 은 스프라이트 하나와 좌표 여러 개(leftPaw/bottom/arc)를
 * 함께 돌려줍니다. 좌표들은 engine.js 가 c.S.paws(lx,ly,rx,ry) 처럼
 * "그리기 함수의 인자"로만 쓰므로 단수달 좌표계 그대로 둬야 하고
 * (paws() 가 결과를 알아서 밀어줍니다), 스프라이트만 이 팩의 화면
 * 좌표로 밀어야 합니다.
 */
export function heldBall(amount) {
  const h = otterHeldBall(amount);
  return { ...h, sprite: shift(h.sprite) };
}

// 좌표만 있는(직접 그리지 않는) 값들은 단수달 좌표계 그대로
// 재수출합니다 — engine.js 가 이 값들을 그리기 함수의 인자로 넘기면
// 그 함수가 결과 스프라이트를 알아서 밀어줍니다.
export {
  SHOULDER_L, SHOULDER_R, LEFT_PIVOT, RIGHT_PIVOT, yanks,
  floorBallAnchor, MAX_KNIT, MAX_PILE, FINISHED_PIECE_SPAN, ballTier,
  paletteFor, SPARK
};

// 평소 손 자리만은 단수달 것을 못 씁니다. 단수달은 긴 뜨개바늘을 양손에
// 나눠 쥐어 손이 편물(x12~19) 바깥에 멀찍이 놓이지만, 코바늘은 한 손으로
// 편물을 잡고 다른 손으로 코를 뜨는 도구라 두 손 다 편물에 붙어야
// 합니다 — 안 그러면 편물만 두 손 사이에 붕 떠 보입니다.
export const PAWS_REST = { lx: 9, ly: 21, rx: 20, ry: 21 };

// knitLayers() 가 S.knit() 의 결과(이미 밀린 스프라이트)에서 자를
// 위치를 잡을 때 씁니다 — 그래서 여기서는 미리 밀어둔 값을 내줍니다.
export const KNIT_TOP = OTTER_KNIT_TOP + SHIFT;
// 캐스트온 테두리가 캔버스 아래쪽으로 넘어가지 않게 막는 하한선.
// 단수달은 30(32px 캔버스 기준)이 하드코딩돼 있지만, 이 팩은 더
// 큰 캔버스를 쓰므로 그만큼 늘려서 알려줍니다.
export const MAX_ROW = 30 + SHIFT;

/* ── 팔레트 ───────────────────────────────────────────────── */
/* 단수달 BODY 팔레트와 같은 키(o/b/a/l/e/w/f/m/p)를 그대로 쓰므로
   재사용한 body/head/faces/paws/arm 을 색만 바꿔 다시 칠할 수 있습니다. */

// 처음엔 채도를 높게 잡았다가("눈이 아프다") 전체적으로 톤을
// 낮췄습니다 — 단수달의 갈색+진한 초록 조합처럼, 튀는 원색 대신
// 차분하게 가라앉은 색끼리만 씁니다.
export const BODY = {
  o: '#6b4550', // 외곽선
  b: '#e3aebc', // 몸통·귀 털
  a: '#c98d9b', // 어깨 그늘·발 테두리
  l: '#fdf1f2', // 배·주둥이·발바닥·안쪽 귀
  e: '#4a3238', // 눈
  w: '#ffffff', // 눈 하이라이트
  // 처음 고른 색(#e8a0b0)이 몸통 털(#e3aebc)과 명도·색상이 너무
  // 가까워서 볼터치가 거의 안 보였습니다("볼터치가 잘 안보여") —
  // 털보다 뚜렷이 더 진하고 붉은 톤으로 바꿔 확실히 구분되게 합니다.
  f: '#d9637e', // 볼터치·귀 안쪽 포인트
  m: '#a85a6a', // 코·입
  p: '#fdf1f2'  // 앞발
};

// engine.js 가 S.NEEDLE 로 직접 참조하므로 이름은 그대로 두고
// 내용만 코바늘에 맞춥니다. h 는 하트(착용 중)·느낌표(풀기)에 씁니다.
// 나무 손잡이 톤(#e0bb87)은 차분하긴 한데 분홍 털·초록 실 사이에서
// 묻혀 "코바늘이 눈에 잘 안 띈다"는 지적을 받았습니다. 빨강은 볼터치
// (f, #d9637e)와 같은 계열이라 또 묻히므로, 몸통·실 어느 쪽과도 겹치지
// 않는 보라로 갑니다.
export const NEEDLE = {
  n: '#9b7bd4', // 코바늘 몸체
  g: '#3d2a5e', // 코바늘 테두리·갈고리 끝
  h: '#c25f74'  // 하트·느낌표 포인트
};

/* ── 도형 헬퍼 ────────────────────────────────────────────── */

function ellipse(buf, cx, cy, rx, ry, ch) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) put(buf, x, y, ch);
    }
  }
}

function mergeInto(target, source) {
  Object.entries(source).forEach(([y, row]) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') put(target, x, Number(y), row[x]);
    }
  });
}

/* ── 귀 ───────────────────────────────────────────────────── */
/* 머리(이 팩의 head, 이미 SHIFT 만큼 밀려 y=10 부터 시작)의 중앙
   가까이(대칭축 x≈15.5 기준 좌우로 2px씩)에서 시작해, 바깥쪽으로
   15도 기울어 뻗습니다(= 수직 기준 75도). 귀를 head 보다 먼저
   그리므로(behind, engine.js 공통 순서) 밑동은 머리에 자연히
   가려지고, 나머지는 이제 진짜로 비어 있는 y0~9 공간에 놓입니다 —
   처음엔 이마를 압축해서 공간을 냈지만("못생겼다"는 피드백) 캔버스
   자체를 키운 지금은 원본 머리를 그대로 밀기만 하면 됩니다. */

// 타원 판정이 픽셀 중심(x+0.5)을 쓰므로, 좌우가 정확히 맞보이려면 두
// 밑동의 합이 캔버스 폭(32)이어야 합니다 — 13.5/17.5(합 31)로 뒀을 때
// 귀 한 쌍이 통째로 반 칸 왼쪽에 놓여 머리와 어긋나 있었습니다.
const EAR_BASE_L_X = 13.5;
const EAR_BASE_R_X = 18.5;
const EAR_BASE_Y = 11; // 밀린 머리 꼭대기(y10) 바로 아래, 아직 넓은 자리
const EAR_LENGTH = 10;
const EAR_TILT_DEG = 15; // 수직 기준 기울기(=수평 기준 75도)

function rotatedEllipse(buf, cx, cy, rx, ry, angleDeg, ch) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const extentX = Math.abs(rx * cos) + Math.abs(ry * sin);
  const extentY = Math.abs(rx * sin) + Math.abs(ry * cos);
  const x0 = Math.floor(cx - extentX), x1 = Math.ceil(cx + extentX);
  const y0 = Math.floor(cy - extentY), y1 = Math.ceil(cy + extentY);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      if ((localX / rx) ** 2 + (localY / ry) ** 2 <= 1) put(buf, x, y, ch);
    }
  }
}

/* 귀 하나는 세그먼트(기울어진 타원) 목록입니다. 선 귀는 한 마디,
   접힌 귀는 밑동 + 꺾인 자락 두 마디입니다.

   마디는 앞 마디의 끝점이 아니라 JOINT(길이의 70%) 지점에서 시작
   합니다 — 끝점에 딱 붙여 이으면 두 타원이 한두 픽셀만 겹쳐서 접힌
   자리가 뚝 끊어져 보입니다. */
const JOINT = 0.7;

function earSegments(baseX, specs) {
  let x = baseX;
  let y = EAR_BASE_Y;
  return specs.map(({ length, halfWidth, angle, inner = true }) => {
    const rad = (angle * Math.PI) / 180;
    const seg = {
      cx: x + Math.sin(rad) * (length / 2),
      cy: y - Math.cos(rad) * (length / 2),
      rx: halfWidth,
      ry: length / 2,
      angle,
      inner
    };
    x += Math.sin(rad) * length * JOINT;
    y -= Math.cos(rad) * length * JOINT;
    return seg;
  });
}

/** 테두리를 먼저 전부 긋고 속을 나중에 채웁니다 — 마디마다
    테두리·속을 번갈아 그리면 뒷마디의 테두리가 앞마디의 속을
    가로질러 접힌 자리에 검은 이음매가 남습니다. 접혀서 바깥면이
    보이는 자락은 inner=false 로 안쪽 분홍을 뺍니다(원래 안 보이는
    면이고, 짧은 마디에서는 그 타원이 1px 조각으로 부서집니다). */
function drawEar(buf, segs) {
  segs.forEach((s) => rotatedEllipse(buf, s.cx, s.cy, s.rx, s.ry, s.angle, 'o'));
  // 속은 테두리보다 사방으로 꼭 1px 작게 그립니다. 비율(예: 0.62)로
  // 줄이면 기울어진 마디의 뾰족한 끝에서 속이 테두리보다 바깥까지
  // 나가 윤곽에 구멍이 뚫립니다.
  segs.forEach((s) => rotatedEllipse(buf, s.cx, s.cy, s.rx - 1, s.ry - 1, s.angle, 'b'));
  segs.forEach((s) => {
    if (s.inner) rotatedEllipse(buf, s.cx, s.cy, (s.rx - 1) * 0.5, (s.ry - 1) * 0.72, s.angle, 'f');
  });
}

const earShape = (specs) => (baseX, dir) => {
  const buf = buffer();
  drawEar(buf, earSegments(baseX, specs.map((s) => ({ ...s, angle: dir * s.angle }))));
  return buf;
};

const earUpright = earShape([
  { length: EAR_LENGTH, halfWidth: 2.6, angle: EAR_TILT_DEG }
]);

/* 접힌(늘어진) 귀 — 밑동은 서 있고 그 위 자락이 바깥으로 꺾입니다.
   예전엔 자락을 80도(거의 수평)로 9px 이나 뻗어서 선 귀보다 오히려
   길어지고 끝이 뭉개졌습니다 — 꺾임을 70도로 세우고 전체 길이를
   선 귀(10px)와 비슷하게 맞췄습니다. */
const earDroop = earShape([
  { length: 6, halfWidth: 2.6, angle: EAR_TILT_DEG },
  { length: 6, halfWidth: 2.6, angle: 60, inner: false }
]);

/** 반만 접힌 귀 — 밑동은 길게 서 있고 끝자락만 살짝 꺾입니다. */
const earHalfFold = earShape([
  { length: 7, halfWidth: 2.6, angle: EAR_TILT_DEG },
  { length: 4.5, halfWidth: 2.3, angle: 50, inner: false }
]);

const earPair = (left, right) => pad((() => {
  const buf = buffer();
  mergeInto(buf, left(EAR_BASE_L_X, -1));
  mergeInto(buf, right(EAR_BASE_R_X, 1));
  return buf;
})(), HEIGHT);

export const ears = {
  normal: earPair(earUpright, earUpright),
  // 오른쪽 귀만 접힘 — 단수달의 droop(한쪽 귀 처짐 = 짜증·귀찮음
  // 신호)과 같은 자리(states.js 의 ears:'droop')에 대응합니다.
  droop: earPair(earUpright, earDroop),
  // 양쪽 귀가 반씩 접힘 — 실 감기(states.js 의 wind)에서만 씁니다.
  halfDroop: earPair(earHalfFold, earHalfFold)
};

/* ── 왕발 ─────────────────────────────────────────────────── */
/* 토끼는 꼬리를 제대로 표현하기 어려워서("꼬리를 표현하기 어려우니")
   대신 몸통 아래 양옆으로 삐져나온 큼직한 발을 귀여운 포인트로
   씁니다. engine.js 는 이 함수를 몸통(body)보다 먼저 "tail" 자리에
   그리므로, 몸통이 발의 안쪽을 덮고 바깥쪽·아래쪽만 삐져나와
   보입니다 — 단수달 꼬리와 같은 가림 기법입니다. y 좌표는 이 팩의
   SHIFT 만큼 이미 밀려 있는 다른 스프라이트들과 맞춥니다. */

const FEET_Y = 29 + SHIFT;

// 처음엔 몸통 양 끝(7/24)에 붙여 벌려놨는데, 발이 바깥으로 벌어질수록
// 다부져 보여서 "조금 더 가운데로 몰면 귀엽겠다"는 요청대로 안쪽으로
// 2px 씩 당겼습니다 — 몸통에 덜 묻히면서 두 발 사이가 좁아집니다.
// 귀와 같은 이유로 두 발의 합도 32 여야 좌우가 맞습니다.
const FOOT_L_X = 8;
const FOOT_R_X = 24;
// 안쪽으로 당긴 만큼 몸통에 더 묻혀서, 삐져나오는 부분이 예전만큼
// 보이도록 발 자체를 키웠습니다.
const FOOT_RX = 3.7;
const FOOT_RY = 2.8;

export function tail(offset = 0) {
  const buf = buffer();
  const y = FEET_Y + offset;
  [FOOT_L_X, FOOT_R_X].forEach((x) => {
    ellipse(buf, x, y, FOOT_RX, FOOT_RY, 'o');
    ellipse(buf, x, y, FOOT_RX - 0.9, FOOT_RY - 0.8, 'l');
  });
  return pad(buf, HEIGHT);
}

/* ── 코바늘 ───────────────────────────────────────────────── */
/* 단수달의 두 바늘(needles) 대신 오른손에 쥔 코바늘 하나입니다.
   engine.js 는 needles(frame, pullOut) 로 부르므로(프레임마다 "찌르는"
   동작, pullOut 2 면 손에서 뺀 상태) 그 계약은 그대로 지킵니다. 이
   함수는 shiftRows 를 거치지 않고 최종 화면 좌표에 직접 그립니다.

   예전엔 오른발에서 오른쪽 위로 뻗었는데, 편물(x12~19)과 반대 방향
   이라 뜨는 시늉이 아니라 그냥 뺨 옆에 막대가 선 꼴이었습니다. 실제
   코바늘은 편물 윗단에 얹혀 코를 끌어올리고 손잡이 끝이 손 뒤로
   빠져나오므로, 갈고리 끝을 편물 윗단 위(HOOK_TIP)에, 손잡이 끝을
   오른손 아래(HOOK_BUTT)에 두고 그 사이를 손이 가립니다. 머리가
   크고 낮아 편물 위 여백이 한 줄뿐이라, 편물보다 앞에 그려야
   갈고리가 보입니다(engine.js 의 NEEDLE_OVER_KNIT). */

// 편물보다 앞에 그려달라는 표시입니다(위 설명 참조).
export const NEEDLE_OVER_KNIT = true;

const HOOK_TIP = [17, 22 + SHIFT];  // 편물 윗단에 얹힌 갈고리 끝
const HOOK_BUTT = [24, 24 + SHIFT]; // 오른손 아래로 빠져나온 손잡이 끝

// 프레임마다 끝점만 따로 찍으면 길이·각도가 같이 변해 "회전축이
// 이상해" 보입니다. 갈고리와 손잡이를 같은 값만큼 통째로 옮겨서
// 모양은 한 픽셀도 바뀌지 않고, 축을 따라 밀고 당기는 움직임만
// 남게 합니다 — 코바늘질은 원래 손목으로 짧게 찌르는 동작입니다.
const HOOK_JABS = [[0, 0], [-1, -1], [1, 1]];

function drawHook(buf, tip, butt) {
  // 테두리 2줄 + 심 1줄. 아래쪽 테두리만 그려 2px 로 얇게도 해봤지만
  // 편물 위에서 윤곽이 사라져 코바늘이 아예 안 보였습니다 — 양쪽 다
  // 둘러야 배경이 밝든 어둡든 형태가 남습니다. 테두리는 선과 수직으로
  // 벌려야 두께가 생기므로(같은 축으로 벌리면 선만 밀립니다) 누운
  // 선은 위아래(y±1)로, 선 선은 좌우(x±1)로 벌립니다.
  const steep = Math.abs(butt[1] - tip[1]) > Math.abs(butt[0] - tip[0]);
  const ox = steep ? 1 : 0;
  const oy = steep ? 0 : 1;
  line(buf, tip[0] + ox, tip[1] + oy, butt[0] + ox, butt[1] + oy, 'g');
  line(buf, tip[0] - ox, tip[1] - oy, butt[0] - ox, butt[1] - oy, 'g');
  line(buf, tip[0], tip[1], butt[0], butt[1], 'n');
  // 갈고리 — 한 칸 더 나간 목에서 실을 걸도록 아래로 꺾입니다.
  // 위로 꺾으면 찌르는 프레임에서 턱선(머리 아래 외곽선)에 닿습니다.
  put(buf, tip[0] - 1, tip[1], 'n');
  put(buf, tip[0] - 1, tip[1] + 1, 'g');
}

export function needles(frame, pullOut = 0) {
  const buf = buffer();
  // pullOut===2(완전히 뺌)일 땐 여기 안 그립니다 — earNeedle() 이
  // 바닥에 내려둔 모습으로 대신 그립니다.
  if (pullOut >= 2) return pad(buf, HEIGHT);
  const [jx, jy] = handJab(frame);
  drawHook(buf, [HOOK_TIP[0] + jx, HOOK_TIP[1] + jy], [HOOK_BUTT[0] + jx, HOOK_BUTT[1] + jy]);
  return pad(buf, HEIGHT);
}

/**
 * 코바늘을 쥔 오른손이 같은 프레임에 따라가야 할 양(engine.js 의
 * toolJab). needles() 와 똑같은 값을 내주므로 손과 코바늘이 절대 따로
 * 놀 수 없습니다 — 코바늘만 움직이면 손을 떠나 공중에서 노는 것처럼
 * 보였습니다.
 */
export function handJab(frame) {
  return HOOK_JABS[frame % HOOK_JABS.length];
}

/**
 * 손에서 뺀 코바늘을 바닥에 눕혀둔 모습. 한 단 풀기와 실 감기가 같이
 * 씁니다(engine.js 는 전자를 earNeedle, 후자를 asideNeedle 로 부릅니다).
 *
 * 단수달은 이걸 귀 뒤에 꽂아두지만, 토끼 귀는 접히면서 자리가 계속
 * 바뀌어 바늘이 귀에 걸친 건지 뜬 건지 모호했습니다("귀에 꽂는 것도
 * 엉성해").
 *
 * 비어 있는 왼쪽 아래에 내려놨더니 이번엔 오른손에 쥐고 있던 코바늘이
 * 반대편으로 순간이동하는 꼴이었습니다 — 놓는 손 바로 아래, 오른쪽
 * 바닥에 눕힙니다. 다만 그쪽 허리 높이(실뭉치·내려둔 편물이 모두
 * x23~28, y34~38)는 이미 꽉 차서 코바늘이 묻히므로, 그보다 더 아래
 * 맨 바닥 줄에 눕혀 실뭉치 앞을 지나가게 합니다.
 */
export function asideNeedle() {
  const buf = buffer();
  const tip = [22, 38];
  const butt = [30, 37];
  line(buf, tip[0], tip[1] + 1, butt[0], butt[1] + 1, 'g');
  line(buf, tip[0], tip[1] - 1, butt[0], butt[1] - 1, 'g');
  line(buf, tip[0], tip[1], butt[0], butt[1], 'n');
  put(buf, tip[0] - 1, tip[1], 'n');     // 갈고리 목
  put(buf, tip[0] - 1, tip[1] - 1, 'g'); // 위로 꺾인 갈고리 끝
  return pad(buf, HEIGHT);
}

export const earNeedle = asideNeedle;
