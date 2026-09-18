/*!
 * 단수달 (Knitting Companion)
 * Copyright (c) 2026 @tteoboja_0. All rights reserved.
 * https://instagram.com/tteoboja_0
 *
 * 실제 배선은 companion-app.js 하나에 공용으로 있습니다. 이 파일은
 * 단수달만의 것(스프라이트 팩, 저장 키, 물고기 그리드, "단" 문구)만
 * config 로 넘기는 얇은 진입점입니다.
 */

import { mountCompanionApp } from '../companion-app.js';
import * as S from './sprites.js';
import * as fishCell from './fish-cell.js';

mountCompanionApp({
  panelId: 'panel-otter',
  prefix: '',
  unit: '단',
  storageKey: 'dansudal:state',
  zoomStorageKey: 'knit-zoom',
  zoomTarget: document.documentElement,
  sprites: S,
  cellKit: fishCell,
  bannerText: `단수달 — © 2026 ${S.SIGNATURE}\n무단 재배포를 금합니다. LICENSE.txt 참조.`,
  bannerColor: '#3f7266'
});
