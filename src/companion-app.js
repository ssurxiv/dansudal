/*!
 * 단수달 / 코토키 — 공용 앱 셸
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 두 컨셉(단수달/코토키)은 구조·기능·화면 배치가 완전히 같고, 실제로
 * 다른 건 캐릭터 생김새(스프라이트 팩)·진행 그리드 칸 모양(물고기/
 * 당근)·"단/코" 같은 직접적인 문구뿐입니다. 그 차이만 config 로 받고
 * 나머지 DOM 배선(뜨기/풀기/감기/실 교체/알림/입어보기/확대축소/
 * 저장)은 이 파일 하나에만 둡니다 — otter/main.js, rabbit/main.js는
 * 이 함수를 각자의 config 로 호출하는 얇은 진입점일 뿐입니다.
 */

import { Companion } from './engine.js';
import { STASH } from './stash.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_GAP = 4;
const GRID_CELL = 24;

/**
 * @param {object} cfg
 * @param {string} cfg.panelId        패널 <section> id (예: 'panel-otter')
 * @param {string} cfg.prefix         이 컨셉의 id 접두사 (otter는 '', 코토키는 'r-')
 * @param {string} cfg.unit           '단' | '코' — 몇몇 생성 문구에만 씁니다
 * @param {string} cfg.storageKey     localStorage 진행 상황 저장 키
 * @param {string} cfg.zoomStorageKey localStorage 확대 배율 저장 키
 * @param {Element} cfg.zoomTarget    --zoom CSS 변수를 세팅할 대상
 * @param {object} cfg.sprites        engine.js Companion 에 주입할 스프라이트 팩
 * @param {{create():SVGElement, setShape(el:SVGElement, shape:string):void}} cfg.cellKit
 *   진행 그리드 칸 하나를 그리는 방법(물고기/당근). 칸 배치·채움 로직은 공용입니다.
 * @param {string} [cfg.wearIcon]     입어보기/벗기 버튼 아이콘. 완성품이
 *   컨셉마다 달라서(단수달 목도리, 코토키 비니) 기본은 목도리입니다.
 * @param {string} cfg.bannerText     콘솔 배너 문구
 * @param {string} cfg.bannerColor    콘솔 배너 색
 */
