# 단수달 — 단수 메모(말풍선 알림) 기능 설계

설계서 8.4절 "도안 패턴 (예: 2단마다 늘림) — 단수에 규칙을 거는 새 모델 계층"에 해당하는 확장
작업이다. TASK-1~3과 달리 버그 수정이 아니라 새 모델 계층 추가이므로, 구현 전 결정 사항을
먼저 정리한다.

> **후속 변경 (0.2)** — 사용자 대상 명칭을 "메모"에서 "알림"으로 바꿨다(버튼 "🔔 알림", 패널
> 문구 등). 코드 내부 식별자(`notes`, `addNote` 등)는 그대로 두고 화면 텍스트/주석만 바꿨다.
> 또한 한 단에 알림이 여러 개 겹칠 때 순서대로 하나씩 보여주던 큐 방식을 버리고, 쉼표로 이어
> 한 번에 보여주는 방식(`showNote()`)으로 단순화했다 — 기다릴 필요 없이 한눈에 다 보인다.
> 캐릭터와 말풍선이 겹치던 문제도 함께 고쳤다: `position:absolute`로 캔버스 위에 얹던 방식을
> 버리고 말풍선을 일반 흐름에 놓아 캔버스를 아래로 밀어내는 방식으로 바꿔, 겹침 자체가
> 구조적으로 불가능하게 만들었다. 아래 본문은 최초 설계 당시 기록이라 이 변경 이전 상태를
> 설명하는 부분이 있다.

## 0. 확정된 결정 사항

대화 중 확인한 두 가지 갈림길:

1. **편집 시점** — 프로젝트 시작할 때 한 번만이 아니라, **언제든 메모를 추가·수정·삭제할 수
   있게 한다.** 뜨는 중간에 "여기서부터 줄임 넣어야지" 하고 바로 추가 가능해야 한다.
2. **표시 방식** — 32×32 캔버스 안에는 글자를 그릴 폰트가 없어 자유 텍스트를 픽셀아트로 직접
   그릴 수 없다. ~~그래서 캐릭터 위에 작은 말풍선 아이콘(기존 `bang`/`notice` 패턴과 같은
   방식)을 띄우는 동시에, 실제 문구는 `#status` 줄에 표시한다.~~ **(0.1 참조 — 실제 사용해보고
   픽셀 아이콘은 잘 안 보인다는 피드백에 따라 CSS 말풍선으로 교체함)**

### 0.1 후속 수정 — 픽셀 아이콘 → CSS 말풍선

처음 구현한 픽셀 아이콘(캐릭터 왼쪽 위의 작은 점 하나)은 실제로 써보니 눈에 잘 안 띄었다.
그래서 캔버스 바깥에 진짜 HTML/CSS 말풍선을 띄우고, 그 안에 문구를 직접 적는 방식으로
바꿨다 — "멘트"(평소 잡담)와 "알림"(메모)은 말풍선 색으로 구분한다(흰색 vs 연두색).

- `sprites.js`의 `noteBubble` 픽셀 스프라이트, `engine.js`의 `this.noteBubble` 플래그와
  `render()`의 관련 블릿 라인은 전부 삭제했다 — 더 이상 필요 없다.
- `Companion.onStatus(text, kind)` 로 시그니처를 확장했다(`kind` 기본값 `'chat'`). 메모 알림만
  `advanceBubble()`에서 `'note'`를 넘긴다. 다른 모든 `onStatus` 호출부는 그대로 두면 자동으로
  `'chat'`이 된다.
- `queueBubble`/`advanceBubble`(메모 여러 개가 겹칠 때 순서대로 보여주는 큐잉)과, addRow()의
  "말풍선 재생 중엔 평범한 진행 문구가 안 덮어씀" 로직은 그대로 유지된다 — 캔버스에 그리던
  것을 DOM에 그리는 것으로 바뀌었을 뿐, 타이밍/우선순위 로직은 동일하다.
- `main.js`에 `setStatus(text, kind)` 헬퍼를 추가해 말풍선 DOM(`#bubble`)과 텍스트를 함께
  갱신한다. `Companion`의 `onStatus` 옵션으로 그대로 전달한다.
