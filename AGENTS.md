# AGENTS.md — AI 코딩 도구(Codex 등) 작업 규칙

팀원이 Codex 같은 AI 도구로 이 저장소를 고칠 때 따르는 규칙이다. 사람이 읽는 안내는 `README.md`, 설계는 `docs/ux-spec.md`에 있다.

## 먼저 읽을 것

1. `README.md` — 실행 방법, 폴더 구조, 꼭 지킬 것
   - `docs/features.md` — 만든 기능 전부, 바꿔 끼울 곳, 체험용 주소, 남은 일
2. `docs/ux-spec.md` — 13.7 사용자 결정 기록, 11.16 금지 목록
3. `collab/log.md`의 최근 기록, `docs/deferred.md`

## 절대 규칙

- 실제 금융 데이터, 공시 API, LLM API, 주문·거래, 서버 DB를 연결하지 않는다. 모든 데이터는 모의 데이터. 대사·뉴스·퀴즈는 `app/content/`의 공급자를 거친다.
- 친구 대사에 매매 권유("팔아", "사", "계속 들고 있어")나 가격 예측("오를 거야")을 넣지 않는다. 사실 전달, 질문, 사용자가 쓴 이유 다시 읽기만 한다.
- 수익률을 보상 계산에 쓰지 않는다.
- 그림의 색·모양을 코드로 바꾸지 않는다(틴트, 덧칠, 늘이기 금지). `public/assets/incoming/`과 `collab/from-gpt/`는 읽기만 한다.
- React + Phaser를 유지한다.
- 배포 설정(`worker/`, `lib/connector*`, `.openai/`, `vite.config.ts`의 호스팅 부분)은 바꾸지 않는다.
- 토큰·비밀값을 코드, 문서, 출력에 남기지 않는다.
- `docs/ux-spec.md`의 [결정]을 바꿔야 하면 코드를 고치기 전에 팀에 먼저 묻는다.
- 시간값은 `app/core/timing.ts` 한 곳에 둔다.

## 작업을 마치기 전에

```bash
node node_modules/typescript/bin/tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
```

- 새 계산 로직에는 `tests/*.test.mjs` 단위 테스트, 새 화면 동작에는 `tests/e2e/` 테스트를 붙인다.
- `collab/log.md`에 한 줄 남긴다.
- 커밋 메시지: `[stage-n] 요약`, `[asset NNN] 요약`, `[fix] 요약`, `[docs] 요약`.

## 작동 테스트만 맡았을 때

요청서(`collab/to-gpt/NNN-test-*.md`)를 받아 테스트만 하는 경우에는 코드·문서를 고치지 않고, `collab/templates/test-report.md` 양식으로 `collab/from-gpt/`에 보고서를 쓴다. 검수한 커밋 SHA를 적고, 실행하지 못한 것은 Not Tested와 이유를 쓴다. 자세한 절차는 `docs/COLLABORATION.md` 7장.
