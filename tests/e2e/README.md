# 작동 테스트 (Playwright)

Claude가 단계마다 핵심 동작을 테스트로 추가한다. 0단계에서 Playwright 설치와 `pnpm test:e2e` 스크립트를 만든다.

- 파일명: `stage-<n>-<이름>.spec.ts`
- 테스트 이름에는 근거가 된 `ux-spec.md` 절을 넣는다. 예: `11.3 말풍선 클릭 시 안내 토스트가 뜨지 않는다`
- 화면 크기: 데스크톱 1400×1050, 모바일 375×812
- 결과물은 `test-results/`에 저장되고 커밋하지 않는다
- `test`와 `expect`는 `@playwright/test`가 아니라 `./fixtures`에서 가져온다. 앱은 실시간 모드로 열리는데(스펙 4장), fixtures가 모든 페이지를 시연 모드로 시작하게 한다. 실시간 모드를 시험할 때는 저장값에 `settings.timeMode: "realtime"`을 넣는다 (`stage-8-time.spec.ts`)