- 덤으로 기존 `#status` 문단은 화면에서 안 보이는 `.sr-only` + `aria-live="polite"` 로 남겨
  스크린리더에도 상태가 읽히게 했다 — 설계서 7.8절이 지적했던 문제를 같은 김에 해결했다.

## 1. 데이터 모델

메모 하나는 다음 형태다.

```js
{ id, row: number|null, every: number|null, message: string }
```

- `row`: 특정 단(예: 12단)에서 한 번 발동.
- `every`: N단마다 발동 (`rows % every === 0`일 때). "5단마다"는 5, 10, 15...에서 발동.
- 둘 중 정확히 하나만 있어야 한다(둘 다 없거나 둘 다 있으면 저장하지 않는다).
- `message`: 빈 문자열이 아닌 자유 텍스트("코 줄임", "꽈배기" 등 프리셋도 결국 이 필드에
  문자열로 들어간다).

`Companion`에 추가:

```js
this.notes = options.notes ?? [];
```

메서드:

- `addNote({ row, every, message })` — 유효성 검증 후 새 id를 붙여 `notes`에 추가. `emit()`.
- `updateNote(id, { row, every, message })` — 기존 항목을 찾아 같은 검증을 거쳐 교체. `emit()`.
- `removeNote(id)` — 제거. `emit()`.

## 2. 트리거 로직

`addRow()`에서 `this.rows += 1` 직후, 새로 도달한 `rows` 값과 일치하는 메모를 찾는다.

```js
const hits = this.notes.filter(
  (n) => n.row === this.rows || (n.every && this.rows % n.every === 0)
);
if (hits.length) this.queueBubble(hits.map((n) => n.message));
```

**한 단을 풀었다가(rip) 같은 단까지 다시 뜨면 메모가 또 뜬다 — 의도된 동작이다.** 별도로
"한 번 뜬 메모는 다시 안 뜨게" 소비 처리하지 않는다. 되돌아가서 다시 뜬다는 건 그 지점을 다시
지나간다는 뜻이라, 알림도 다시 필요하다.

## 3. 말풍선 큐잉·표시 (0.1 반영 후 최종본)

한 단에 메모가 여러 개 겹치면(예: "5단마다"와 "12단" 메모가 같은 단에서 동시에 발동) 순서대로
하나씩 보여준다. 픽셀 아이콘을 켜고 끄던 부분만 빠졌을 뿐, 큐잉/타이밍은 최초 설계 그대로다.

```js
this.bubbleQueue = [];   // 저장 안 함 — 연출용 일시 상태
this.bubbleTimer = null;

queueBubble(messages) {
  this.bubbleQueue.push(...messages);
  if (!this.bubbleTimer) this.advanceBubble();
}

advanceBubble() {
  if (this.bubbleQueue.length === 0) {
    this.bubbleTimer = null;
    return;
  }
  this.onStatus(this.bubbleQueue.shift(), 'note'); // kind='note'로 말풍선 색을 알려줌
  this.bubbleTimer = setTimeout(() => this.advanceBubble(), 2200);
}
```

기존 `blink`과 같은 패턴(모델이 아니라 연출 상태라 `serialize()` 대상에서 제외)을 따른다.

## 4. (폐기됨) 새 스프라이트 — `noteBubble` 아이콘

> **0.1에서 이 절 전체가 폐기되었다.** 아래는 최초 설계 기록으로만 남겨둔다 — 실제 코드에는
> 없다. 대신 `index.html`에 `.speech-bubble` CSS 말풍선을 추가했다(위치: `.stage-wrap` 안,
> `position:absolute`로 캐릭터 머리 위에 뜸. `.kind-note`는 연두색, 기본은 흰색).

`sprites.js`에 `bang`과 같은 방식으로 정적 아이콘 하나를 추가한다. `bang`은 오른쪽 위(귀 옆)에
느낌표를 띄우므로, 겹치지 않도록 **왼쪽 위 빈 공간**에 작은 말풍선 + 점 하나를 그린다.

```js
export const noteBubble = pad({
  1: '.ggg............................',
  2: 'g.h.g...........................',
  3: 'g...g...........................',
  4: '.ggg............................',
  5: '..g.............................'
});
```

