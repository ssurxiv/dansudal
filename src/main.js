/*!
 * 단수달 (Knitting Companion)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 */

import { Companion } from './engine.js';
import { SIGNATURE } from './sprites.js';
import { STASH } from './stash.js';

console.info(
  `%c단수달 — © 2026 ${SIGNATURE}\n무단 재배포를 금합니다. LICENSE.txt 참조.`,
  'color:#3f7266;font-weight:600'
);

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const wearBtn = $('wear');
const addBtn = $('add');
const ripBtn = $('rip');
const windBtn = $('wind');
const swapBtn = $('swap');
const stashPanel = $('stash');
const resetBtn = $('reset');

const companion = new Companion(canvas, {
  target: 20,
  yarn: 12,
  color: STASH[0].color,
  onChange(s) {
    $('rows').textContent = s.rows;
    $('usedBall').textContent = s.usedBall;
    $('percent').textContent = `${s.percent}%`;
    $('bar').style.width = `${s.percent}%`;
    wearBtn.hidden = !s.finished;
    wearBtn.textContent = s.wearing ? '벗기' : '입어보기';
    // 완성 후에는 뜨기/풀기/감기/실 교체가 의미 없으니 입어보기·새로 뜨기만 남깁니다.
    addBtn.hidden = ripBtn.hidden = windBtn.hidden = swapBtn.hidden = s.finished;
    if (s.finished) stashPanel.hidden = true;
    resetBtn.textContent = s.finished ? '새로 뜨기' : '초기화';
  },
  onStatus(text) {
    $('status').textContent = text;
  }
});

addBtn.addEventListener('click', () => companion.addRow());
ripBtn.addEventListener('click', () => companion.ripRow());
windBtn.addEventListener('click', () => companion.wind());

// 실 창고 — 지금은 색상만, 나중에 실제 실 제품으로 바뀔 자리.
// 최근에 고른 색이 맨 앞으로 오도록 순서를 바꿔가며 다시 그립니다.
const stashGrid = $('stashGrid');
let stashOrder = [...STASH];

function renderStash() {
  stashGrid.innerHTML = '';
  stashOrder.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = i === 0 ? 'swatch recent' : 'swatch';
    // background-color 만 바꿔서 CSS의 실뭉치 광택 그레이디언트가 안 지워지게.
    btn.style.backgroundColor = item.color;
    btn.setAttribute('aria-label', item.name);
    btn.title = item.name;
    btn.addEventListener('click', () => {
      companion.swapYarn(item.color);
      stashOrder = [item, ...stashOrder.filter((x) => x !== item)];
      stashPanel.hidden = true;
      renderStash();
    });
    stashGrid.appendChild(btn);
    if (i === 0 && stashOrder.length > 1) {
      const divider = document.createElement('span');
      divider.className = 'stash-divider';
      stashGrid.appendChild(divider);
    }
  });
}
renderStash();

swapBtn.addEventListener('click', () => {
  stashPanel.hidden = !stashPanel.hidden;
});

wearBtn.addEventListener('click', () => {
  if (companion.state === 'wearing') companion.takeOff();
  else companion.tryOn();
});
$('target').addEventListener('input', (e) => {
  companion.setTarget(parseInt(e.target.value, 10));
});
// 목표 단수는 항상 값이 있어야 하니, 비워둔 채 포커스를 벗어나면
// 마지막으로 유효했던 값(기본 20)으로 되돌립니다.
$('target').addEventListener('blur', (e) => {
  const value = parseInt(e.target.value, 10);
  if (!Number.isFinite(value) || value < 1) e.target.value = companion.target;
});
resetBtn.addEventListener('click', () => {
  const prompt = resetBtn.textContent === '새로 뜨기'
    ? '지금 뜨개는 그만두고 새로 시작할까요?'
    : '진행 상황을 처음으로 되돌릴까요?';
  if (window.confirm(prompt)) companion.reset();
});

// 캐릭터 확대/축소. 32px 원본을 CSS 폭으로만 키우므로 pixelated 를 유지합니다.
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;
let zoom = 1;
try {
  const saved = Number(localStorage.getItem('knit-zoom'));
  if (Number.isFinite(saved) && saved >= ZOOM_MIN && saved <= ZOOM_MAX) zoom = saved;
} catch { /* 프라이빗 창 등에서는 무시 */ }

function applyZoom() {
  document.documentElement.style.setProperty('--zoom', zoom.toFixed(2));
  try { localStorage.setItem('knit-zoom', zoom); } catch { /* 무시 */ }
}
applyZoom();

$('zoomIn').addEventListener('click', () => {
  zoom = Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2));
  applyZoom();
});
$('zoomOut').addEventListener('click', () => {
  zoom = Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2));
  applyZoom();
});

// 뜨개하면서 화면을 볼 수 없을 때를 위한 단축키.
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); companion.addRow(); }
  if (e.code === 'Backspace') { e.preventDefault(); companion.ripRow(); }
  if (e.code === 'KeyW') { e.preventDefault(); companion.wind(); }
});

companion.start();
