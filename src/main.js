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
const ballMinusBtn = $('ballMinus');
const ballPlusBtn = $('ballPlus');
const totalBallInput = $('totalBall');
const notesToggleBtn = $('notesToggle');
const notesPanel = $('notesPanel');
const notesList = $('notesList');
const noteForm = $('noteForm');
const noteNumberInput = $('noteNumber');
const noteMessageInput = $('noteMessage');
const noteRangeFields = $('noteRange');
const noteFromInput = $('noteFrom');
const noteToInput = $('noteTo');
const noteSubmitBtn = $('noteSubmit');
const noteCancelBtn = $('noteCancel');
const bubbleEl = $('bubble');
const statusEl = $('status');
const rowGrid = $('rowGrid');

/**
 * 캐릭터의 말풍선(+스크린리더용 상태줄)을 갱신합니다. kind 'chat'은
 * 평소 멘트, 'note'는 단수 알림 — 말풍선 색으로 구분됩니다.
 */
function setStatus(text, kind = 'chat') {
  statusEl.textContent = text; // 화면에는 안 보임(.sr-only), 스크린리더용
  bubbleEl.textContent = text;
  bubbleEl.className = `speech-bubble kind-${kind}`;
}

// 진행 그리드 칸 크기·모양 계산에 쓰는 값들. 폭(containerWidth)과
// 높이 예산(GRID_HEIGHT_BUDGET) 두 방향을 같이 맞춰서, 목표가 작아
// 열이 적어져도 칸을 키워 가로를 마저 채우게 합니다 — 예전엔 칸
// 크기 상한이 낮아 작은 목표에서 그리드 오른쪽이 텅 비어 보였습니다.
const GRID_GAP = 4;
const GRID_MIN_CELL = 7;
const GRID_MAX_CELL = 44;
const GRID_MIN_ROWS = 2;
const GRID_MAX_ROWS = 14;
const GRID_HEIGHT_BUDGET = 100;

/**
 * 목표 단수(target)와 컨테이너 너비에 맞춰 격자 모양(행·열)과 칸
 * 크기를 정합니다. 목표*컨테이너너비/높이예산 의 제곱근을 이상적인
 * 열 수로 삼아, 그 근처에서 목표를 정확히 나누는 열 수를 찾습니다
 * (못 찾으면 반올림으로 대체 — 이때는 칸이 1~2개 남을 수 있습니다).
 * 칸 크기는 "폭 기준으로 계산한 크기"와 "높이 예산 기준으로 계산한
 * 크기" 중 더 작은 쪽을 씁니다 — 어느 한쪽이 넘치지 않으면서 폭을
 * 최대한 채우게 됩니다.
 */
