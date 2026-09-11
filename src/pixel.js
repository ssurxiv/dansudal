/*!
 * 단수달 (Knitting Companion)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * 무단 복제 및 재배포를 금합니다. 자세한 내용은 LICENSE.txt 참조.
 * https://instagram.com/tteoboja_0
 */

export const SIZE = 32;
const EMPTY_ROW = '.'.repeat(SIZE);

/** 듬성듬성 정의한 행 객체를 32행짜리 스프라이트로 채웁니다. */
export function pad(rows) {
  const out = [];
  for (let y = 0; y < SIZE; y++) {
    out.push(rows[y] !== undefined ? rows[y] : EMPTY_ROW);
  }
  return out;
}

/** 가변 스프라이트를 만들 때 쓰는 쓰기 가능한 버퍼입니다. */
export function buffer() {
  return {};
}

export function put(buf, x, y, ch) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  if (!buf[y]) buf[y] = EMPTY_ROW;
  buf[y] = buf[y].substring(0, x) + ch + buf[y].substring(x + 1);
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

  for (let guard = 0; guard < SIZE * 2; guard++) {
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
 * 다른 팔레트로 블릿할 때 씁니다.
 */
export function sliceRows(sprite, fromY, toY) {
  const out = [];
  for (let y = 0; y < SIZE; y++) {
    out.push(y >= fromY && y <= toY ? sprite[y] : EMPTY_ROW);
  }
  return out;
}

/**
 * 스프라이트 한 장을 캔버스에 찍습니다.
 * palette 에 없는 문자와 '.' 은 투명으로 건너뜁니다.
 */
export function blit(ctx, sprite, palette) {
  for (let y = 0; y < SIZE; y++) {
    const row = sprite[y];
    if (!row) continue;
    for (let x = 0; x < SIZE; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
