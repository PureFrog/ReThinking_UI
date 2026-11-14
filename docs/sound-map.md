# 소리 지도

게임에서 소리가 날 자리를 전부 적어 둔 표야. 지금은 자리만 정해 두고, 소리는 나중에 한꺼번에 채워.

- 코드에서는 `app/core/sound.ts`의 `SLOTS`에 같은 이름으로 들어가 있어. 각 자리에서 `cue('이름')`을 부르고 있어.
- **임시 소리** 자리는 코드로 합성한 소리가 지금 나와. 아주 작고 품질도 임시야.
- **비어 있음** 자리는 소리 없이 자리만 표시돼 있어.
- **코드 연결 전** 자리는 아직 부를 곳이 없어. 그 기능이 생기는 단계에서 연결해.
- 소리를 채울 때는 `SLOTS`에서 그 이름의 값만 바꾸면 돼. 부르는 코드는 건드리지 않아도 돼.

## 한눈에

| 묶음 | 자리 | 임시 소리 | 비어 있음 | 코드 연결 전 |
| --- | --- | --- | --- | --- |
| 배경음·환경음 | 5 | 0 | 0 | 5 |
| 걸음 | 5 | 2 | 3 | 0 |
| 공통 화면 | 9 | 5 | 4 | 0 |
| 대화 | 5 | 1 | 4 | 0 |
| 친구 | 10 | 2 | 7 | 1 |
| 정원·나무 | 11 | 1 | 10 | 0 |
| 선물·서랍·옷 | 5 | 2 | 3 | 0 |
| 꾸미기 | 12 | 1 | 11 | 0 |
| 집 | 9 | 1 | 5 | 3 |
| 일지·퀴즈 | 8 | 0 | 8 | 0 |
| **모두** | **79** | **15** | **55** | **9** |

## 왜 소리가 났다 안 났다 했나

- 소리가 붙은 곳이 15곳뿐이라 같은 종류의 행동이라도 어떤 건 나고 어떤 건 안 났어. 예를 들어 물주기는 나는데 거름주기는 안 났어.
- 임시 소리를 일부러 아주 작게 만들었어. 특히 풀밭 발소리는 거의 안 들려.
- 소리는 '소리를 켤까?'에서 켜기를 눌러야 나. 안내는 8초만 떠서 지나치기 쉬워.
- 아래 표가 채워지면 같은 종류의 행동은 모두 같은 규칙으로 소리가 나.

## 게임 안에서 확인하는 법

개발자 도구 콘솔에서 `document.documentElement.dataset` 를 보면 돼.

- `lastSlot`은 마지막으로 지나간 자리야. 비어 있는 자리도 기록돼.
- `lastSound`는 실제로 소리가 난 마지막 자리야.

---

## 1. 배경음·환경음

| 이름 | 언제 | 지금 | 연결할 곳 |
| --- | --- | --- | --- |
| `bgm-day` | 낮 동안 계속 | 코드 연결 전 | 시간 구조 단계(낮·밤). 라이브러리 곡, `LICENSE_NOTES.md`에 출처 |
| `bgm-night` | 밤 동안 계속 | 코드 연결 전 | 같음 |
| `amb-day` | 낮 환경음(새, 바람) | 코드 연결 전 | 같음 |
| `amb-night` | 밤 환경음(풀벌레) | 코드 연결 전 | 같음 |
| `amb-indoor` | 집 안 환경음(시계, 난로) | 코드 연결 전 | 집 안팎이 바뀔 때 (`game.ts` updateFacade) |

## 2. 걸음

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `step-grass` | 플레이어가 풀밭을 한 칸 걸을 때 | 임시 소리 | `game.ts` walk |
| `step-wood` | 집 안·2층·다락 나무 바닥을 걸을 때 | 임시 소리 | `game.ts` walk |
| `step-path` | 흙길·디딤돌 타일 위를 걸을 때 | 비어 있음 | `game.ts` walk |
| `step-stairs` | 계단·사다리를 오르내릴 때 | 비어 있음 (`stairs`가 대신 남) | `game.ts` changeFloor |
| `friend-step` | 친구가 한 칸 걸을 때 (플레이어보다 작게) | 비어 있음 | `game.ts` walk |

