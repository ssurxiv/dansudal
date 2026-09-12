# 단수달 — 단수 메모(말풍선 알림) 기능 설계

설계서 8.4절 "도안 패턴 (예: 2단마다 늘림) — 단수에 규칙을 거는 새 모델 계층"에 해당하는 확장
작업이다. TASK-1~3과 달리 버그 수정이 아니라 새 모델 계층 추가이므로, 구현 전 결정 사항을
먼저 정리한다.

## 0. 확정된 결정 사항

대화 중 확인한 두 가지 갈림길:

1. **편집 시점** — 프로젝트 시작할 때 한 번만이 아니라, **언제든 메모를 추가·수정·삭제할 수
   있게 한다.** 뜨는 중간에 "여기서부터 줄임 넣어야지" 하고 바로 추가 가능해야 한다.
2. **표시 방식** — 32×32 캔버스 안에는 글자를 그릴 폰트가 없어 자유 텍스트를 픽셀아트로 직접
   그릴 수 없다. 그래서 **캐릭터 위에 작은 말풍선 아이콘(기존 `bang`/`notice` 패턴과 같은
   방식)을 띄우는 동시에, 실제 문구는 `#status` 줄에 표시**한다. 아이콘이 "지금 알림이 떴다"는
   시각 신호를 주고, 문구는 상태줄이 전달한다.

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

## 3. 말풍선 큐잉·표시

한 단에 메모가 여러 개 겹치면(예: "5단마다"와 "12단" 메모가 같은 단에서 동시에 발동) 순서대로
하나씩 보여준다.

```js
this.bubbleQueue = [];   // 저장 안 함 — 연출용 일시 상태
this.bubbleTimer = null;
this.noteBubble = false; // render()가 아이콘을 그릴지 여부

queueBubble(messages) {
  this.bubbleQueue.push(...messages);
  if (!this.bubbleTimer) this.advanceBubble();
}

advanceBubble() {
  if (this.bubbleQueue.length === 0) {
    this.noteBubble = false;
    this.bubbleTimer = null;
    this.render();
    return;
  }
  this.noteBubble = true;
  this.onStatus(this.bubbleQueue.shift());
  this.render();
  this.bubbleTimer = setTimeout(() => this.advanceBubble(), 2200);
}
```

기존 `blink`과 같은 패턴(모델이 아니라 연출 상태라 `serialize()` 대상에서 제외, `setTimeout` +
`render()`로 처리)을 그대로 따른다.

## 4. 새 스프라이트 — `noteBubble` 아이콘

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

- [ ] `sprites.js`: `noteBubble` 아이콘 추가
- [ ] `engine.js`: `SCHEMA` 2로 상향, 생성자에 `this.notes` 필드 추가
- [ ] `engine.js`: `addNote` / `updateNote` / `removeNote` 메서드 (검증 포함)
- [ ] `engine.js`: `addRow()`에 트리거 로직 추가
- [ ] `engine.js`: `bubbleQueue` / `noteBubble` / `queueBubble` / `advanceBubble` 추가
- [ ] `engine.js`: `render()`에 `noteBubble` 아이콘 블릿 추가
- [ ] `engine.js`: `serialize()`에 `notes` 포함, `restore()`에 스키마 1→2 마이그레이션 + `notes` 검증
- [ ] `engine.js`: `snapshot()`에 메모 목록 노출(UI가 목록을 그리려면 필요)
- [ ] `index.html`: 메모 버튼 + 패널(목록 + 추가/수정 폼 + 프리셋 버튼) 마크업
- [ ] `main.js`: 메모 패널 토글, 목록 렌더링, 추가·수정·삭제·프리셋 클릭 이벤트 연결

## 9. 인수 조건

- [ ] "5단마다: 코 줄임" 메모를 추가하고 5, 10, 15단을 뜰 때마다 말풍선 아이콘 + 상태줄에
      문구가 뜬다.
- [ ] "12단: 실 색 바꾸기" 같은 특정 단 메모는 12단에서 딱 한 번만 뜬다(11, 13단에서는 안 뜸).
- [ ] 12단까지 뜬 뒤 11단으로 풀고 다시 12단까지 뜨면 메모가 다시 뜬다.
- [ ] 뜨는 중간에 메모를 새로 추가해도 즉시 반영된다(재시작 불필요).
- [ ] 메모를 수정/삭제하면 이후 트리거에 바로 반영된다.
- [ ] 메모가 있는 상태로 새로고침해도 목록이 그대로 복원된다.
- [ ] TASK-2 적용 후 저장된(스키마 1) 기존 데이터를 새로고침하면 진행 상황은 그대로 유지되고
      메모 목록만 빈 상태로 시작한다(데이터 손실 없이 마이그레이션됨).
- [ ] 한 단에 메모가 두 개 겹치면 말풍선이 순서대로(동시에 아님) 뜬다.
- [ ] row와 every를 둘 다 비우거나 둘 다 채운 채 추가를 시도하면 저장되지 않는다.

## 10. 하지 않는 것

- 프리셋 문구 선택 시 자동으로 실 색 바꾸기(`swapYarn`)나 다른 동작을 실행하는 것 — 메모는
  순수 알림이다.
- 도안 전체를 규칙으로 표현하는 것(예: "2단마다 자동으로 늘림 처리") — 이건 설계서 8.4의 또
  다른 항목이고, 지금은 "알려주기"까지만 한다.
- 메모별 "완료 체크" 상태 저장 — 트리거는 항상 `rows` 값 기준으로 재계산하고 별도 이력을 남기지
  않는다(2번 섹션 참조).
