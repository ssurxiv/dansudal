/*!
 * 단수달 (Knitting Companion) — 상태 정의
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 */

/**
 * 상태 하나는 아래 항목으로 기술합니다.
 *
 *   pose      렌더러가 어떤 자세로 그릴지 (engine.js 의 POSES 키)
 *   ears      'normal' | 'droop'
 *   face      'neutral' | 'flat' | 'annoyed' | 'proud' | 'starry'
 *   frames    이 상태가 소비하는 프레임 수. null 이면 조건이 끝날 때까지 반복
 *   frameMs   프레임 간격
 *   onEnter   진입 시 1회 실행할 액션 이름
 *   onFrame   { 프레임번호: 액션이름 }
 *   repeatIf  frames 가 null 일 때 계속 돌지 판단하는 조건 이름
 *   everyN    반복 상태에서 액션을 몇 프레임마다 실행할지
 *   next      끝난 뒤 이동할 상태. null 이면 idle
 *
 * 여기에 없는 동작은 렌더러에도 없어야 합니다. 상태를 추가할 때
 * 이 표를 먼저 고치고 그다음에 POSES 를 채우는 순서로 작업하세요.
 */
export const STATES = {
  idle: {
    pose: 'holdWork',
    ears: 'normal',
    face: 'neutral',
    frames: null,
    frameMs: 200,
    // 'never' 는 버그였습니다: frames===null 인 상태는 repeatIf 가
    // false 를 내는 순간 "루프가 끝났다"로 취급되어 wind 전용
    // 완료 문구를 띄우며 매 프레임 자기 자신으로 재진입했습니다.
    // idle 은 애초에 끝나는 루프가 아니라 항상 도는 대기 상태입니다.
    repeatIf: 'always',
    next: null
  },

  /* 한 단 뜨기 — 버튼 한 번에 짧게 반응하고 멈춥니다.
     목표 단수를 채운 마지막 한 단이면 idle 대신 completion 으로 갑니다. */
  knit: {
    pose: 'knitting',
    ears: 'normal',
    face: 'neutral',
    frames: 6,
    frameMs: 200,
    onEnter: 'flashOn',
    onFrame: { 2: 'flashOff' },
    next: (c) => (c.rows >= c.target ? 'complete' : 'idle')
  },

  /* 풀기 1단계 — 예비 동작. 없으면 되감기로 보입니다. */
  notice: {
    pose: 'holdWork',
    ears: 'droop',
    face: 'annoyed',
    frames: 3,
    frameMs: 200,
    showBang: true,
    next: 'pullNeedle'
  },

  /* 풀기 2단계 — 코에서 바늘을 뽑습니다. */
  pullNeedle: {
    pose: 'pullingNeedle',
    ears: 'droop',
    face: 'annoyed',
    frames: 2,
    frameMs: 140,
    next: 'rip'
  },

  /* 풀기 3단계 — 잡아당기고 실을 바닥에 떨굽니다. */
  rip: {
    pose: 'yanking',
    ears: 'droop',
    face: 'annoyed',
    frames: 5,
    frameMs: 130,
    onFrame: { 3: 'dropRow' },
    next: 'idle'
  },

  /* 감기 예비 동작 — 바늘·편물을 내려놓고 실뭉치를 들기 전 잠깐
     손을 늦춥니다. 이게 없으면 냅다 감기 시작하는 것처럼 보입니다. */
  setDown: {
    pose: 'settingDown',
    ears: 'normal',
    face: 'flat',
    frames: 3,
    frameMs: 180,
    next: 'wind'
  },

  /* 감기 — 바닥이 빌 때까지 반복합니다. */
  wind: {
    pose: 'winding',
    ears: 'normal',
    face: 'flat',
    frames: null,
    frameMs: 150,
    repeatIf: 'pileRemains',
    everyN: 4,
    onFrame: { 0: 'windOne' },
    next: 'idle'
  },

  /* 완성 — 목표 단수 도달. 편물이 처음으로 다른 물건(finishedPiece)이
     됩니다. 반짝임이 끝나면 자랑하기로 넘어갑니다. */
  complete: {
    pose: 'complete',
    ears: 'normal',
    face: 'starry',
    frames: 8,
    frameMs: 150,
    next: 'showoff'
  },

  /* 자랑하기 — 완성 후의 새 대기 상태. repeatIf 가 항상 참이라
     사용자가 입어보기를 누르기 전까지 계속 돕니다. */
  showoff: {
    pose: 'showoff',
    ears: 'normal',
    face: 'neutral',
    frames: null,
    frameMs: 220,
    repeatIf: 'always',
    next: null
  },

  /* 입어보기 예비 동작 — 반짝임이 몰아치는 짧은 전환. 되감기가
     아니라 의도된 변화임을 알리는 0.6초 급의 신호입니다. */
  wrapping: {
    pose: 'wrapping',
    ears: 'normal',
    face: 'neutral',
    frames: 4,
    frameMs: 120,
    next: 'wearing'
  },

  /* 착용 — 몸통 스프라이트(목·어깨선)를 처음 건드리는 상태입니다.
     wornScarf 로 완전히 다른 실루엣이 됩니다. face 는 입꼬리 대신
     눈을 접어 뿌듯함을 드러내는 'proud'. */
  wearing: {
    pose: 'wearing',
    ears: 'normal',
    face: 'proud',
    frames: null,
    frameMs: 220,
    repeatIf: 'always',
    next: null
  }

  /* TODO complete/wearing/showoff 구현 완료. 다음 후보는 색상 커스텀,
   * 여러 벌 완성품 갤러리 정도입니다.
   */
};

export const ENTRY = {
  knit: 'knit',
  rip: 'notice',
  wind: 'setDown'
};