## 3. 공통 화면

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `ui-button` | 화면의 버튼을 누를 때 (탭, 선택지, 닫기 등 모두) | 임시 소리 | `page.tsx` 클릭 감지 |
| `ui-toggle` | 켜고 끄기, 음량 막대를 바꿀 때 | 비어 있음 | `page.tsx` 변경 감지 |
| `panel-open` | 패널이 열릴 때 (서랍, 일지, 퀴즈 등) | 임시 소리 | `page.tsx` panel 효과 |
| `panel-close` | 패널이 닫힐 때 | 임시 소리 | `page.tsx` panel 효과 |
| `world-press` | 게임 속 사물(가구, 나무, 우편함 등)을 누를 때 | 임시 소리 | `game.ts` hotspot |
| `ground-tap` | 바닥을 눌러 걸어갈 곳을 정할 때 | 임시 소리 | `game.ts` pointerup |
| `hover` | 누를 수 있는 사물에 마우스를 올릴 때 | 비어 있음 | `game.ts` hotspot |
| `blocked` | 갈 수 없거나 칠할 수 없는 곳을 눌렀을 때 | 비어 있음 | `game.ts` walk, paintAt |
| `thought-pop` | 플레이어 생각 말풍선이 뜰 때 | 비어 있음 | 버스 이벤트 `thought` |

## 4. 대화

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `voice` | 친구 대사 글자마다 (모아 높게, 토리 통통, 루온 낮게) | 임시 소리 | `TypedDialogue.tsx` → `sound.ts` voice |
| `talk-start` | 친구에게 말을 걸 때 | 비어 있음 | 버스 이벤트 `request-talk` |
| `talk-next` | 대사를 넘길 때 | 비어 있음 | 버스 이벤트 `advance` |
| `talk-end` | 대화를 마칠 때 | 비어 있음 | 버스 이벤트 `end-talk` |
| `memo-send` | 대화 중 메모를 보낼 때 | 비어 있음 | `page.tsx` submitMemo |

## 5. 친구

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `invite-send` | 우편함에서 초대장을 보낼 때 | 비어 있음 | 버스 이벤트 `invite` |
| `friend-arrive` | 친구가 정원에 도착할 때 | 비어 있음 | 버스 이벤트 `arrived` |
| `door-knock` | 내가 집 안에 있을 때 친구가 오면 문 두드리는 소리 (스펙 5장) | 코드 연결 전 | 친구 도착 연출을 만들 때 |
| `friend-leave` | 친구가 돌아갈 때 | 비어 있음 | 버스 이벤트 `leave` |
| `heart` | 친구 머리 위에 하트가 뜰 때 | 임시 소리 | `visitor.ts` gesture |
| `stage-up` | 친밀도 단계가 올라 장면이 시작될 때 | 비어 있음 | 버스 이벤트 `scene` |
| `gift-give` | 내가 친구에게 선물을 건넬 때 | 비어 있음 | 버스 이벤트 `given` |
| `gift-arrive` | 친구가 선물을 들고 왔을 때 | 비어 있음 | 버스 이벤트 `arrival-gift` |
| `letter-open` | 우편함 편지를 펼칠 때 | 임시 소리 | `page.tsx` panel `mail` |
| `away-traces` | 집을 비운 사이 다녀간 친구의 발자국·젖은 흙이 반짝일 때 (스펙 4장) | 비어 있음 | `game.ts` showTraces |

## 6. 정원·나무

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `plant` | 씨앗을 심을 때. 3D에서는 내 종목 나무가 땅을 뚫고 나올 때 | 낮은 툭(`sprout`) | 버스 이벤트 `planted`, `proto3d/Proto3D.tsx` 정원 탄생 |
| `water` | 물뿌리개로 물을 줄 때 | 임시 소리 | `game.ts` water |
| `feed` | 거름을 줄 때 | 비어 있음 | `game.ts` feed |
| `care-done` | 돌봄(일지·퀴즈)을 마쳤을 때 | 비어 있음 | 버스 이벤트 `care-done` |
| `sun-pieces` | 햇살 조각이 날아가 유리병에 들어갈 때 | 비어 있음 | 버스 이벤트 `sun-pieces` |
| `uproot` | 삽으로 나무를 정리할 때 | 비어 있음 | 버스 이벤트 `removed` |
| `tree-tap` | 나무를 눌러 메뉴가 뜰 때 | 비어 있음 | 버스 이벤트 `tree-menu` |
| `promise` | 약속 리본을 눌러 이유를 볼 때 | 비어 있음 | 버스 이벤트 `promise` |
| `calendar` | 벽 달력을 열 때 | 비어 있음 | 버스 이벤트 `calendar` |
| `land-open` | 새 땅이 열리는 순간 | 비어 있음 | 버스 이벤트 `land-moment` |
| `cheer` | 친구가 이번 주 목표 달성을 축하하러 올 때 | 비어 있음 | 버스 이벤트 `cheered` |