export function mountCompanionApp(cfg) {
  const { panelId, prefix, unit, storageKey, zoomStorageKey, zoomTarget, sprites, cellKit } = cfg;
  const wearIcon = cfg.wearIcon ?? '🧣';

  console.info(
    `%c${cfg.bannerText}`,
    `color:${cfg.bannerColor};font-weight:600`
  );

  const $ = (id) => document.getElementById(prefix + id);
  const panel = document.getElementById(panelId);
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
  const noteTypeName = `${prefix}noteType`;

  function setStatus(text, kind = 'chat') {
    statusEl.textContent = text; // 화면에는 안 보임(.sr-only), 스크린리더용
    bubbleEl.textContent = text;
    bubbleEl.className = `speech-bubble kind-${kind}`;
  }

  /* ── 진행 그리드 ──────────────────────────────────────── */
  /* 칸 모양(cellKit)만 컨셉마다 다르고, 배치·채움 로직은 공용입니다. */

  function renderRowGrid(rows, target) {
    const total = Math.max(target, rows);
    const containerWidth = rowGrid.parentElement.clientWidth || 300;
    const cols = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_CELL + GRID_GAP)));

    rowGrid.style.gridTemplateColumns = `repeat(${cols}, ${GRID_CELL}px)`;
    rowGrid.style.gap = `${GRID_GAP}px`;

    if (rowGrid.childElementCount !== total) {
      rowGrid.innerHTML = '';
      for (let i = 0; i < total; i++) rowGrid.appendChild(cellKit.create());
    }
    const cells = rowGrid.children;
    for (let i = 0; i < total; i++) {
      const knitRow = i + 1;
      const filled = knitRow <= rows;
      cells[i].style.color = filled ? companion.colorForRow(knitRow) : 'var(--line)';

      const messages = filled ? companion.notesForRow(knitRow).map((n) => n.message) : [];
      const shape = messages.some((m) => m.includes('코 줄임')) ? 'up'
        : messages.some((m) => m.includes('코 늘림')) ? 'down'
        : messages.some((m) => m.includes('꽈배기')) ? 'x'
        : 'circle';
      cellKit.setShape(cells[i], shape);
    }
  }

  let lastSnapshot = null;

  /* ── 저장 ─────────────────────────────────────────────── */

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
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
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch { /* 용량 초과·차단. 무시하고 계속 동작한다 */ }
    }, 400);
  }

  const companion = new Companion(canvas, {
    sprites,
    target: 20,
    yarn: 12,
    color: STASH[0].color,
    onPersist: saveState,
    onChange(s) {
      lastSnapshot = s;
      $('rows').textContent = s.rows;
      $('usedBall').textContent = s.usedBall;
      if (document.activeElement !== totalBallInput) {
        totalBallInput.value = s.totalBall ?? '';
      }
      $('percent').textContent = `${s.percent}%`;
      renderRowGrid(s.rows, s.target);
      noteToInput.placeholder = `끝 ${unit}(기본 ${s.target})`;
      wearBtn.hidden = !s.finished;
      wearBtn.textContent = `${wearIcon} ${s.wearing ? '벗기' : '입어보기'}`;
      addBtn.hidden = ripBtn.hidden = windBtn.hidden = swapBtn.hidden = notesToggleBtn.hidden = s.finished;
      // 동작이 재생되는 동안에는 다른 동작을 못 시작하게 잠급니다 —
      // 겹쳐 부르면 enter() 가 진행 중이던 애니메이션을 처음부터
      // 되돌려서, 뜨는 시늉만 하고 실제로는 씹히는 조작이 생깁니다.
      [addBtn, ripBtn, windBtn, swapBtn, wearBtn, resetBtn].forEach((btn) => {
        btn.disabled = s.busy;
      });
      if (s.finished) {
        stashPanel.hidden = true;
        notesPanel.hidden = true;
      }
      renderNotesList(s.notes);
    },
    onStatus: setStatus
  });

  companion.restore(loadState());

  /* 탭이 숨겨진 상태(display:none)로 처음 그려질 때는 clientWidth가
     0이라 열 수가 잘못 계산됩니다. 탭이 열려 실제 너비가 잡히는
     순간(= 크기 변화)에 다시 계산해 바로잡습니다. */
  new ResizeObserver(() => {
    if (lastSnapshot) renderRowGrid(lastSnapshot.rows, lastSnapshot.target);
  }).observe(rowGrid.parentElement);

  addBtn.addEventListener('click', () => companion.addRow());
  ripBtn.addEventListener('click', () => companion.ripRow());
  windBtn.addEventListener('click', () => companion.wind());

  ballPlusBtn.addEventListener('click', () => companion.setUsedBall(lastSnapshot.usedBall + 1));
  ballMinusBtn.addEventListener('click', () => companion.setUsedBall(lastSnapshot.usedBall - 1));
  totalBallInput.addEventListener('change', (e) => {
    const raw = e.target.value.trim();
    companion.setTotalBall(raw === '' ? null : parseInt(raw, 10));
  });

  /* ── 실 창고 ──────────────────────────────────────────── */

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

  /* ── 단수 알림 ────────────────────────────────────────── */

  let editingNoteId = null;

  function updateNoteRangeVisibility() {
    const type = noteForm.querySelector(`input[name="${noteTypeName}"]:checked`).value;
    noteRangeFields.hidden = type !== 'every';
  }
  noteForm.querySelectorAll(`input[name="${noteTypeName}"]`).forEach((radio) => {
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
    noteForm.querySelector(`input[name="${noteTypeName}"][value="${type}"]`).checked = true;
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
        label = `${note.row}${unit}`;
      } else if (note.from != null || note.to != null) {
        label = `${note.from ?? 1}~${note.to ?? '끝'}${unit}, 매 ${note.every}${unit}`;
      } else {
        label = `매 ${note.every}${unit}`;
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
    const type = noteForm.querySelector(`input[name="${noteTypeName}"]:checked`).value;
    const num = parseInt(noteNumberInput.value, 10);
    const message = noteMessageInput.value.trim();
    const fromRaw = noteFromInput.value.trim();
    const toRaw = noteToInput.value.trim();
    const input = type === 'row'
      ? { row: num, every: null, message }
      : {
        row: null,
        every: num,
        from: fromRaw === '' ? null : parseInt(fromRaw, 10),
        to: toRaw === '' ? null : parseInt(toRaw, 10),
        message
      };

    const ok = editingNoteId
      ? companion.updateNote(editingNoteId, input)
      : companion.addNote(input) !== null;

    if (ok) resetNoteForm();
    else setStatus(`알림을 확인해주세요 (${unit}수와 알림 내용을 입력하세요)`);
  });

  /* ── 입어보기 / 새로 뜨기 ─────────────────────────────── */

  wearBtn.addEventListener('click', () => {
    if (companion.state === 'wearing') companion.takeOff();
    else companion.tryOn();
  });
  $('target').addEventListener('change', (e) => {
    companion.setTarget(parseInt(e.target.value, 10));
  });
  $('target').addEventListener('blur', (e) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isFinite(value) || value < 1) e.target.value = companion.target;
  });
  resetBtn.addEventListener('click', () => {
    const prompt = lastSnapshot?.finished
      ? '지금 뜨개는 그만두고 새로 시작할까요?'
      : '진행 상황을 처음으로 되돌릴까요?';
    if (window.confirm(prompt)) companion.reset();
  });

  /* ── 확대/축소 ────────────────────────────────────────── */

  const ZOOM_MIN = 0.7;
  const ZOOM_MAX = 2;
  const ZOOM_STEP = 0.15;
  let zoom = 1;
  try {
    const saved = Number(localStorage.getItem(zoomStorageKey));
    if (Number.isFinite(saved) && saved >= ZOOM_MIN && saved <= ZOOM_MAX) zoom = saved;
  } catch { /* 프라이빗 창 등에서는 무시 */ }

  function applyZoom() {
    zoomTarget.style.setProperty('--zoom', zoom.toFixed(2));
    try { localStorage.setItem(zoomStorageKey, zoom); } catch { /* 무시 */ }
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

  /* ── 단축키 ───────────────────────────────────────────── */
  /* 다른 컨셉 탭이 활성일 때(이 패널이 hidden)는 반응하지 않습니다 —
     두 패널이 같은 문서에 동시에 존재하기 때문입니다. */

  document.addEventListener('keydown', (e) => {
    if (panel.hidden) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); companion.addRow(); }
    if (e.code === 'Backspace') { e.preventDefault(); companion.ripRow(); }
    if (e.code === 'KeyW') { e.preventDefault(); companion.wind(); }
  });

  companion.start();

  return companion;
}
