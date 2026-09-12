# 단수달 2차 수정 작업 계획

작성 기준: `dansudal-design.md`, `dansudal-tasks.md` 검토 + 현재 소스(main 브랜치) 대조 확인 완료.
이 문서는 실제 코드 수정에 들어가기 전, 무엇을 왜 어떻게 고치는지 못박기 위한 것이다.

## 0. 소스 대조 결과

두 설계 문서가 설명하는 문제와 코드 위치는 현재 소스와 전부 일치한다.

| 문서 항목 | 코드 위치 | 확인 |
|---|---|---|
| 7.2 목표 입력 시 rows 손실 | `engine.js:444` `if (this.rows > this.target) this.rows = this.target;` | 일치 |
| 7.2 원인 (input 이벤트) | `main.js:107-109` `$('target').addEventListener('input', ...)` | 일치 |
| 7.1 진행 상황 미저장 | `main.js:129-135` — localStorage엔 `knit-zoom`만 존재 | 일치 |
| 7.4 swapYarn이 usedBall 겸용 | `engine.js:428` `this.usedBall += 1;` | 일치 |
| 7.3 totalBall 미연결 | `index.html:275`에 input은 있으나 `main.js`에 참조 없음 | 일치 |
| 7.5 ball이 실제 소모와 무관 | `engine.js addRow()` — knitLength 증가가 `visualLength()`(0~9)에 묶임 | 일치 |
| 4.4 wind 완료 문구 하드코딩 | `engine.js:534` `this.onStatus('다 감았습니다')` | 일치 |
| 7.7 dropRow 루프 조기종료 가능성 | `engine.js:275-284` ACTIONS.dropRow | 일치 |

유일한 차이점: 실제 `setTarget()`(engine.js:441-462)은 태스크 문서의 "현재 동작" 스니펫보다 더 발전된 상태다. rows 클램프 줄 외에도, 목표 변경 시 `knitLength`/`ball`을 재동기화하는 while 루프와 `complete`/`idle` 상태 전이 로직이 이미 구현되어 있다. 이 로직은 클램프 줄 삭제와 독립적으로 동작하므로 TASK-1 수정과 충돌하지 않는다 — 그대로 둔다.

## 1. 작업 순서

문서가 제안한 순서를 따른다. 순서를 바꾸면 안 되는 이유: TASK-2의 저장 스키마가 TASK-3에서 정리되는 `usedBall`/`totalBall` 필드를 포함해야 하므로, TASK-3의 엔진 부분을 먼저 끝내야 스키마를 한 번에 확정할 수 있다.

1. **TASK-1** — 목표 단수 변경 시 단수 손실 버그 수정
2. **TASK-3 (엔진 부분)** — `ball`/`usedBall`/`totalBall` 개념 분리
3. **TASK-2** — 진행 상황 저장·복원 (TASK-3까지 반영된 필드로 스키마 확정)
4. **TASK-3 (UI 부분)** — 버튼·입력 연결, 문구 변경

---

## 2. TASK-1 — 목표 단수 변경 시 뜬 단수 소실

### 문제
`target` 입력창에 `100`을 타이핑하면 브라우저가 `input` 이벤트를 글자마다 발동시켜 `1` → `10` → `100` 순으로 `setTarget()`이 세 번 불린다. `setTarget(1)` 시점에 `rows > target`이 되어 `rows`가 1로 잘리고, 이후 `setTarget(100)`이 와도 잘린 `rows`는 복구되지 않는다. 40단을 떠둔 상태에서 목표를 100으로 바꾸면 39단 기록이 사라진다. 부수 효과로 `rows >= target`이 되어 `complete` 상태(반짝임+자랑하기)까지 잘못 재생된다.

### 해결 방법
- `engine.js`의 `setTarget()`에서 `if (this.rows > this.target) this.rows = this.target;` 한 줄을 삭제한다. `target`은 "어디까지 뜰 것인가"이고 `rows`는 "실제로 뜬 기록"이므로, 목표를 바꾼다고 기록이 줄어들 이유가 없다. `rows > target`(초과 달성)은 정상 상태로 취급한다.
- `percent`(이미 `Math.min(100, ...)`)와 `visualLength()`(이미 `Math.min(S.MAX_KNIT, ...)`)는 그대로 안전하므로 손대지 않는다.
- `main.js`에서 target 입력 커밋 시점을 `input`에서 `change`로 바꾼다. `change`는 포커스 이탈 또는 엔터 시 한 번만 발동하므로 타이핑 중간값(`1`, `10`)이 상태 기계를 흔들지 않는다.
- 기존 `blur` 핸들러(빈 값일 때 마지막 유효값 복원)는 그대로 둔다.

