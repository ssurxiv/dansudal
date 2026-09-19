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

import { SIZE, pad, buffer, put, line, shiftRows } from '../pixel.js';
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
  WIDTH,
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

/* 가로도 단수달(32열)보다 한 열 넓은 33열을 씁니다.

   32열에서는 좌우 대칭축이 열과 열 사이(x15.5)에 떨어져서, 가운데에
   놓는 것은 무엇이든 짝수 폭일 수밖에 없었습니다 — 1px 인중을 그릴
   수가 없어 코 밑 세로선이 늘 2px 로 굵게 뭉쳤습니다. 가운데에 열
   하나를 끼워 넣으면 대칭축이 그 열(x16) 위에 놓여 홀수 폭(1px·3px)
   도 정확히 가운데 정렬됩니다.

   단수달 팩이 이미 33열로 내주므로(otter/sprites.js 의 WIDTH) 여기서
   재사용할 때는 세로로 밀기만 하면 됩니다.

   대칭 규칙: 열 하나짜리 중심은 x16, 좌우 한 쌍은 합이 32(픽셀 인덱스)
   또는 33(타원 중심처럼 x+0.5 로 재는 값)이어야 합니다. */
export { WIDTH }; // 이 팩의 캔버스 폭도 단수달과 같은 33열입니다

const shift = (sprite) => shiftRows(sprite, SHIFT, HEIGHT);
/** 단수달 스프라이트를 이 팩의 캔버스(33 × 40)로 옮깁니다. */
const adapt = shift;
const padR = (rows, height = HEIGHT) => pad(rows, height, WIDTH);

/* 몸통은 단수달보다 한 줄 짧습니다 — 토끼는 통통하고 짤막해야
   귀엽고, 덤으로 발이 몸통 아래로 한 칸 더 나와 흔들리는 게 잘
   보입니다. 가장 넓은 구간(단수달 y24~27)은 같은 줄이 이어지므로
   그중 하나를 빼도 실루엣이 깨지지 않습니다. */
const SHORTEN_ROW = 25;
const shortenBody = (sprite) => [
  ...sprite.slice(0, SHORTEN_ROW),
  ...sprite.slice(SHORTEN_ROW + 1),
  '.'.repeat(sprite[0].length) // 줄어든 만큼 맨 아래를 비워 길이를 맞춥니다
];

export const body = adapt(shortenBody(otterBody));

/* 눈과 주둥이 — 단수달 머리에서 이 부분만 다시 그립니다(외곽선과
   볼터치 fff 는 그대로).

   눈은 단수달 자리(넓힌 뒤 x9~11 / x21~23)에서 좌우 한 칸씩 안으로
   당겨 x10~12 / x20~22 에 둡니다 — 토끼 머리가 단수달보다 크고 둥글어
   같은 자리에 두면 눈이 멀어 보였습니다. 눈동자 하이라이트(w)는
   단수달처럼 두 눈 다 같은 쪽(왼쪽 위)에 둡니다 — 빛은 한쪽에서
   들어오니 좌우를 거울처럼 뒤집으면 오히려 어색합니다. 완성 표정
   (starry)이 더하는 반짝임도 같은 이유로 두 눈 다 오른쪽 아래입니다.

   단수달의 주둥이(연한 l)는 뺨에서 뺨까지 퍼진 넓은 가로 띠라
   수달답지만 토끼에는 헐렁해서, 위는 좁고 아래로 갈수록 넓어지는
   반원으로 좁혔습니다.

   코와 입은 작게 갑니다("깨발랄 햇살" 컨셉). ㅗ·ㅅ·∨·벌린 입처럼
   입을 크게 그린 시안은 모두 이 얼굴 크기에선 입 쪽이 무거워 보였고,
   오히려 입을 줄이자 귀여워졌습니다. 코는 역삼각형(y21~22)을 주둥이
   윗선에 걸치게 두고, 눈꺼풀과 같은 자주(v)로 칠합니다. 분홍(볼터치색)은
   분홍 볼·귀 사이에서 묻혔고, 눈과 같은 짙은 색(e)은 눈 두 개와 같은
   무게로 찍혀 튀었습니다 — 그 중간 톤입니다. 입은 가로 3칸(y25).

   볼터치는 3·5·5·3 타원(y21~24)으로 크게 — 발그레한 볼이 발랄한
   인상을 가장 크게 좌우합니다. 눈은 3칸×4줄 네모 그대로인데, 폭이
   3칸뿐이라 모서리를 깎으면 둥글어지는 대신 +자나 물방울이 됩니다.

   행 번호는 최종 좌표(이미 SHIFT 만큼 밀린 값)이고, 폭도 이미 33열
   이라 widen() 을 거치지 않습니다. */
