# 마음이 자라는 정원

**투자자가 다시 생각해볼 기회를 주는 서비스.** FDS A조 팀 프로젝트 '다시 생각해볼래?'의 사용자 경험 부분이다.

사용자는 캐릭터가 되어 아이소메트릭 집과 정원을 돌아다닌다. 주식 보유는 정원의 나무로 표현된다. 놀러 오는 동물 친구(모아·토리·루온)는 투자 의견을 말하지 않고, 사용자가 왜 그 종목을 샀는지 다시 생각하게 묻는다. 매일 오게 하는 힘은 퀴즈와 연속일 보상이다.

React 19 + Phaser 3.90 프로토타입이다. **모든 금융 데이터, 뉴스, 대사는 모의 데이터다.** 실제 시세·공시·LLM·주문·서버 DB는 연결하지 않는다.

## 빠른 시작

필요한 것: Node.js 22.13 이상, pnpm 11(`corepack enable`로 켜면 `package.json`의 버전이 자동으로 쓰인다).

```bash
git clone https://github.com/PureFrog/ReThinking_UI.git
cd ReThinking_UI
corepack enable
pnpm install
pnpm exec playwright install chromium   # e2e 테스트를 돌릴 사람만
pnpm dev
```

브라우저에서 http://127.0.0.1:5173 을 연다. 저장은 브라우저 localStorage(`little-garden-v3`)에만 된다. 처음부터 다시 보고 싶으면 개발자 도구에서 이 키를 지운다.

## 검사

작업을 마치기 전에 네 가지를 모두 통과시킨다.

```bash
node node_modules/typescript/bin/tsc --noEmit   # 타입 검사
pnpm test:unit                                  # 계산 로직 단위 테스트 (node:test)
pnpm test:e2e                                   # 화면 동작 테스트 (Playwright, 데스크톱 1400×1050·모바일 375×812)
pnpm build                                      # 빌드
```

- e2e는 개발 서버가 없으면 알아서 띄운다. 이미 `pnpm dev`가 떠 있으면 그걸 쓴다.
- 맥이 바쁠 때(부하가 높을 때) e2e 몇 개가 첫 화면 로딩에서 시간 초과로 실패할 수 있다. `pnpm test:e2e --last-failed --workers=2`로 다시 돌려 본다.

## 폴더 구조

```
app/
├── page.tsx          화면 전체: React 상태, 패널, 말풍선, 게임과 주고받는 이벤트
├── layout.tsx
├── globals.css
├── core/             계산 로직과 저장 (화면 없이 테스트할 수 있는 것)
│   ├── store.ts        저장 구조와 마이그레이션 (little-garden-v3)
│   ├── model.ts        나무 상태, 길찾기 같은 기본 모델
│   ├── timing.ts       모든 시간값 (여기 한 곳에만 둔다)
│   ├── care.ts · vitality.ts · retro.ts · letters.ts · achievements.ts · quiz-books.ts
│   ├── relationships.ts · memory.ts · gifts.ts · items.ts · decorate.ts
│   ├── visitor-machine.ts · visitor-tasks.ts · interaction-mode.ts · dialogue-pages.ts
│   └── sound.ts        효과음·목소리 합성과 소리 자리 목록 (docs/sound-map.md)
├── content/          바꿔 끼울 수 있는 내용 공급자 (나중에 백엔드·LLM으로 교체)
│   ├── content.ts      친구 대사는 전부 여기를 거친다
│   ├── dialogue/       친구별 대사 JSON
│   ├── friends.ts      친구 명부 (새 친구 = 여기 한 덩어리 + 대사 JSON)
│   ├── personas.ts     친구 성격 프리셋
│   └── news.ts         뉴스 OX 퀴즈 공급자 (지금은 모의 뉴스)
├── scene/            Phaser 게임 화면
│   ├── game.ts         장면 본체
│   ├── assets.ts       그림 목록 (없는 그림은 도형으로 대신 그린다)
│   ├── layout.ts       집·농장 칸 배치
│   └── visitor.ts · trees.ts · surfaces.ts · effects.ts · world.ts …
└── ui/               React 화면 조각 (말풍선, 서랍, 돌봄, 꾸미기 줄, 설정 …)

public/assets/        게임이 쓰는 그림
tests/
├── *.test.mjs        단위 테스트 (load-app.mjs가 app/의 TypeScript를 불러온다)
└── e2e/              Playwright 테스트 (stage-<n>-<이름>.spec.ts)
docs/                 설계와 기록 (아래 표)
collab/               그림 요청서와 작업 로그
scripts/              빌드 스크립트, scripts/art/ 그림 손질 도구, gpt-handoff.sh
worker/ · lib/ · .openai/   배포용 (건드리지 않는다)
```

