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

// 진행 그리드 — 칸 크기는 고정이고, 카드 너비에 들어가는 만큼 한
// 줄에 채운 뒤 다음 줄로 넘어갑니다(일반 텍스트 줄바꿈과 같은
// row-major 흐름). GitHub 잔디의 "여러 주(열)로 쌓이는" 방식 대신
// 이 편이 "목표 단수 = 칸 개수"가 항상 정확히 맞고, 계산도 훨씬
// 단순합니다.
const GRID_GAP = 3;
const GRID_CELL = 15;

const SVG_NS = 'http://www.w3.org/2000/svg';

// 물고기 몸통·꼬리 좌표. index.html 상단의 공유 <clipPath id="fishClip">
// 가 명암용 사각형을 이 모양대로 잘라내야 하니, 좌표를 바꾸면 거기도
// 반드시 같이 바꿔야 합니다.
const FISH_BODY_D = 'M3,12 C3,6.2 9,5 13,6 C16,6.8 16.5,9.6 16.5,12 C16.5,14.4 16,17.2 13,18 C9,19 3,17.8 3,12 Z';
const FISH_TAIL_POINTS = '16,12 22,7 22,17';

/**
 * 캐릭터가 수달이라 네모 대신 물고기 한 마리 = 한 단. 뒤로 갈수록
 * 얇아지는 몸통(머리 쪽은 둥글고 두껍게, 꼬리 쪽은 홀쭉하게) + 작은
 * 삼각 꼬리 + 아래쪽 절반을 살짝 어둡게 칠한 명암 + 눈으로 구성됩니다.
 * 몸통·꼬리는 currentColor 라, 실제 색은 이 함수가 아니라 렌더링
 * 쪽에서 svg.style.color 로 입힙니다. 눈은 알림 종류에 따라
 * setEyeShape() 가 매 렌더마다 다시 그립니다.
 */
function makeFishCell() {
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
  setEyeShape(svg, 'circle');
  return svg;
}

/**
 * 눈 모양을 갱신합니다 — 평소엔 동그라미, 코 줄임 단은 ^, 코 늘림
 * 단은 V. 배경색으로 "구멍"을 뚫는 방식이라(칠하는 게 아니라
 * stroke/fill 을 배경색으로) 어떤 실 색이 와도 또렷하게 보입니다.
 */
function setEyeShape(svg, shape) {
  const old = svg.querySelector('.fish-eye');
  if (old) old.remove();

  let eye;
  if (shape === 'up' || shape === 'down') {
    eye = document.createElementNS(SVG_NS, 'path');
    eye.setAttribute('d', shape === 'up' ? 'M4,11.8 L5.6,9.6 L7.2,11.8' : 'M4,9.6 L5.6,11.8 L7.2,9.6');
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

/**
 * 진행 막대 대신 물고기 그리드 — 물고기 한 마리가 한 단, 목표를
 * 초과 달성했으면 그만큼 늘립니다(그래서 칸 개수는 항상 정확히
 * max(target, rows)). 색은 companion.colorForRow() 로 얻습니다
 * (실제 실 교체 이력을 캐릭터 완성품 줄무늬와 같은 기준으로 반영).
 * 이미 뜬 단에 코 줄임/코 늘림 알림이 걸려 있었으면 그 단의 눈
 * 모양을 ^/V 로 바꿔 어떤 기법을 썼는지 한눈에 보이게 합니다.
 */
function renderRowGrid(rows, target) {
  const total = Math.max(target, rows);
  const containerWidth = rowGrid.parentElement.clientWidth || 300;
  const cols = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_CELL + GRID_GAP)));

  rowGrid.style.gridTemplateColumns = `repeat(${cols}, ${GRID_CELL}px)`;
  rowGrid.style.gap = `${GRID_GAP}px`;

  if (rowGrid.childElementCount !== total) {
    rowGrid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      rowGrid.appendChild(makeFishCell());
    }
  }
  const cells = rowGrid.children;
  for (let i = 0; i < total; i++) {
    const knitRow = i + 1;
    const filled = knitRow <= rows;
    cells[i].style.color = filled ? companion.colorForRow(knitRow) : 'var(--line)';

    const messages = filled ? companion.notesForRow(knitRow).map((n) => n.message) : [];
    const shape = messages.some((m) => m.includes('코 줄임')) ? 'up'
      : messages.some((m) => m.includes('코 늘림')) ? 'down'
      : 'circle';
    setEyeShape(cells[i], shape);
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
