# AGENTS.md — AI 코딩 도구(Codex 등) 작업 규칙

팀원이 Codex 같은 AI 도구로 이 저장소를 고칠 때 따르는 규칙이다. 사람이 읽는 안내는 `README.md`에 있다.

**2026-11-12 방향 전환:** 메인 화면을 2D Phaser에서 3D(React Three Fiber)로 바꾸고, 톤을 감성·힐링에서 세련되고 건조하게 바꾼다. 설계서는 `docs/redesign.md`이고, `docs/ux-spec.md`보다 우선한다.

## 먼저 읽을 것

1. `docs/redesign.md` — 지금의 설계서
2. `README.md`, `docs/features.md` — 이미 만든 기능과 `app/core/` 로직 위치
3. `collab/log.md`의 최근 기록
4. 옛 설계(`docs/ux-spec.md`)는 기존 기능의 의도를 볼 때만 참고한다.

## 규칙

- 새 화면은 React Three Fiber(`app/proto3d/`)로 만든다. 로직은 `app/core/`에 엔진과 상관없이 둔다. Phaser 앱은 3D가 같은 기능에 도달할 때까지 남겨 둔다.
- 3D 모델은 Blender 스크립트(`tools/blender/`), CC0 팩, 도구를 자유롭게 쓴다.
  - 결과물은 `public/models/`에 두고 `app/proto3d/models.ts` 매니페스트에 등록한다.
  - 받은 에셋의 출처는 `public/models/CREDITS.md`에 적는다.
- 지금 데이터는 모의다. 실제 과거 사례 데이터와 서버 DB는 쓰기로 했다(`docs/redesign.md` 8장 R5). 대사·뉴스·퀴즈·탐지는 `app/content/`의 공급자를 거친다. 주문·거래는 연결하지 않는다.
- 캐릭터 대사에 매매 권유("팔아", "사", "계속 들고 있어")나 가격 예측("오를 거야")을 넣지 않는다. 모델이 본 것을 말하고 판단은 사용자에게 둔다. 톤은 `docs/redesign.md` 2장을 따른다.
- 수익률을 보상 계산에 쓰지 않는다.
- `public/assets/incoming/`과 `collab/from-gpt/`는 읽기만 한다.
- 배포 설정(`worker/`, `lib/connector*`, `.openai/`, `vite.config.ts`의 호스팅 부분)은 바꾸지 않는다.
- 토큰·비밀값을 코드, 문서, 출력에 남기지 않는다.
- 시간값은 `app/core/timing.ts`에, 3D 룩 값은 `app/proto3d/look.ts`에 둔다.

## 작업을 마치기 전에

```bash
node node_modules/typescript/bin/tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
```

- 새 계산 로직에는 `tests/*.test.mjs` 단위 테스트, 새 화면 동작에는 `tests/e2e/` 테스트를 붙인다.
- `collab/log.md`에 한 줄 남긴다.
- 커밋 메시지: `[R-n] 요약`, `[stage-n] 요약`, `[asset NNN] 요약`, `[fix] 요약`, `[docs] 요약`.

## 작동 테스트만 맡았을 때

요청서(`collab/to-gpt/NNN-test-*.md`)를 받아 테스트만 하는 경우에는 코드·문서를 고치지 않고, `collab/templates/test-report.md` 양식으로 `collab/from-gpt/`에 보고서를 쓴다. 검수한 커밋 SHA를 적고, 실행하지 못한 것은 Not Tested와 이유를 쓴다. 자세한 절차는 `docs/COLLABORATION.md` 7장.
