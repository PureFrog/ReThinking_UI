# AGENTS.md — ChatGPT / Codex 작업 규칙

이 저장소의 코드는 Claude가 맡는다. ChatGPT(Codex 포함)의 역할은 **이미지 에셋 제작**과 **기능 QA**뿐이다. 자세한 절차는 `docs/COLLABORATION.md`를 따른다.

## 먼저 읽을 것

1. `docs/COLLABORATION.md` — 역할, 절차, 에셋·QA 규칙
2. `docs/ux-spec.md` 6장(아트 디렉션·에셋 규격), 11.16(금지 목록)

## 할 수 있는 것

- 에셋 Issue(`asset-request`)에 적힌 이미지를 만들어 `assets/<묶음 이름>` 브랜치의 `public/assets/` 아래에 올리기
- Preview에서 기능 QA를 하고 PR 댓글로 보고하기
- 최초 코드 이전 (COLLABORATION.md 4장 1번, 한 번만)

## 하지 않는 것

- 코드·설정·명세 문서(`ux-spec.md`, `CLAUDE.md`, 이 파일) 수정
- `main` 브랜치에 직접 푸시 (최초 코드 이전 제외)
- 기존 에셋 덮어쓰기 — 고친 버전은 `_v2` 같은 새 파일명으로
- 승인 단계 건너뛰기 (스타일 시안 → 레퍼런스 시트 → 프레임, 승인은 사용자만)
- 실제 기업 로고·상표 그리기
- 디자인 의견을 버그처럼 보고하기 — 의견은 "제안"으로 따로
- 토큰·비밀값을 파일이나 출력에 남기기
- 확인하지 않은 것을 확인했다고 보고하기