## 문서

| 문서 | 무엇 |
| --- | --- |
| `docs/ux-spec.md` | **유일한 설계서.** 13.7 '사용자 결정 기록'이 같은 주제의 다른 결정보다 우선한다. 11.16은 금지 목록이다 |
| `docs/deferred.md` | 기능 구현을 먼저 하느라 뒤로 미룬 것 |
| `docs/sound-map.md` | 소리가 날 자리 75곳. `app/core/sound.ts`의 `SLOTS`와 같아야 한다 (단위 테스트가 검사) |
| `docs/characters.md` | 세 친구의 성격·말투 요약 |
| `docs/COLLABORATION.md` | 사람과 AI(Claude, GPT 그림, Codex 테스트)가 나눠 일하는 방식 |
| `collab/log.md` | 작업 기록. 무엇을 언제 왜 바꿨는지 한 줄씩 |
| `CLAUDE.md` · `AGENTS.md` | AI 도구가 매번 읽는 규칙 |
| `docs/archive/` | 옛 기록. 처음 GPT가 만든 프로토타입 인수인계서 등. 더 고치지 않는다 |

## 꼭 지킬 것

- **모의 데이터만.** 실제 금융 데이터, 공시 API, LLM API, 주문, 서버 DB를 연결하지 않는다. 대사·뉴스·퀴즈는 `app/content/`의 공급자를 거치게 해서 나중에 백엔드로 바꿔 끼운다.
- **친구는 투자 의견을 말하지 않는다.** "팔아", "사", "오를 거야" 같은 매매 권유나 가격 예측은 금지다. 할 수 있는 말은 사실 전달, 질문, 사용자가 쓴 이유 다시 읽어주기뿐이다 (ux-spec 3장).
- **수익률은 어떤 보상에도 쓰지 않는다.** 보상은 일지·퀴즈·회고 같은 성찰 행동에서만 나온다.
- **그림은 코드로 고치지 않는다.** 색을 바꾸거나 덧칠하거나 늘리지 않는다. 필요한 그림은 요청서(`collab/to-gpt/`, `collab/to-nanobanana/`)로 받는다. `public/assets/incoming/`과 `collab/from-gpt/`는 GPT가 넣는 곳이라 읽기만 한다.
- **시간값은 `app/core/timing.ts` 한 곳에** 둔다.
- **설계서의 [결정]을 바꿔야 하면** 코드를 고치기 전에 먼저 팀과 정한다.
- **배포 설정(`worker/`, `lib/connector*`, `.openai/`, `vite.config.ts`의 호스팅 부분)은 바꾸지 않는다.**
- **토큰·비밀값을 코드나 문서에 남기지 않는다.** `.env*`는 커밋되지 않는다.

## 작업 흐름

1. 한 번에 한 단계만 한다. 시작 전에 바꿀 것을 3~5줄로 정리해서 합의한다.
2. 단계마다 핵심 동작을 `tests/e2e/`에 테스트로 남기고, 새 계산 로직에는 단위 테스트를 붙인다.
3. 끝나면 검사 네 가지를 통과시키고, 데스크톱 1400px·모바일 375px 화면을 확인한다.
4. `collab/log.md`에 한 줄 남긴다.
5. 커밋 메시지: `[stage-n] 요약`, `[asset NNN] 요약`, `[fix] 요약`, `[docs] 요약`.

## git에 없는 것

아래는 만든 사람 컴퓨터에만 있고 git에는 올리지 않는다(`.gitignore`). 필요하면 만든 사람에게 받는다.

- `docs/screenshots/` 단계별 화면 기록
- `public/assets/incoming/` GPT가 처음 넘긴 원본 그림
- `collab/to-gpt/*/`, `collab/to-nanobanana/*/` 그림 요청서의 첨부 그림 (요청서 글은 git에 있다)

예전 커밋에는 이 파일들이 남아 있어서 저장소를 처음 받을 때 크기가 크다(약 260MB).
