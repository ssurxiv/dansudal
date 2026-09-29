/*!
 * 함뜨마을 동물 친구들 — 컨셉 전환 골격
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 폴더 인덱스처럼 위 탭을 눌러 대바늘+수달(단수달)과 코바늘+토끼
 * (코토키) 사이를 전환합니다. 이 파일은 순수하게 "어느 패널을
 * 보여줄지"만 다루고, 각 컨셉의 실제 로직(main.js / rabbit-main.js)
 * 과는 DOM(hidden 속성)으로만 느슨하게 연결됩니다.
 */

const tabs = document.querySelectorAll('.concept-tab');
const panels = {
  otter: document.getElementById('panel-otter'),
  rabbit: document.getElementById('panel-rabbit')
};
const hintEl = document.getElementById('shortcutHint');

const TITLES = {
  otter: '단수달 🦦 · 함뜨마을 동물 친구들',
  rabbit: '코토키 🐰 · 함뜨마을 동물 친구들'
};
// 두 컨셉의 조작 문구는 완전히 같습니다(단수달과 동일하게 유지).
const HINT_TEXT = '스페이스바로 한 단 추가, 백스페이스로 한 단 풀기, W로 실 감기';
const HINTS = { otter: HINT_TEXT, rabbit: HINT_TEXT };

const STORAGE_KEY = 'knit:concept';

function activate(concept, { persist = true } = {}) {
  if (!panels[concept]) return;
  document.documentElement.dataset.concept = concept;
  Object.entries(panels).forEach(([key, el]) => { el.hidden = key !== concept; });
  tabs.forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.concept === concept));
  });
  document.title = TITLES[concept];
  if (hintEl) hintEl.textContent = HINTS[concept];
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, concept); } catch { /* 무시 */ }
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activate(tab.dataset.concept));
});

let initial = 'otter';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'otter' || saved === 'rabbit') initial = saved;
} catch { /* 무시 */ }

activate(initial, { persist: false });