const HEAD_ROWS = {
  // 단수달은 이 줄에 눈썹이 있지만 토끼는 눈썹 없이 갑니다.
  17: '.....obbbbbbbbbbbbbbbbbbbbbo.....',
  18: '.....obbbbweebbbbbbbweebbbbo.....',
  19: '.....obbbbeeebbbbbbbeeebbbbo.....',
  20: '.....obbbbeeebbbbbbbeeebbbbo.....',
  21: '.....offfbeeebbvvvbbeeebfffo.....',
  22: '....offfffbbblllvlllbbbfffffo....',
  23: '....offfffbblllllllllbbfffffo....',
  24: '.....offfbblllllllllllbbfffo.....',
  25: '......obbbbllllmmmllllbbbbo......',
  // 단수달은 이 줄까지 주둥이를 좌우 끝까지 채워 넓게 끝내지만,
  // 토끼 주둥이는 위가 좁고 아래가 넓은 반원이라 그대로 물려받으면
  // 맨 아랫줄만 불룩 튀어나옵니다 — 윗줄과 같은 폭으로 맞춥니다.
  26: '........obblllllllllllbbo........'
};

export const head = adapt(otterHead).map((row, y) => HEAD_ROWS[y] ?? row);
export const bang = adapt(otterBang);

/* 표정은 대부분 단수달 것을 그대로 쓰지만 두 개만 토끼용으로 다시
   그립니다.

   annoyed(한 단 풀기) — 반쯤 내린 눈꺼풀이 외곽선 색(o, 갈색기 도는
   어두운 색)이라 분홍 얼굴 위에서 저 혼자 칙칙했습니다. 털·볼터치와
   같은 계열의 자주(v)로 바꿉니다. 단수달이 같이 바꾸는 입은 건드리지
   않습니다 — 토끼 입은 인중까지 있는 ㅗ 모양이라, 가운데만 남기고
   오므리면 인중과 붙어 세로 막대처럼 뭉칩니다. 어차피 이 캐릭터는
   입보다 눈·귀로 표현합니다(README 원칙).

   proud(입어보기) — 뒤집힌 U 대신 ><. 양 눈이 서로 마주 보게 꺾여
   더 토끼답고 신나 보입니다. */
/* 눈을 안쪽으로 당겼으니(위 HEAD_ROWS) 눈을 건드리는 표정은 전부 이
   팩에서 다시 그립니다 — 단수달 것을 그대로 쓰면 덮개·눈꺼풀이 원래
   자리에 찍혀 눈이 반만 가려집니다. 행 번호는 단수달 기준(밀기 전)
   이고 폭만 이미 33열이라, shift 만 하고 widen 은 하지 않습니다. */
const faceRows = (rows) => [pad(rows, SIZE, WIDTH)];
const EYE_COVER_ROW = '..........bbb.......bbb..........';

