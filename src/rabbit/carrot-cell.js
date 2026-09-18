/*!
 * 코토키 — 진행 그리드 칸(당근)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 토끼의 주식인 당근 하나 = 한 코. 뿌리는 currentColor(실제 뜬 실
 * 색)로, 잎은 항상 고정 초록으로 그려 어떤 실 색이 와도 당근으로
 * 읽히게 합니다. 무늬는 단수달 물고기의 눈과 같은 자리(코 줄임/코
 * 늘림/꽈배기 표시)입니다.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const ROOT_D = 'M5,4 C5,2.8 6.6,2.3 8,2.3 L16,2.3 C17.4,2.3 19,2.8 19,4 '
  + 'C19,8.2 14.3,21 12,21 C9.7,21 5,8.2 5,4 Z';
const LEAF_L = '9,3 11,3 7,0';
const LEAF_M = '11,2.3 13,2.3 12,-0.7';
const LEAF_R = '13,3 15,3 17,0';
const LEAF_COLOR = '#4a7c3f';

export function create() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('row-cell');

  const root = document.createElementNS(SVG_NS, 'path');
  root.setAttribute('d', ROOT_D);
  root.setAttribute('fill', 'currentColor');
  svg.appendChild(root);

  [LEAF_L, LEAF_M, LEAF_R].forEach((pts) => {
    const leaf = document.createElementNS(SVG_NS, 'polygon');
    leaf.setAttribute('points', pts);
    leaf.setAttribute('fill', LEAF_COLOR);
    svg.appendChild(leaf);
  });

  setShape(svg, 'circle');
  return svg;
}

/** 평소엔 점, 코 줄임 ^, 코 늘림 V, 꽈배기 X — 단수달 물고기 눈과 같은 규칙. */
export function setShape(svg, shape) {
  const old = svg.querySelector('.carrot-mark');
  if (old) old.remove();

  let mark;
  if (shape === 'up' || shape === 'down' || shape === 'x') {
    mark = document.createElementNS(SVG_NS, 'path');
    const d = shape === 'up' ? 'M10.5,12.8 L12,10.6 L13.5,12.8'
      : shape === 'down' ? 'M10.5,10.6 L12,12.8 L13.5,10.6'
      : 'M10.5,10.3 L13.5,13.3 M13.5,10.3 L10.5,13.3';
    mark.setAttribute('d', d);
    mark.setAttribute('fill', 'none');
    mark.setAttribute('stroke-width', '1.3');
    mark.setAttribute('stroke-linecap', 'round');
    mark.setAttribute('stroke-linejoin', 'round');
    mark.style.stroke = 'var(--paper)';
  } else {
    mark = document.createElementNS(SVG_NS, 'circle');
    mark.setAttribute('cx', '12');
    mark.setAttribute('cy', '11.5');
    mark.setAttribute('r', '1.3');
    mark.style.fill = 'var(--paper)';
  }
  mark.classList.add('carrot-mark');
  svg.appendChild(mark);
}
