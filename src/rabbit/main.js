/*!
 * 코토키 (Crochet Companion)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 실제 배선은 companion-app.js 하나에 공용으로 있습니다. 이 파일은
 * 코토키만의 것(스프라이트 팩, 저장 키, 당근 그리드, "코" 문구)만
 * config 로 넘기는 얇은 진입점입니다.
 */

import { mountCompanionApp } from '../companion-app.js';
import * as R from './sprites.js';
import * as carrotCell from './carrot-cell.js';

mountCompanionApp({
  panelId: 'panel-rabbit',
  prefix: 'r-',
  unit: '단', // 코바늘도 대바늘처럼 단/코 개념이 다 있어서, 버튼·문구는 단수달과 동일하게 유지
  storageKey: 'kobato:state',
  zoomStorageKey: 'kobato-zoom',
  zoomTarget: document.getElementById('panel-rabbit'),
  sprites: R,
  cellKit: carrotCell,
  wearIcon: '🧢', // 코토키의 완성품은 목도리가 아니라 비니입니다

  bannerText: '코토키 — © 2026 @tteoboja_0\n무단 재배포를 금합니다. LICENSE.txt 참조.',
  bannerColor: '#d97b8d'
});