const RABBIT_FACES = {
  flat: [
    pad({ 10: EYE_COVER_ROW, 11: EYE_COVER_ROW, 12: EYE_COVER_ROW, 13: EYE_COVER_ROW }, SIZE, WIDTH),
    pad({ 12: '..........eee.......eee..........' }, SIZE, WIDTH)
  ],
  annoyed: faceRows({
    10: EYE_COVER_ROW,
    11: '..........vvv.......vvv..........'
  }),
  proud: faceRows({
    10: EYE_COVER_ROW,
    11: '..........eeb.......bee..........',
    12: '..........bbe.......ebb..........',
    13: '..........eeb.......bee..........'
  }),
  // 완성(complete·showoff·wrapping)에는 눈 반짝임에 더해 입을 벌린 O 로.
  // 3칸 폭에서 마름모로 그리면 가운데 한 칸 때문에 +자로 읽혀서, 네모
  // 테두리 안에 분홍 속(혀)을 둡니다. 코가 한 칸 올라가(y21~22) O 와
  // 한 줄 떨어져 있어서 코·입이 한 덩어리로 뭉치지 않습니다.
  starry: faceRows({
    11: '............w.........w..........',
    16: '...............mmm...............',
    17: '...............mfm...............',
    18: '...............mmm...............'
  })
};

export const faces = Object.fromEntries(
  Object.entries(otterFaces).map(([key, layers]) => [
    key,
    RABBIT_FACES[key] ? RABBIT_FACES[key].map(shift) : (layers?.map(adapt) ?? null)
  ])
);

export function arm(x0, y0, x1, y1) { return adapt(otterArm(x0, y0, x1, y1)); }
export function paws(lx, ly, rx, ry) { return adapt(otterPaws(lx, ly, rx, ry)); }
export const asideKnit = adapt(otterAsideKnit);
export function floorBall(amount) { return adapt(otterFloorBall(amount)); }
export function feedStrand(knitLength, ballAmount) { return adapt(otterFeedStrand(knitLength, ballAmount)); }
export function windStrand(ballAmount) { return adapt(otterWindStrand(ballAmount)); }
export function pulledYarn(rx, ry) { return adapt(otterPulledYarn(rx, ry)); }
export function pile(amount) { return adapt(otterPile(amount)); }

export function knit(length, flash) { return shift(otterKnit(length, flash)); }

/* ── 완성품: 비니 ─────────────────────────────────────────── */
/* 코바늘 작품은 긴 목도리보다 모자가 어울려서(사용자 요청) 단수달의
   목도리 대신 비니를 씁니다. 실 팔레트(k 테두리 / y·d 줄무늬)와
   finishedPiece(top)·wornScarf() 계약은 그대로 지키므로, 실 교체
   이력이 줄무늬로 남는 것도 목도리와 똑같이 동작합니다. */

/**
 * 줄마다 [y, 왼쪽, 오른쪽] 폭으로 모자 모양을 잡고, 바깥과 맞닿은 칸을
 * 전부 테두리(k)로 칠합니다. bands 에 든 줄은 통째로 테두리(접단 경계)
 * 입니다. 예전엔 줄마다 양 끝만 k 로 찍어서, 폭이 두 칸씩 벌어지는
 * 자리의 안쪽 칸과 맨 아랫줄이 테두리 없이 바깥에 드러났습니다.
 */
function drawBeanie(buf, spans, bands) {
  const rows = new Map(spans.map(([y, left, right]) => [y, [left, right]]));
  const inside = (x, y) => rows.has(y) && x >= rows.get(y)[0] && x <= rows.get(y)[1];
  spans.forEach(([y, left, right], i) => {
    for (let x = left; x <= right; x++) {
      const edge = bands.has(y)
        || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      put(buf, x, y, edge ? 'k' : ((i % 2) ? 'y' : 'd'));
    }
  });
}

/* 들어 보이는(자랑하기·완성) 비니. 처음엔 7줄짜리 사다리꼴이라
   모자보다 상자에 가까웠습니다 — 한 줄 낮추고, 꼭대기에서 폭이
   확 벌어졌다가(+4) 완만해지게(+2, +2) 해서 둥근 돔으로 만듭니다.
   넷째 줄이 접단 경계, 그 아래가 접단, 맨 아랫줄이 밑단 테두리입니다.
   engine.js 가 top 부터 FINISHED_PIECE_SPAN+1 줄을 잘라 쓰므로, 아래
   FINISHED_PIECE_SPAN 도 이 높이(6줄)에 맞춰 다시 내줍니다. */