`g`/`h`는 이미 `NEEDLE` 팔레트에 있는 색(외곽선/포인트)이라 새 팔레트를 만들 필요가 없다.
`engine.js render()`에 한 줄 추가:

```js
if (this.noteBubble) blit(ctx, S.noteBubble, S.NEEDLE);
```

`bang`과 달리 이건 상태(state) 정의가 아니라 Companion 인스턴스 플래그이므로 `states.js`는
건드리지 않는다.

## 5. 저장 스키마 — 버전 2로 마이그레이션

설계서가 미리 깔아둔 스키마 버전 필드를 실제로 쓸 차례다. `notes`가 추가되므로 `SCHEMA`를
1 → 2로 올린다.

```js
const SCHEMA = 2;
```

`restore()`에서:

```js
restore(data) {
  if (!data || typeof data !== 'object') return false;
  // 1차 스키마에는 notes 가 없었을 뿐, 나머지 필드는 호환되므로 버리지 않고 보정한다.
  if (data.schema === 1) data = { ...data, notes: [] };
  if (data.schema !== SCHEMA) return false;
  ...
  // notes 배열 검증: 각 원소가 { id, message } 를 갖고 row/every 중 정확히 하나만 있는지.
  if (!Array.isArray(data.notes)) return false;
  for (const n of data.notes) {
    const hasRow = Number.isFinite(n?.row);
    const hasEvery = Number.isFinite(n?.every);
    if (!n || typeof n.id !== 'string' || typeof n.message !== 'string') return false;
    if (hasRow === hasEvery) return false; // 정확히 하나만
  }
  this.notes = data.notes.map((n) => ({ ...n }));
  ...
}
```