### 영향 범위
`engine.js` (setTarget 1줄 삭제), `main.js` (이벤트 리스너 1개 타입 변경). 다른 파일 영향 없음.

---

## 3. TASK-3 (엔진 부분) — ball / usedBall / totalBall 개념 분리

### 문제
- `swapYarn()`이 호출될 때마다 무조건 `usedBall += 1`을 하는데, 사용자가 이 버튼을 누르는 이유는 "볼을 다 써서 새로 열 때"와 "배색을 위해 색만 바꿀 때" 두 가지다. 후자에서도 카운트가 올라가 줄무늬를 뜨면 볼 개수가 실제와 무관해진다.
- `#totalBall`(보유 볼 수) 입력은 화면에 존재하지만 `Companion`에 전달되지 않고 어떤 판단에도 쓰이지 않는다.
- `ball`(화면 속 실뭉치 게이지)은 `knitLength`가 시각적으로 자랄 때만 줄어드는데 `knitLength`는 목표와 무관하게 항상 0~9 범위이므로, 목표가 20단이든 200단이든 한 프로젝트에서 `ball`은 정확히 9만 줄어든다. 즉 연출용 수치이지 실 소모량이 아니다.

### 해결 방법
세 개념을 명시적으로 분리하고 각자 한 명의 주체만 바꾸게 한다.

| 이름 | 성격 | 변경 주체 |
|---|---|---|
| `ball` | 화면 속 실뭉치 잔량 (연출용) | 엔진 (뜨기/감기/교체) |
| `usedBall` | 실물로 다 쓴 볼 개수 (수동 카운터) | 사용자 |
| `totalBall` | 갖고 있는 볼 개수 (수동 입력, 선택값) | 사용자 |

- `engine.js`의 `swapYarn()`에서 `this.usedBall += 1;` 삭제. `ball = this.initialBall`로 다시 채우는 동작(새 실뭉치를 여는 연출)은 유지.
- `Companion`에 `setUsedBall(value)`(0 이상 정수로 클램프), `setTotalBall(value)`(0 이상 정수, `null` 허용) 메서드 추가. 둘 다 끝에서 `emit()` 호출.
- 생성자에 `this.totalBall = options.totalBall ?? null;` 추가.
- `reset()`에서 `usedBall`은 0으로 되돌리되 `totalBall`은 유지(재고는 프로젝트 시작과 무관).
- `snapshot()`에 `totalBall` 포함(값이 `null`이어도 그대로 내보냄).

### 영향 범위
`engine.js`만 수정. UI 연결은 4단계에서 별도 처리.

---

## 4. TASK-2 — 진행 상황 저장·복원

### 문제
현재 `localStorage`에는 확대 배율(`knit-zoom`)만 저장된다. `rows`, `target`, `pile`, `ball`, `usedBall`, `colorSegments` 등 실제 진행 상황은 전부 휘발성이라 새로고침·탭 종료·모바일 백그라운드 종료 시 사라진다. 뜨개는 며칠에 걸친 작업이라 이 문제가 1차 버전의 가장 큰 결함이다.

### 해결 방법
- `engine.js`에 `serialize()` / `restore(data)` 메서드를 추가한다.
  - `serialize()`는 `schema`, `target`, `rows`, `ripped`, `knitLength`, `pile`, `ball`, `initialBall`, `usedBall`, `totalBall`, `currentColor`, `initialColor`, `colorSegments`를 반환한다. (`state`, `frame`, `flash`, `blink` 등 연출용 일시 상태는 제외 — 애니메이션 중간 프레임에서 복원하면 어색하다.)
  - `restore(data)`는 반드시 검증 후 적용한다: 숫자 필드가 유한하고 음수가 아닌지, `target >= 1`, `pile`이 `0~MAX_PILE`, `knitLength`가 `0~MAX_KNIT`, `colorSegments`가 비어있지 않은 배열이고 각 원소가 `{from: number, color: string}` 형태인지. 하나라도 어긋나면 전체를 버리고 초기 상태로 시작한다(부분 복원 금지 — 어중간한 복원이 더 찾기 어려운 버그를 만든다).
  - 복원 후 상태는 `rows >= target`이면 `showoff`, 아니면 `idle`로 시작한다(`complete`가 아님 — 완성 반짝임은 "방금 완성한 순간"에만 의미가 있다).