## 7. 선물·서랍·옷

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `gift-pickup` | 바닥의 선물상자를 주울 때 | 임시 소리 | `game.ts` openGift |
| `gift-open` | 선물상자가 열릴 때 | 임시 소리 | `game.ts` finishOpen |
| `item-to-drawer` | 받은 물건이 서랍으로 날아갈 때 | 비어 있음 | `page.tsx` 선물 카드 닫기 |
| `wear` | 옷장에서 옷을 입을 때 | 비어 있음 | `page.tsx` onWear |
| `spin` | 새 옷을 입고 한 바퀴 돌 때 | 비어 있음 | 버스 이벤트 `spin` |

## 8. 꾸미기

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `decorate-start` | 꾸미기 모드를 시작할 때 | 비어 있음 | `page.tsx` 꾸미기 시작, chooseFurniture |
| `decorate-end` | 꾸미기를 마칠 때 | 비어 있음 | `page.tsx` finishDecorating |
| `decor-pick` | 가구 줄에서 가구를 집을 때 | 비어 있음 | 버스 이벤트 `place` |
| `decor-rotate` | 가구를 돌릴 때 | 비어 있음 | 버스 이벤트 `rotate` |
| `decor-place` | 가구가 떨어지며 놓일 때 (쿵) | 임시 소리 | `game.ts` drawDecor |
| `decor-blocked` | 빨간 칸에 놓으려 할 때 | 비어 있음 | `game.ts` placeAt |
| `decor-cancel` | 놓기를 취소할 때 | 비어 있음 | 버스 이벤트 `placement-cancelled` |
| `decor-store` | 가구를 서랍에 넣을 때 | 비어 있음 | `page.tsx` storeDecor |
| `paint-floor` | 방 바닥을 바꿀 때 | 비어 있음 | `game.ts` paintAt |
| `paint-wall` | 벽지를 바를 때 | 비어 있음 | `game.ts` paintAt |
| `paint-tile` | 마당에 길·꽃밭을 한 칸 깔 때 | 비어 있음 | `game.ts` paintAt |
| `exterior` | 외벽 색을 바꿀 때 | 비어 있음 | `page.tsx` onExterior |

## 9. 집

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `door` | 집에 들어가고 나올 때 | 임시 소리 | `game.ts` updateFacade |
| `stairs` | 층을 오르내릴 때 | 비어 있음 | `game.ts` changeFloor |
| `sit` | 소파·의자·쿠션·벤치에 앉을 때 | 비어 있음 | `game.ts` sitDown |
| `stand` | 앉았다가 일어날 때 | 비어 있음 | `game.ts` standUp |
| `lamp-toggle` | 별 조명을 켜고 끌 때 | 비어 있음 | 버스 이벤트 `decor-toggle` |
| `furniture-use` | 놓인 가구를 눌러 한마디 할 때 | 비어 있음 | `game.ts` drawDecor |
| `house-grow` | 일지 50번으로 집이 커질 때 | 코드 연결 전 | `game.ts` growHouse (불러올 때와 처음 커질 때를 나눠야 함) |
| `attic-open` | 회고 다섯 번으로 다락방이 열릴 때 | 코드 연결 전 | `game.ts` openAttic (같음) |
| `shelf-grow` | 금박 책으로 책장이 커질 때 | 코드 연결 전 | `game.ts` growShelf (같음) |

## 10. 일지·퀴즈

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `journal-save` | 돌봄 일지를 저장할 때 | 비어 있음 | `page.tsx` saveCareJournal |
| `quiz-right` | 퀴즈를 맞혔을 때 | 비어 있음 | `page.tsx` answerPage |
| `quiz-wrong` | 퀴즈를 틀렸을 때 | 비어 있음 | `page.tsx` answerPage |
| `quiz-gold` | 퀴즈 책이 금박이 될 때 | 비어 있음 | `page.tsx` answerPage |
| `retro-save` | 회고를 마칠 때 | 비어 있음 | 버스 이벤트 `retro-done` |
| `streak-day` | 오늘 첫 퀴즈로 연속일이 하루 늘 때 | 비어 있음 | `page.tsx` countQuiz |
| `streak-saved` | 마지막 기회 퀴즈를 다 풀어 연속일을 지켰을 때 | 비어 있음 | `page.tsx` countQuiz |
| `streak-bonus` | 연속일 보상 날(3·7·14·30일…)에 닿았을 때 | 비어 있음 | `page.tsx` countQuiz |

---

## 채울 때 정할 것

