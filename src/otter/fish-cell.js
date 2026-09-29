/*!
 * 함뜨마을 동물 친구들 — 단수달 진행 그리드 칸(물고기)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 캐릭터가 수달이라 네모 대신 물고기 한 마리 = 한 단. 뒤로 갈수록
 * 얇아지는 몸통(머리 쪽은 둥글고 두껍게, 꼬리 쪽은 홀쭉하게) + 작은
 * 삼각 꼬리 + 아래쪽 절반을 살짝 어둡게 칠한 명암 + 눈으로 구성됩니다.
 * 몸통·꼬리는 currentColor 라, 실제 색은 이 함수가 아니라 companion-app.js
 * 의 공용 그리드 렌더러가 svg.style.color 로 입힙니다. 눈은 알림
 * 종류에 따라 setShape() 가 매 렌더마다 다시 그립니다.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// 물고기 몸통·꼬리 좌표. index.html 상단의 공유 <clipPath id="fishClip">
// 가 명암용 사각형을 이 모양대로 잘라내야 하니, 좌표를 바꾸면 거기도
// 반드시 같이 바꿔야 합니다.
const FISH_BODY_D = 'M3,12 C3,6.2 9,5 13,6 C16,6.8 16.5,9.6 16.5,12 C16.5,14.4 16,17.2 13,18 C9,19 3,17.8 3,12 Z';
const FISH_TAIL_POINTS = '16,12 22,7 22,17';

export function create() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('row-cell');

  const body = document.createElementNS(SVG_NS, 'path');
  body.setAttribute('d', FISH_BODY_D);
  body.setAttribute('fill', 'currentColor');

  const tail = document.createElementNS(SVG_NS, 'polygon');
  tail.setAttribute('points', FISH_TAIL_POINTS);
  tail.setAttribute('fill', 'currentColor');

  // 명암 — 몸통 아래쪽 절반을 반투명 검정으로 살짝 덮어 그림자를
  // 흉내냅니다. 실제 색을 계산해 어둡게 섞는 대신 이렇게 하면 어떤
  // 실 색이 와도 그대로 통합니다.
  const shade = document.createElementNS(SVG_NS, 'rect');
  shade.setAttribute('x', '0');
  shade.setAttribute('y', '12');
  shade.setAttribute('width', '24');
  shade.setAttribute('height', '12');
  shade.setAttribute('fill', 'black');
  shade.setAttribute('fill-opacity', '0.22');
  shade.setAttribute('clip-path', 'url(#fishClip)');

  svg.append(body, tail, shade);
  setShape(svg, 'circle');
  return svg;
}

/**
 * 눈 모양을 갱신합니다 — 평소엔 동그라미, 코 줄임 단은 ^, 코 늘림
 * 단은 V, 꽈배기 단은 X. 배경색으로 "구멍"을 뚫는 방식이라(칠하는
 * 게 아니라 stroke/fill 을 배경색으로) 어떤 실 색이 와도 또렷하게
 * 보입니다.
 */
export function setShape(svg, shape) {
  const old = svg.querySelector('.fish-eye');
  if (old) old.remove();

  let eye;
  if (shape === 'up' || shape === 'down' || shape === 'x') {
    eye = document.createElementNS(SVG_NS, 'path');
    const d = shape === 'up' ? 'M4,11.8 L5.6,9.6 L7.2,11.8'
      : shape === 'down' ? 'M4,9.6 L5.6,11.8 L7.2,9.6'
      : 'M4,9.3 L7.2,12.3 M7.2,9.3 L4,12.3';
    eye.setAttribute('d', d);
    eye.setAttribute('fill', 'none');
    eye.setAttribute('stroke-width', '1.3');
    eye.setAttribute('stroke-linecap', 'round');
    eye.setAttribute('stroke-linejoin', 'round');
    eye.style.stroke = 'var(--paper)';
  } else {
    eye = document.createElementNS(SVG_NS, 'circle');
    eye.setAttribute('cx', '5.5');
    eye.setAttribute('cy', '10.5');
    eye.setAttribute('r', '1.3');
    eye.style.fill = 'var(--paper)';
  }
  eye.classList.add('fish-eye');
  svg.appendChild(eye);
}