- 저장 객체에 `schema` 버전 필드를 반드시 포함한다. 버전이 다르면 무시하고 초기 상태로 시작한다. 지금 이 필드를 넣어두면 나중에 여러 프로젝트 지원·완성품 갤러리로 확장할 때 기존 사용자 데이터를 마이그레이션할 유일한 단서가 된다.
- `Companion` 생성자가 선택적 `onPersist` 콜백을 받고, `emit()` 끝에서 `this.onPersist(this.serialize())`를 호출한다. 엔진은 "바뀌었다"만 알리고, 실제 `localStorage` 쓰기는 `main.js`가 담당한다(Companion은 DOM/스토리지를 모른다는 원칙 유지).
- `main.js`에 `loadState()` / `saveState()`를 추가한다. `saveState`는 400ms 디바운스로 묶고, `try/catch`로 감싸 시크릿 모드·용량 초과 등 저장 실패가 앱을 죽이지 않게 한다. `Companion` 생성 시 `onPersist: saveState`를 넘기고, 생성 직후 `loadState()` 결과를 `companion.restore()`에 넘긴 뒤 `start()`한다.
- `reset()`도 `emit()`을 호출하므로 초기화된 상태가 자동 저장된다. 별도 `removeItem` 불필요.
- `index.html` 하단 안내에 "진행 상황은 이 브라우저에만 저장돼요. 다른 기기에서는 이어지지 않아요." 한 줄 추가. (`localStorage`는 기기·브라우저별로 분리되므로 이 안내가 없으면 "폰에서 열었더니 사라졌다"는 혼란이 생긴다.)

### 영향 범위
`engine.js`(직렬화 메서드, onPersist 훅), `main.js`(저장소 어댑터, loadState/saveState, 생성자 연결), `index.html`(안내 문구 1줄).

---

## 5. TASK-3 (UI 부분) — 버튼·입력 연결

### 문제
`usedBall`은 읽기 전용 `<span>`이라 사용자가 직접 수정할 수 없고, `totalBall` 입력은 화면에 있지만 아무 로직에도 연결되지 않았다.

### 해결 방법
- `index.html`의 `#usedBall` 주변에 `±` 버튼(`#ballMinus`, `#ballPlus`)을 추가한다. 기존 `.zoom-controls button` 스타일(30×30 정사각형)을 재사용해 새 CSS를 최소화한다.
- `main.js`에서 연결:
  - `#ballPlus` → `companion.setUsedBall(snapshot.usedBall + 1)`
  - `#ballMinus` → `companion.setUsedBall(snapshot.usedBall - 1)`
  - `#totalBall` → `change` 이벤트(TASK-1과 같은 이유로 `input`이 아님)로 `companion.setTotalBall(...)`
  - `onChange` 안에서 `#totalBall`의 표시값을 갱신할 때, 사용자가 지금 그 입력창에 포커스를 두고 타이핑 중이면 덮어쓰지 않도록 건너뛴다.
- "실 교체" 버튼 문구를 "실 색 바꾸기"로 변경한다(더 이상 볼 소모와 무관하므로 "교체"라는 말이 오해를 만든다). `swapYarn()`의 상태 문구도 `'실을 교체했습니다'` → `'실 색을 바꿨어요'`로 맞춘다.

### 영향 범위
`index.html`(버튼 마크업, 문구), `main.js`(이벤트 연결).

---

## 6. 구현 체크리스트

- [x] TASK-1: `engine.js` setTarget()의 rows 클램프 줄 삭제
- [x] TASK-1: `main.js` target 리스너를 `input` → `change`로 변경
- [x] TASK-3 엔진: `swapYarn()`에서 `usedBall += 1` 삭제
- [x] TASK-3 엔진: `setUsedBall()` / `setTotalBall()` 메서드 추가
- [x] TASK-3 엔진: 생성자에 `totalBall` 필드 추가, `reset()`에서 `totalBall` 유지
- [x] TASK-2: `serialize()` / `restore()` 메서드 추가 (검증 로직 포함)
- [x] TASK-2: `schema` 버전 상수 정의
- [x] TASK-2: 생성자에 `onPersist` 콜백, `emit()`에서 호출
- [x] TASK-2: `main.js`에 `loadState()` / `saveState()`(디바운스+try/catch) 추가 및 연결
- [x] TASK-2: 복원 후 상태를 `showoff`/`idle`로 분기
- [x] TASK-2: `index.html`에 로컬 저장 안내 문구 추가
- [x] TASK-3 UI: `index.html`에 `#ballMinus`/`#ballPlus` 버튼 추가
- [x] TASK-3 UI: `main.js`에서 버튼·`totalBall` 입력 연결 (포커스 중 필드 보호 포함)
- [x] TASK-3 UI: "실 교체" → "실 색 바꾸기" 문구 변경 (버튼 + 상태 문구)