function computeGridShape(target, containerWidth) {
  const idealCols = Math.max(1, Math.round(Math.sqrt((target * containerWidth) / GRID_HEIGHT_BUDGET)));
  let cols = null;
  let rows = null;
  for (let d = 0; d <= 4 && cols === null; d++) {
    for (const c of d === 0 ? [idealCols] : [idealCols - d, idealCols + d]) {
      if (c < 1 || target % c !== 0) continue;
      const r = target / c;
      if (r < GRID_MIN_ROWS || r > GRID_MAX_ROWS) continue;
      cols = c;
      rows = r;
      break;
    }
  }
  if (cols === null) {
    rows = Math.min(GRID_MAX_ROWS, Math.max(GRID_MIN_ROWS, Math.ceil(target / idealCols)));
    cols = Math.ceil(target / rows);
  }
  const byWidth = (containerWidth - (cols - 1) * GRID_GAP) / cols;
  const byHeight = (GRID_HEIGHT_BUDGET - (rows - 1) * GRID_GAP) / rows;
  const cellSize = Math.min(GRID_MAX_CELL, Math.max(GRID_MIN_CELL, Math.floor(Math.min(byWidth, byHeight))));
  return { rows, cols, cellSize };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 캐릭터가 수달이라 네모 대신 물고기 한 마리 = 한 단. 몸통 + 갈래
 * 꼬리 + 등지느러미 + 눈(배경색으로 뚫은 구멍)으로 좀 더 물고기답게
 * 그렸습니다. 몸통·꼬리·지느러미는 currentColor 라, 실제 색은 이
 * 함수가 아니라 렌더링 쪽에서 svg.style.color 로 입힙니다.
 */
function makeFishCell() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('row-cell');

  const body = document.createElementNS(SVG_NS, 'ellipse');
  body.setAttribute('cx', '10');
  body.setAttribute('cy', '13');
  body.setAttribute('rx', '7');
  body.setAttribute('ry', '6');
  body.setAttribute('fill', 'currentColor');

  // 갈래 꼬리 — 평평한 삼각형보다 물고기답게, 가운데를 안쪽으로 판 V자.
  const tail = document.createElementNS(SVG_NS, 'path');
  tail.setAttribute('d', 'M16,13 L23,5 L19,13 L23,21 Z');
  tail.setAttribute('fill', 'currentColor');

  const fin = document.createElementNS(SVG_NS, 'path');
  fin.setAttribute('d', 'M8,7 L11,1 L13,7 Z');
  fin.setAttribute('fill', 'currentColor');

  // 눈 — 몸통 색으로 채우는 대신 배경색으로 "구멍"을 뚫어서, 어떤
  // 실 색이 와도 항상 또렷하게 보이게 합니다.
  const eye = document.createElementNS(SVG_NS, 'circle');
  eye.setAttribute('cx', '5.5');
  eye.setAttribute('cy', '11');
  eye.setAttribute('r', '1.3');
  eye.style.fill = 'var(--paper)';

  svg.append(body, tail, fin, eye);
  return svg;
}

/**
 * 진행 막대 대신 물고기 그리드(GitHub 잔디 컨셉을 캐릭터에 맞게) —
 * 물고기 한 마리가 한 단. 목표를 초과 달성했으면 그만큼 늘립니다.
 * 색은 companion.colorForRow() 로 얻습니다(실제 실 교체 이력을
 * 캐릭터 완성품 줄무늬와 같은 기준으로 반영).
 */
function renderRowGrid(rows, target) {
  const containerWidth = rowGrid.parentElement.clientWidth || 300;
  const { rows: gridRows, cols: gridCols, cellSize } = computeGridShape(target, containerWidth);
  // 목표만큼의 칸(gridRows*gridCols)이 기본이고, 초과 달성한 단수만큼만
  // 그 뒤에 더 붙입니다 — 모양 계산 자체는 항상 target 기준입니다.
  const total = Math.max(gridRows * gridCols, rows);

  rowGrid.style.gridTemplateRows = `repeat(${gridRows}, ${cellSize}px)`;
  rowGrid.style.gridAutoColumns = `${cellSize}px`;
  rowGrid.style.gap = `${GRID_GAP}px`;

  if (rowGrid.childElementCount !== total) {
    rowGrid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      rowGrid.appendChild(makeFishCell());
    }
  }
  const cells = rowGrid.children;
  for (let i = 0; i < total; i++) {
    cells[i].style.color = i < rows ? companion.colorForRow(i + 1) : 'var(--line)';
  }
}

// UI는 Companion 내부를 직접 읽지 않으므로, ± 버튼이 현재 usedBall
// 값을 알아야 할 때 쓰도록 최근 snapshot 을 여기 보관해둡니다.
let lastSnapshot = null;

// 진행 상황 저장 — Companion 은 localStorage 를 모르므로, main.js 가
// 어댑터 역할을 합니다. 엔진은 "바뀌었다"만 알리고(onPersist), 실제
// 쓰기는 여기서 디바운스해서 처리합니다.
const STORAGE_KEY = 'dansudal:state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // 시크릿 모드·파싱 실패 등
  }
}

let saveTimer = null;
function saveState(data) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* 용량 초과·차단. 무시하고 계속 동작한다 */ }
  }, 400);
}

