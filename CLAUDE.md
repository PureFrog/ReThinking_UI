# ReThink Garden (작업 이름, 옛 이름 "마음이 자라는 정원")

**투자자가 다시 생각해볼 기회를 주는 서비스.** 내 포트폴리오를 3D 정원으로 보여주고, 우리 모델들(올슨·듀퐁·F-score·서서히·급락·반박)을 맡은 분석가 셋(토리·모아·루온)이 손실 신호를 짚어준다. 유저는 판단을 기록하고, 그 판단은 30·90일 뒤에 채점돼 돌아온다. 재미의 중심은 "내 판단이 맞았나"를 확인하는 순간이다. 모의투자 게임 모드는 팀원이 따로 프로토타입을 만들고 있고, 나중에 정원의 입구로 연결한다.

**2026-11-12에 방향을 바꿨다.** 2D Phaser에서 3D(React Three Fiber)로, 감성·힐링 톤에서 세련되고 건조한 톤으로 간다. 새 설계는 `docs/redesign.md`에 있고, `ux-spec.md`보다 우선한다.

이 저장소는 팀원들도 함께 쓴다. 설치·실행·폴더 구조는 `README.md`에 있다.

## 작업 전에 읽을 것

1. `docs/redesign.md` — 지금의 설계서 (톤, 캐릭터, 핵심 루프, 3D 제작 방식, 만드는 순서)
2. `README.md`, `docs/features.md` — 이미 만든 기능(2D 앱)과 `app/core/` 로직의 위치
3. `docs/handoff-2026-11-18.md` — 마지막 인계: 한 것, 남은 것, 하려던 방향, 정할 것
4. `collab/log.md`의 최근 기록 — 지금 어디까지 왔는지
5. 필요할 때만:
   - `docs/ux-spec.md` — 옛 설계서. 기존 기능이 원래 뭘 하려던 건지 볼 때만
   - `docs/deferred.md`
   - `docs/COLLABORATION.md`
   - `docs/archive/`

## 규칙

- **3D 메인**: 새 화면은 React Three Fiber로 만든다(`app/proto3d/`에서 시작). Phaser 2D 앱(`/`)은 3D가 같은 기능에 도달할 때까지 남겨 둔다. 로직은 `app/core/`에 엔진과 상관없이 둔다.
- **3D 에셋**: Blender(파이썬 스크립트로 자동 생성), CC0 에셋 팩, 플러그인과 도구를 자유롭게 쓴다.
  - 스크립트는 `tools/blender/`, 결과물은 `public/models/`, 출처는 `public/models/CREDITS.md`에 둔다.
  - 모든 모델은 매니페스트로 교체할 수 있게 한다.
- **데이터**: 지금은 모의 데이터다. 실제 과거 사례 데이터와 서버 DB는 쓰기로 했다(R5). 붙일 때 바꿔 끼울 곳은 `docs/features.md` 2장에 있다. 주문·거래는 연결하지 않는다.
- **대사**: 매매 권유("팔아", "사")와 가격 예측("오를 거야")을 넣지 않는다. 모델이 본 것을 말하고 판단은 유저에게 둔다. 톤은 `docs/redesign.md` 2장을 따른다.
- `collab/from-gpt/`와 `public/assets/incoming/`은 GPT 구역이다. 읽기만 한다.
- 커밋은 사용자가 하라고 할 때만 한다. 깃헙 푸시도 사용자가 OK한 상태만 한다.
- 배포·호스팅 설정은 사용자가 정하기 전에는 바꾸지 않는다.
- 토큰·비밀값을 코드, 문서, 출력에 남기지 않는다.

## 작업 방식

- 한 번에 한 단계(순서는 `docs/redesign.md` 8장). 시작 전에 바꿀 것을 3~5줄로 말하고 OK를 받는다.
- 단계마다 핵심 동작을 `tests/e2e/`에 Playwright 테스트로 추가한다. 3D 화면은 `window.__proto3d` 같은 훅으로 검사한다.
- 단계가 끝나면 보고한다:
  - 검사 결과
  - 실제 화면 스크린샷(세로 휴대폰 390×844가 기본, 가로 844×390, 데스크톱 1400px)
  - 전/후 비교
  - 화면을 직접 확인하지 못했으면 그렇다고 쓴다.
- 사용자의 감각 피드백("너무 빨라", "별로야")은 바로 고쳐서 다시 보여준다.
  - 3D 룩 값은 `app/proto3d/look.ts`에 둔다.
  - 시간값은 `app/core/timing.ts`에 둔다.
- 커밋 메시지: `[R-n] 요약`, `[stage-n] 요약`, `[asset NNN] 요약`, `[fix] 요약`, `[docs] 요약`.
- 사용자에게는 짧고 직설적인 반말 한국어로 설명한다.

## 완료 전 검사

```bash
node node_modules/typescript/bin/tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
```

- 윈도우에서는 `pnpm`을 `corepack pnpm`으로 부른다.
- 기존 로직 테스트(`tests/*.test.mjs`)는 계속 통과해야 한다. 새 계산 로직마다 테스트를 추가한다(`tests/load-app.mjs`의 `load('core/…')`).
- 2D 앱 e2e는 이 윈도우 PC에서 162개가 실패한다(변경 전 코드에서도 똑같이 실패, 원인 미확인). 3D 단계에서는 `tests/e2e/proto3d*.spec.ts`를 기준으로 본다.