const HELD_BEANIE = [[13, 19], [11, 21], [10, 22], [10, 22], [9, 23], [9, 23]];
const HELD_BEANIE_BAND = 3;

export function finishedPiece(top = 20) {
  const buf = buffer();
  const spans = HELD_BEANIE.map(([left, right], i) => [top + i, left, right]);
  drawBeanie(buf, spans, new Set([top + HELD_BEANIE_BAND]));
  return shift(pad(buf, SIZE, WIDTH));
}

/* 머리에 쓴 비니. 줄 범위(WORN_SPAN)와 각 줄 너비는 이 팩의 머리
   실루엣(밀린 뒤 y10~17)에 딱 맞춰서, 모자가 머리 윤곽을 그대로
   덮도록 했습니다 — 한 줄이라도 좁으면 머리 외곽선이 모자 밖으로
   삐져나옵니다. 귀는 머리보다 먼저(뒤에) 그려지므로 모자 위로
   그대로 솟아 있습니다. */
/* [행, 왼쪽, 오른쪽]. 머리가 시작하는 y10 부터는
   머리 실루엣과 같거나 한 칸 넓어야 머리 외곽선이 모자 밖으로
   삐져나오지 않습니다. 그 위 한 줄(y9)은 머리가 없는 자리라 좁혀서
   꼭대기를 둥글렸습니다 — 처음엔 y8 까지 두 줄을 얹었다가 쓴 모자가
   너무 높아 보여 맨 윗단을 뺐습니다. */
const BEANIE_SPANS = [
  [9, 11, 21], // 둥근 꼭대기
  [10, 10, 22], // 머리(x11~21)보다 한 칸씩 넓게 — 모자 천의 두께
  [11, 9, 23],
  [12, 8, 24],
  [13, 7, 25],
  [14, 6, 26], // 접단 경계 (WORN_BEANIE_BAND)
  [15, 6, 26],
  [16, 5, 27],
  // 바로 아래(y18)가 눈이라 여기서 끝납니다. 마지막 줄은 바깥과 맞닿아
  // 자동으로 통째 테두리가 되어, 밑단이 얼굴 털과 바로 섞이지 않습니다.
  [17, 5, 27]
];
const WORN_BEANIE_BAND = 14;
export const WORN_SPAN = [9, 17];

// 비니는 6줄이라 단수달 목도리(8줄)보다 얕습니다. engine.js 가
// top + SPAN + 1 까지 잘라 줄무늬를 입히므로 그 높이에 맞춥니다.
export const FINISHED_PIECE_SPAN = 4;

// 자랑하기·입어보기 전환에서 완성품을 잡는 자리. 목도리(단수달)는
// 넓어서 몸통 밖까지 벌려야 양 끝을 잡지만, 비니는 좁아서 그만큼
// 벌리면 모자가 두 손 사이에 붕 뜹니다 — 모자 양옆에 딱 붙입니다.
// dy 는 모자를 챙 쪽에서 잡게 두 줄 내린 값입니다. 꼭대기를 잡으면
// 손과 팔이 둥근 머리 부분을 덮어 모자가 사다리꼴로 보입니다.
export const SPREAD_PAWS = { lx: 6, rx: 22, dy: 3 };

// 완성 연출(반짝임이 터진 뒤)부터 모자를 자랑하기처럼 챙을 잡고 들어
// 올립니다. 평소 손 자리(PAWS_REST)는 모자의 둥근 머리 줄에 겹쳐서
// 손이 모자 옆 테두리를 덮어 모양이 깨졌습니다.
export const HOLD_PIECE_UP = true;

export function wornScarf() {
  const buf = buffer();
  drawBeanie(buf, BEANIE_SPANS, new Set([WORN_BEANIE_BAND]));
  return padR(buf);
}
export function sparkles(frame) { return adapt(otterSparkles(frame)); }
export function sparkleBurst() { return adapt(otterSparkleBurst()); }
export function hearts(frame) { return adapt(otterHearts(frame)); }