TASK-2 때 "스키마 다르면 버린다"고 했던 원칙을 여기서 한 단계 발전시킨다 — **1→2는 버리지 않고
보정**한다. 이게 애초에 스키마 버전 필드를 넣어둔 이유였다(설계서 9장: "지금 한 줄 넣는 비용이
나중에 며칠을 아낀다"). 반면 스키마가 1도 2도 아니면(예: 999) 여전히 전체 폐기한다 — 모르는
형식을 부분적으로 봐주려 하지 않는다.

## 6. UI — 메모 관리 패널

`stash` 패널과 같은 토글 패턴을 재사용한다.

- 컨트롤 줄에 `📝 메모` 버튼 추가 → 클릭 시 메모 패널 토글.
- 패널 내용:
  - 기존 메모 목록: `12단: 실 색 바꾸기 [수정] [삭제]` / `5단마다: 코 줄임 [수정] [삭제]`.
  - 추가/수정 폼: "특정 단"/"매 N단" 선택(라디오 또는 셀렉트) + 단수 입력 + 메시지 입력.
  - 자주 쓰는 문구 프리셋 버튼 4개(코 줄임 / 코 늘림 / 꽈배기 / 실 색 바꾸기) — 누르면 메시지
    입력창에 채워질 뿐, 별도 로직(예: 프리셋 선택 시 자동으로 swapYarn 실행)은 걸지 않는다.
    메모는 순수 알림이지 자동화가 아니다 — 8.5절 "자동 감기를 넣지 않는다"와 같은 이유다.
  - 수정 중에는 "추가" 버튼이 "수정"으로 바뀌고 "취소"가 나타난다.
- 완성 상태(`s.finished`)에서도 메모 패널은 숨기지 않는다 — 다음 프로젝트를 위해 미리 메모를
  적어둘 수도 있으니.

## 7. 영향 범위

| 파일 | 변경 |
|---|---|
| `sprites.js` | `noteBubble` 아이콘 스프라이트 추가 |
| `engine.js` | `notes` 필드, `addNote`/`updateNote`/`removeNote`, 트리거 로직(`addRow()`), 큐잉(`queueBubble`/`advanceBubble`), `render()`에 아이콘 블릿 1줄, `serialize()`/`restore()`에 `notes` 포함 + 스키마 2 마이그레이션 |
| `main.js` | 메모 패널 토글, 목록 렌더링, 추가/수정/삭제 폼 이벤트 연결 |
| `index.html` | 메모 버튼 + 패널 마크업, 최소 CSS(기존 `.stash` 스타일 재사용 위주) |

`states.js`, `pixel.js`, `stash.js`는 건드리지 않는다.

## 8. 구현 체크리스트

- [x] `sprites.js`: `noteBubble` 아이콘 추가
- [x] `engine.js`: `SCHEMA` 2로 상향, 생성자에 `this.notes` 필드 추가
- [x] `engine.js`: `addNote` / `updateNote` / `removeNote` 메서드 (검증 포함)
- [x] `engine.js`: `addRow()`에 트리거 로직 추가
- [x] `engine.js`: `bubbleQueue` / `noteBubble` / `queueBubble` / `advanceBubble` 추가
- [x] `engine.js`: `render()`에 `noteBubble` 아이콘 블릿 추가
- [x] `engine.js`: `serialize()`에 `notes` 포함, `restore()`에 스키마 1→2 마이그레이션 + `notes` 검증
- [x] `engine.js`: `snapshot()`에 메모 목록 노출(UI가 목록을 그리려면 필요)
- [x] `index.html`: 메모 버튼 + 패널(목록 + 추가/수정 폼 + 프리셋 버튼) 마크업
- [x] `main.js`: 메모 패널 토글, 목록 렌더링, 추가·수정·삭제·프리셋 클릭 이벤트 연결

### 8.1 구현 중 발견해 추가로 고친 것

설계에는 없었지만 테스트 중 발견한 문제: 말풍선이 재생되는 2.2초 동안 다른 단을 뜨면(메모가
없는 단이어도) `addRow()`의 평범한 진행 문구("뜨는 중" 등)가 말풍선 문구를 즉시 덮어써버렸다.
`addRow()`에서 `bubbleQueue`가 비어있고 `bubbleTimer`도 없을 때만 평범한 문구를 표시하도록
고쳤다 — 말풍선이 재생 중이면 끝날 때까지 진행 문구를 억누른다.

## 9. 인수 조건

- [x] "5단마다: 코 줄임" 메모를 추가하고 5, 10, 15단을 뜰 때마다 말풍선 아이콘 + 상태줄에
      문구가 뜬다.
- [x] "12단: 실 색 바꾸기" 같은 특정 단 메모는 12단에서 딱 한 번만 뜬다(11, 13단에서는 안 뜸).
- [x] 12단까지 뜬 뒤 11단으로 풀고 다시 12단까지 뜨면 메모가 다시 뜬다.
- [x] 뜨는 중간에 메모를 새로 추가해도 즉시 반영된다(재시작 불필요).
- [x] 메모를 수정/삭제하면 이후 트리거에 바로 반영된다.
- [x] 메모가 있는 상태로 새로고침해도 목록이 그대로 복원된다.
- [x] TASK-2 적용 후 저장된(스키마 1) 기존 데이터를 새로고침하면 진행 상황은 그대로 유지되고
      메모 목록만 빈 상태로 시작한다(데이터 손실 없이 마이그레이션됨).
- [x] 한 단에 메모가 두 개 겹치면 말풍선이 순서대로(동시에 아님) 뜬다.
- [x] row와 every를 둘 다 비우거나 둘 다 채운 채 추가를 시도하면 저장되지 않는다.

Playwright(headless Chromium)로 실제 브라우저에서 위 항목 전부 검증 완료. 콘솔 에러 없음.
말풍선 아이콘도 스크린샷으로 확인 — 왼쪽 위에 작게 떠서 얼굴·귀와 겹치지 않는다.

## 10. 하지 않는 것

- 프리셋 문구 선택 시 자동으로 실 색 바꾸기(`swapYarn`)나 다른 동작을 실행하는 것 — 메모는
  순수 알림이다.
- 도안 전체를 규칙으로 표현하는 것(예: "2단마다 자동으로 늘림 처리") — 이건 설계서 8.4의 또
  다른 항목이고, 지금은 "알려주기"까지만 한다.
- 메모별 "완료 체크" 상태 저장 — 트리거는 항상 `rows` 값 기준으로 재계산하고 별도 이력을 남기지
  않는다(2번 섹션 참조).