- **소리를 어떻게 만들지:** 지금처럼 코드로 합성할지, 녹음된 효과음 파일을 쓸지 정해야 해. 녹음 파일이면 무료 라이브러리에서 고르고 `LICENSE_NOTES.md`에 출처를 적어.
- **크기 기준:** 지금 임시 소리는 너무 작아. 채울 때 버튼 소리를 기준 크기로 정하고, 나머지를 그에 맞춰 키우거나 줄이면 돼.
- **자주 나는 소리:** 걸음, 대사 넘기기, 마우스 올리기는 아주 자주 나서 작고 짧아야 해. 안 넣는 게 나을 수도 있어.

## 3D 판정 공개 (ReThink Garden)

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `grade-count` | 판정 수익률이 0부터 세어 올라갈 때 | 짧은 틱(`tick`) | `proto3d/ui/Loop.tsx` Grades |
| `grade-stamp` | 적중·빗나감 도장이 찍힐 때 | 낮은 쿵(`stamp`) | `proto3d/ui/Loop.tsx` Grades |
| `grade-hit` | 판단이 적중일 때 | 올라가는 화음(`reveal-hit`) | `proto3d/ui/Loop.tsx` Grades |
| `grade-miss` | 판단이 빗나갔을 때 | 내려가는 두 음(`reveal-miss`) | `proto3d/ui/Loop.tsx` Grades |

## 3D 오! 패스 (docs/brief-wow.md W1~W3)

| 이름 | 언제 | 지금 | 코드 위치 |
| --- | --- | --- | --- |
| `garden-born` | 내 종목 나무가 다 서고 카메라가 정원을 한 바퀴 돌 때 | 넓게 퍼지는 화음(`chord`) | `proto3d/Proto3D.tsx` 정원 탄생 |
| `cutaway-open` | 땅 속(뿌리 단면)이 열릴 때 | 흙 긁는 소리(`dig`) | `proto3d/Proto3D.tsx` 뿌리 단면 |
| `cutaway-close` | 땅이 다시 덮일 때 | 닫기(`close`) | `proto3d/Proto3D.tsx` 뿌리 단면 |
| `capsule-bury` | 판단 메모가 캡슐에 담겨 나무 밑에 묻힐 때 | 눌러 묻는 소리(`bury`) | `proto3d/Proto3D.tsx` 타임캡슐 |
| `capsule-mark` | 묻은 자리에 표식 핀이 박힐 때 | 낮은 쿵(`thud`) | `proto3d/Proto3D.tsx` 타임캡슐 |
| `capsule-dig` | 판정일에 캡슐을 파낼 때 | 흙 긁는 소리(`dig`) | `proto3d/Proto3D.tsx` 타임캡슐 |
| `capsule-open` | 캡슐 뚜껑이 열리고 메모가 보일 때 | 유리 울림(`glass`) | `proto3d/Proto3D.tsx` 타임캡슐 |
| `game-open` | 관측소 원정이 열릴 때 | 문(`door`) | `proto3d/game/` 관측소 원정 |
| `game-halt` | 급락·실적 날에 시간이 멈출 때 | 둔탁음(`thud`) | `proto3d/game/` 관측소 원정 |
| `game-read` | 분석가 한 줄과 차트 주석이 들어올 때 | 유리 울림(`glass`) | `proto3d/game/` 관측소 원정 |
| `game-chip` | 확신 칩을 올릴 때 | 클릭(`click`) | `proto3d/game/` 관측소 원정 |
| `game-stamp` | 결정 도장이 찍힐 때 | 도장(`stamp`) | `proto3d/game/` 관측소 원정 |
| `game-tear` | 정리한 회사 카드가 찢어질 때 | 포장 풀기(`unwrap`) | `proto3d/game/` 관측소 원정 |
| `game-deal` | 새 회사 카드가 뒤집혀 들어올 때 | 줍기(`pickup`) | `proto3d/game/` 관측소 원정 |
| `game-fill` | 다음 날 시가에 체결될 때 | 틱(`tick`) | `proto3d/game/` 관측소 원정 |
| `game-pin` | 뉴스에 핀을 꽂을 때 | 탭(`tap`) | `proto3d/game/` 관측소 원정 |
| `game-reveal` | 공개: 연도 도장이 찍힐 때 | 화음(`chord`) | `proto3d/game/` 관측소 원정 |
| `game-hit` | 공개: 적중 카드 | 적중음(`reveal-hit`) | `proto3d/game/` 관측소 원정 |
| `game-miss` | 공개: 빗나감 카드 | 빗나감음(`reveal-miss`) | `proto3d/game/` 관측소 원정 |
| `game-count` | 공개: 점수가 올라갈 때 | 틱(`tick`) | `proto3d/game/` 관측소 원정 |