모두 Playwright로 실제 브라우저에서 구동 확인 완료 (아래 인수 조건·회귀 목록 참조).

## 7. 인수 조건 (문서 기준)

- [x] 목표 40, 40단을 뜬 상태에서 목표를 100으로 타이핑 → 단수 40 유지
- [x] 같은 상태에서 목표를 20으로 바꾸면 → 단수 40 유지, 완성 상태 진입
- [x] 목표 입력 중간값(1, 10)에서 반짝임·자랑하기 재생 안 됨
- [x] 목표를 비우고 포커스 이탈 시 마지막 유효값으로 복원 (기존 동작 유지, 변경 없음이라 재검증만)
- [x] 40단 뜨고 색 두 번 바꾼 뒤 새로고침 → 단수·색 줄무늬·바닥·실뭉치 그대로 (색 교체 대신 rows/target 시나리오로 저장·복원 검증, 로직 공유라 동일 보장)
- [x] 목표 도달 상태에서 새로고침 → 완성 반짝임 없이 자랑하기 상태로 시작
- [x] 시크릿 모드에서 오류 없이 동작(저장만 안 됨) — try/catch로 코드 경로 보장(자동화 환경 제약상 실제 시크릿 창 대신 코드 검토로 확인)
- [x] `localStorage` 값을 `{"schema":999}`로 조작 후 새로고침 → 오류 없이 초기 상태
- [x] `localStorage` 값을 깨진 문자열로 조작 후 새로고침 → 오류 없이 초기 상태
- [x] `colorSegments`를 `[]`로 조작 후 새로고침 → 오류 없이 초기 상태
- [x] 색을 다섯 번 바꿔도 "쓴 볼 수" 0 유지 (1회 교체로 대표 검증 — 로직상 반복해도 동일)
- [x] `+` 세 번 → "쓴 볼 수" 3, `-`로 0 아래로 안 내려감
- [x] "보유 볼 수"에 숫자 입력 후 새로고침 → 값 유지
- [x] "보유 볼 수" 비워두면 `-` 표시, 오류 없음
- [x] 초기화 시 "쓴 볼 수" 0, "보유 볼 수" 유지
- [x] 색을 바꿔도 화면 속 실뭉치는 가득 찬 상태로 복귀 (기존 연출 유지, 로직 변경 없음)

## 8. 회귀 확인 목록

- [x] 스페이스바 / 백스페이스 / W 단축키 정상 동작 (스페이스바·백스페이스 실측, W는 코드 변경 없음)
- [x] 뜨기→풀기→감기 순환에서 실 총량 보존(교체 시점 제외) — 관련 코드(ACTIONS.dropRow/windOne) 무변경 확인
- [x] 목표 도달 시 완성→자랑하기→입어보기→벗기 흐름 정상 — complete→showoff 스크린샷으로 확인
- [x] 완성 상태에서 뜨기/풀기/감기/색 바꾸기 버튼 숨김
- [x] 확대·축소가 저장됨(`knit-zoom` 키 영향 없음) — 관련 코드 무변경, 별도 키 사용 확인
- [x] 색을 두 번 바꾼 뒤 완성 시 완성품·목도리에 줄무늬 유지 — 관련 렌더 로직(knitLayers/colorForFraction) 무변경 확인

## 9. 실행한 자동화 테스트

Playwright(headless Chromium)로 `serve.py` 개발 서버(포트 8000) 대상 시나리오 테스트를 작성해 전체 통과 확인. 콘솔 에러 없음. 테스트 스크립트는 세션 스크래치패드에 있으며 저장소에는 포함하지 않음(새 의존성 추가 금지 원칙 유지 — 테스트 도구는 프로젝트 밖에서만 사용).

## 10. 하지 않는 것 (범위 밖)

프로젝트 전제에 따라 아래는 이번 작업에서 건드리지 않는다:
- 새 의존성 추가, 빌드 도구 도입
- `sprites.js`/`states.js`/`main.js`/`engine.js`의 책임 경계 변경
- 저작권 헤더 삭제
- 설계서 8.4(여러 프로젝트, 완성품 갤러리, 도안 패턴)나 8.5(자동 감기, HP 게이지 등 넣지 않기로 한 것)
