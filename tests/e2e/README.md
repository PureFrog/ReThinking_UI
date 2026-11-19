# 작동 테스트 (Playwright)

Claude가 단계마다 핵심 동작을 테스트로 추가한다. 0단계에서 Playwright 설치와 `pnpm test:e2e` 스크립트를 만든다.

- 파일명: `stage-<n>-<이름>.spec.ts`
- 테스트 이름에는 근거가 된 `ux-spec.md` 절을 넣는다. 예: `11.3 말풍선 클릭 시 안내 토스트가 뜨지 않는다`
- 화면 크기: 데스크톱 1400×1050, 모바일 375×812. 3D는 세로 휴대폰이 기본이라 proto3d-orientation.spec.ts가 390×844(세로)·844×390(가로)을 직접 맞춰 검사
- 결과물은 `test-results/`에 저장되고 커밋하지 않는다
- `test`와 `expect`는 `@playwright/test`가 아니라 `./fixtures`에서 가져온다. 앱은 실시간 모드로 열리는데(스펙 4장), fixtures가 모든 페이지를 시연 모드로 시작하게 한다. 실시간 모드를 시험할 때는 저장값에 `settings.timeMode: "realtime"`을 넣는다 (`stage-8-time.spec.ts`)
- 3D "오!" 연출(W1~W3)은 `window.__proto3d.births`·`cutaway`·`capsules`·`capsuleFx`로 검사한다. 이 윈도우 PC의 헤드리스 렌더는 초당 2프레임쯤이라 몇 초짜리 연출이 검사 중에 끝나 있을 수 있다. 그래서 중간 상태는 연출 시작 직후에 먼저 보고, 지나간 건 저장값(`seen.birth`·`seen.bury`)으로 확인한다. 건너뛰기 버튼은 연출이 아직 돌 때만 누른다.