const companion = new Companion(canvas, {
  target: 20,
  yarn: 12,
  color: STASH[0].color,
  onPersist: saveState,
  onChange(s) {
    lastSnapshot = s;
    $('rows').textContent = s.rows;
    $('usedBall').textContent = s.usedBall;
    // 사용자가 지금 타이핑 중인 입력을 덮어쓰지 않도록 건너뜁니다.
    if (document.activeElement !== totalBallInput) {
      totalBallInput.value = s.totalBall ?? '';
    }
    $('percent').textContent = `${s.percent}%`;
    renderRowGrid(s.rows, s.target);
    // 알림 폼의 "끝 단" 기본값 안내 — 비워두면 이 값(현재 목표 단수)으로 취급됩니다.
    noteToInput.placeholder = `끝 단(기본 ${s.target})`;
    wearBtn.hidden = !s.finished;
    wearBtn.textContent = s.wearing ? '🧣 벗기' : '🧣 입어보기';
    // 완성 후에는 뜨기/풀기/감기/실 교체/알림이 의미 없으니 입어보기·새로 뜨기만 남깁니다.
    addBtn.hidden = ripBtn.hidden = windBtn.hidden = swapBtn.hidden = notesToggleBtn.hidden = s.finished;
    if (s.finished) {
      stashPanel.hidden = true;
      notesPanel.hidden = true;
    }
    renderNotesList(s.notes);
  },
  onStatus: setStatus
});

companion.restore(loadState());

addBtn.addEventListener('click', () => companion.addRow());
ripBtn.addEventListener('click', () => companion.ripRow());
windBtn.addEventListener('click', () => companion.wind());

ballPlusBtn.addEventListener('click', () => companion.setUsedBall(lastSnapshot.usedBall + 1));
ballMinusBtn.addEventListener('click', () => companion.setUsedBall(lastSnapshot.usedBall - 1));
// 보유 볼 수는 선택 입력이라 비워두면 null 을 허용합니다.
// TASK-1과 같은 이유로 input 이 아니라 change 를 씁니다.
totalBallInput.addEventListener('change', (e) => {
  const raw = e.target.value.trim();
  companion.setTotalBall(raw === '' ? null : parseInt(raw, 10));
});

// 실 창고 — 지금은 색상만, 나중에 실제 실 제품으로 바뀔 자리.
// 최근에 고른 색이 맨 앞으로 오도록 순서를 바꿔가며 다시 그립니다.
// 한 줄에 1개(최근) | 4개 | 4개로 구분선을 나눠 담습니다.
const stashGrid = $('stashGrid');
let stashOrder = [...STASH];

function chunkGroups(items, sizes) {
  const groups = [];
  let i = 0;
  let s = 0;
  while (i < items.length) {
    const size = sizes[Math.min(s, sizes.length - 1)];
    groups.push(items.slice(i, i + size));
    i += size;
    s += 1;
  }
  return groups;
}