/**
 * heldBall() 은 스프라이트 하나와 좌표 여러 개(leftPaw/bottom/arc)를
 * 함께 돌려줍니다. 좌표들은 engine.js 가 c.S.paws(lx,ly,rx,ry) 처럼
 * "그리기 함수의 인자"로만 쓰므로 단수달 좌표계 그대로 둬야 하고
 * (paws() 가 결과를 알아서 밀어줍니다), 스프라이트만 이 팩의 화면
 * 좌표로 밀어야 합니다.
 */
export function heldBall(amount) {
  const h = otterHeldBall(amount);
  return { ...h, sprite: adapt(h.sprite) };
}

// 좌표만 있는(직접 그리지 않는) 값들은 단수달 좌표계 그대로
// 재수출합니다 — engine.js 가 이 값들을 그리기 함수의 인자로 넘기면
// 그 함수가 결과 스프라이트를 알아서 밀어줍니다.
export {
  SHOULDER_L, SHOULDER_R, LEFT_PIVOT, RIGHT_PIVOT, yanks,
  floorBallAnchor, MAX_KNIT, MAX_PILE, ballTier,
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
  p: '#fdf1f2', // 앞발
  // 반쯤 감은 눈꺼풀(annoyed)과 코. 외곽선(o)을 쓰면 갈색기가 돌아 분홍
  // 얼굴에서 저 혼자 칙칙해 보여서, 볼터치와 같은 계열의 자주입니다.
  v: '#9c4f66'
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
// 합이 33 이어야 좌우가 맞고(x+0.5 로 재는 값의 대칭 조건), 둘 다
// .5 여야 타원이 홀수 폭으로 떨어져 안쪽 윤곽이 깨지지 않습니다 —
// 정수(14/19)로 두면 두 귀가 가운데 열에서 맞물려 테두리가 서로를
// 파먹습니다.
const EAR_BASE_L_X = 13.5;
const EAR_BASE_R_X = 19.5;
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

const earPair = (left, right) => padR((() => {
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

// 완성품을 입은 상태는 꼬리(= 발)를 위아래로 흔드는데, 예전 자리
// (29+SHIFT)에서는 내려간 프레임의 아래 테두리가 캔버스 밖으로 나가
// 발 윤곽이 끊겨 보였습니다 — 한 칸 올려 흔들어도 다 들어오게 합니다.
const FEET_Y = 28 + SHIFT;

// 처음엔 몸통 양 끝(7/24)에 붙여 벌려놨는데, 발이 바깥으로 벌어질수록
// 다부져 보여서 "조금 더 가운데로 몰면 귀엽겠다"는 요청대로 안쪽으로
// 2px 씩 당겼습니다 — 몸통에 덜 묻히면서 두 발 사이가 좁아집니다.
// 귀와 같은 이유로 두 발의 합도 32 여야 좌우가 맞습니다.
const FOOT_L_X = 8;
const FOOT_R_X = 25;
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
  return padR(buf);
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

const HOOK_TIP = [18, 22 + SHIFT];  // 편물 윗단에 얹힌 갈고리 끝
const HOOK_BUTT = [25, 24 + SHIFT]; // 오른손 아래로 빠져나온 손잡이 끝

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
  if (pullOut >= 2) return padR(buf);
  const [jx, jy] = handJab(frame);
  drawHook(buf, [HOOK_TIP[0] + jx, HOOK_TIP[1] + jy], [HOOK_BUTT[0] + jx, HOOK_BUTT[1] + jy]);
  return padR(buf);
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
  const tip = [23, 38];
  const butt = [31, 37];
  line(buf, tip[0], tip[1] + 1, butt[0], butt[1] + 1, 'g');
  line(buf, tip[0], tip[1] - 1, butt[0], butt[1] - 1, 'g');
  line(buf, tip[0], tip[1], butt[0], butt[1], 'n');
  put(buf, tip[0] - 1, tip[1], 'n');     // 갈고리 목
  put(buf, tip[0] - 1, tip[1] - 1, 'g'); // 위로 꺾인 갈고리 끝
  return padR(buf);
}

export const earNeedle = asideNeedle;
