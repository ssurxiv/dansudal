/*!
 * 함뜨마을 동물 친구들 — 픽셀 도구
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * 무단 복제 및 재배포를 금합니다. 자세한 내용은 LICENSE.txt 참조.
 * https://instagram.com/tteoboja_0
 */

// 단수달의 기본(정사각) 캔버스 크기입니다. 더 이상 모든 스프라이트가
// 반드시 이 크기여야 하는 건 아닙니다 — pad()/blit()/sliceRows() 는
// 실제 배열 길이·행 길이를 따라가므로, 다른 컨셉이 더 큰(특히 더
// 높은) 캔버스를 쓰고 싶으면 pad() 에 height/width 를 넘기면 됩니다
// (코토키가 귀 공간을 위해 이렇게 씁니다 — rabbit/sprites.js 참조).
export const SIZE = 32;
const EMPTY_ROW = '.'.repeat(SIZE);

/**
 * 듬성듬성 정의한 행 객체를 height 행짜리(기본 32) 스프라이트로 채웁니다.
 * 각 행은 정확히 width 글자로 맞춥니다 — put() 이 쓰인 자리까지만 행을
 * 늘려두므로(아래 참조) 길이가 들쭉날쭉한 채로 나올 수 있는데,
 * blit/sliceRows/shiftRows 가 행 길이를 그대로 믿기 때문입니다.
 */
export function pad(rows, height = SIZE, width = SIZE) {
  const emptyRow = width === SIZE ? EMPTY_ROW : '.'.repeat(width);
  const out = [];
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row === undefined) out.push(emptyRow);
    else out.push(row.length === width ? row : row.slice(0, width).padEnd(width, '.'));
  }
  return out;
}

/** 가변 스프라이트를 만들 때 쓰는 쓰기 가능한 버퍼입니다. */
export function buffer() {
  return {};
}

// 음수만 막고, 최종 크기는 pad() 의 height/width 가 정합니다 — 범위를
// 넘겨 써도 pad() 가 잘라내므로 조용히 버려집니다. 예전에는 가로를
// 32 로 못박았는데, 코토키가 좌우 대칭축을 열과 열 사이가 아니라
// 가운데 열 위에 두려고 33 열을 쓰면서 풀었습니다.
export function put(buf, x, y, ch) {
  if (x < 0 || y < 0) return;
  const row = buf[y] ?? EMPTY_ROW;
  const padded = row.length > x ? row : row.padEnd(x + 1, '.');
  buf[y] = padded.substring(0, x) + ch + padded.substring(x + 1);
}

/** 브레젠험 직선. 바늘과 실 가닥처럼 각도가 변하는 요소에 씁니다. */
export function line(buf, x0, y0, x1, y1, ch) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  const guardMax = (Math.max(dx, dy) + 2) * 2;

  for (let guard = 0; guard < guardMax; guard++) {
    put(buf, x, y, ch);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

/**
 * 스프라이트에서 [fromY, toY] 구간의 행만 남기고 나머지는 지운
 * 복사본을 만듭니다. 같은 스프라이트를 실 색 구간별로 나눠 각기
 * 다른 팔레트로 블릿할 때 씁니다. 스프라이트 자신의 길이·행 폭을
 * 그대로 따라가므로 32행짜리가 아니어도 그대로 동작합니다.
 */
export function sliceRows(sprite, fromY, toY) {
  const width = sprite[0]?.length ?? SIZE;
  const emptyRow = width === SIZE ? EMPTY_ROW : '.'.repeat(width);
  const out = [];
  for (let y = 0; y < sprite.length; y++) {
    out.push(y >= fromY && y <= toY ? sprite[y] : emptyRow);
  }
  return out;
}

/**
 * 스프라이트를 아래로 offset 만큼 밀어낸 복사본을 만듭니다. 다른
 * 컨셉이 캔버스를 세로로 더 크게 잡고 위쪽에 생긴 여백에 자기만의
 * 요소(귀 등)를 그리면서, 재사용하는 스프라이트(몸통·얼굴 등)는
 * 원래 좌표를 그대로 두고 이걸로 한 번에 아래로 옮길 때 씁니다.
 */
export function shiftRows(sprite, offset, height = sprite.length + offset) {
  const width = sprite[0]?.length ?? SIZE;
  const emptyRow = width === SIZE ? EMPTY_ROW : '.'.repeat(width);
  const out = [];
  for (let y = 0; y < height; y++) {
    const srcY = y - offset;
    out.push(srcY >= 0 && srcY < sprite.length ? sprite[srcY] : emptyRow);
  }
  return out;
}

/**
 * 스프라이트 한 장을 캔버스에 찍습니다. 스프라이트 자신의 길이·행
 * 폭을 그대로 따라가므로 32×32 가 아니어도 그대로 동작합니다.
 * palette 에 없는 문자와 '.' 은 투명으로 건너뜁니다.
 */
export function blit(ctx, sprite, palette) {
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