function renderStash() {
  stashGrid.innerHTML = '';
  const groups = chunkGroups(stashOrder, [1, 4]);
  groups.forEach((groupItems, gi) => {
    groupItems.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = item === stashOrder[0] ? 'swatch recent' : 'swatch';
      // background-color 만 바꿔서 CSS의 실뭉치 사선 무늬가 안 지워지게.
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
    });
    if (gi < groups.length - 1) {
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

// 단수 알림 — 특정 단/N단마다 말풍선으로 알려줄 목록. 목록 렌더링은
// onChange 안에서 매번 다시 그리므로(위 참조), 여기는 패널 토글과
// 추가/수정/삭제 폼 연결만 담당합니다.
let editingNoteId = null;

// 특정 단(row)은 구간 개념이 없고, 매 N단(every)만 시작~끝 구간을
// 받으니 라디오 선택에 따라 그 입력줄을 보였다 숨겼다 합니다.
function updateNoteRangeVisibility() {
  const type = noteForm.querySelector('input[name="noteType"]:checked').value;
  noteRangeFields.hidden = type !== 'every';
}
noteForm.querySelectorAll('input[name="noteType"]').forEach((radio) => {
  radio.addEventListener('change', updateNoteRangeVisibility);
});
updateNoteRangeVisibility();

function resetNoteForm() {
  editingNoteId = null;
  noteForm.reset();
  noteSubmitBtn.textContent = '추가';
  noteCancelBtn.hidden = true;
  updateNoteRangeVisibility();
}

function startEditNote(note) {
  editingNoteId = note.id;
  const type = note.row != null ? 'row' : 'every';
  noteForm.querySelector(`input[name="noteType"][value="${type}"]`).checked = true;
  noteNumberInput.value = note.row ?? note.every;
  noteMessageInput.value = note.message;
  noteFromInput.value = note.from ?? '';
  noteToInput.value = note.to ?? '';
  noteSubmitBtn.textContent = '수정';
  noteCancelBtn.hidden = false;
  notesPanel.hidden = false;
  updateNoteRangeVisibility();
}

function renderNotesList(notes) {
  notesList.innerHTML = '';
  notes.forEach((note) => {
    const li = document.createElement('li');
    let label;
    if (note.row != null) {
      label = `${note.row}단`;
    } else if (note.from != null || note.to != null) {
      // 구간을 지정했을 때만 범위를 같이 보여줍니다 — 기본(1~총 단수)
      // 그대로면 굳이 안 보여줘도 "매 N단"만으로 충분합니다.
      label = `${note.from ?? 1}~${note.to ?? '끝'}단, 매 ${note.every}단`;
    } else {
      label = `매 ${note.every}단`;
    }

    const text = document.createElement('span');
    text.className = 'note-text';
    text.textContent = `${label}: ${note.message}`;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', '알림 수정');
    editBtn.addEventListener('click', () => startEditNote(note));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '🗑️';
    delBtn.setAttribute('aria-label', '알림 삭제');
    delBtn.addEventListener('click', () => {
      companion.removeNote(note.id);
      if (editingNoteId === note.id) resetNoteForm();
    });

    const actions = document.createElement('span');
    actions.className = 'note-actions';
    actions.append(editBtn, delBtn);

    li.append(text, actions);
    notesList.appendChild(li);
  });
}

notesToggleBtn.addEventListener('click', () => {
  notesPanel.hidden = !notesPanel.hidden;
});

noteForm.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => { noteMessageInput.value = btn.dataset.msg; });
});

noteCancelBtn.addEventListener('click', resetNoteForm);

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const type = noteForm.querySelector('input[name="noteType"]:checked').value;
  const num = parseInt(noteNumberInput.value, 10);
  const message = noteMessageInput.value.trim();
  const fromRaw = noteFromInput.value.trim();
  const toRaw = noteToInput.value.trim();
  const input = type === 'row'
    ? { row: num, every: null, message }
    : {
      row: null,
      every: num,
      // 비워두면 null → engine 쪽에서 1/현재 목표 단수로 취급합니다.
      from: fromRaw === '' ? null : parseInt(fromRaw, 10),
      to: toRaw === '' ? null : parseInt(toRaw, 10),
      message
    };

  const ok = editingNoteId
    ? companion.updateNote(editingNoteId, input)
    : companion.addNote(input) !== null;

  if (ok) resetNoteForm();
  else setStatus('알림을 확인해주세요 (단수와 알림 내용을 입력하세요)');
});

wearBtn.addEventListener('click', () => {
  if (companion.state === 'wearing') companion.takeOff();
  else companion.tryOn();
});
// 타이핑 도중의 중간값(1, 10...)으로 상태 기계를 흔들지 않도록
// input 대신 change(포커스 이탈·엔터 시 1회)에서 커밋합니다.
$('target').addEventListener('change', (e) => {
  companion.setTarget(parseInt(e.target.value, 10));
});
// 목표 단수는 항상 값이 있어야 하니, 비워둔 채 포커스를 벗어나면
// 마지막으로 유효했던 값(기본 20)으로 되돌립니다.
$('target').addEventListener('blur', (e) => {
  const value = parseInt(e.target.value, 10);
  if (!Number.isFinite(value) || value < 1) e.target.value = companion.target;
});
// 버튼 문구는 "새로 뜨기"로 통일하지만, 완성 전/후로 실제로 되돌리는
// 대상이 다르니(진행 중인 작업 vs 완성한 결과물) 확인 문구는 그대로 구분합니다.
resetBtn.addEventListener('click', () => {
  const prompt = lastSnapshot?.finished
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
