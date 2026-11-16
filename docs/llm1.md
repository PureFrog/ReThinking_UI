# 1번 LLM (정균) → 보리 대화 (2026-11-16)

정균의 1번 LLM 프로토타입(카톡으로 받은 `LLM_N1`, 파이썬, 설계서 `FDS_LLM1_conversation_design_v1.md` v10)을 우리 서버(Supabase 서버 함수, TypeScript)로 옮겼다. 별도 파이썬 서버를 띄우지 않기로 했다(사용자 결정). 그래서 정균 코드와는 따로 고쳐야 한다. 정균이 원본을 바꾸면 이 문서의 표를 보고 같이 맞춘다.

## 무엇이 어디로 갔나

| 정균 원본 | 우리 쪽 | 상태 |
|---|---|---|
| `prompts/common.txt` `daily.txt` `elicitation.txt` `output_schema.txt` | `app/content/llm1/prompts.ts` (글자 그대로) | 옮김 |
| `data/seed/registry/*.json`, `dialogue_examples/philosophy_examples.json` | `app/content/llm1/*.json` (그대로 복사) | 옮김 |
| `character_personas/friend_01.json` (모아, 토끼) | `app/content/llm1/persona_bori.json` (보리, 기니피그) | 성격·말투 규칙·관계는 그대로, 이름·종족·생활만 바꿈. 금지 표현에 매매 권유·가격 예측 추가 |
| `registry.py` | `app/core/llm1/registry.ts` | 옮김 |
| `validation.py` + `schemas.py`(daily 출력 계약) | `app/core/llm1/validate.ts`, `prompt.ts`의 `DAILY_SCHEMA`(strict JSON schema) | 옮김. pydantic 대신 직접 짠 검사 |
| `profile_store.py` | `app/core/llm1/profile.ts` | 옮김 (set/remove/unblock, 차단 경로, 새 근거 없으면 승격 금지, 일반화 규칙, 전략 제안·ID 발급, revision 충돌, 기억 삭제) |
| `prompts.py` | `app/core/llm1/prompt.ts` | 옮김 |
| `engine.py` 평상시 모드 (open_session, start_visit, handle_message, spontaneous, _run_turn) | `app/core/llm1/engine.ts` `runTurn` | 옮김 (수정 생성 1회, 실패 시 고정 대사, 표정 검사, 뉴스 중복 제거, 대화 예시 고르기, 버퍼 24시간 만료, 기분 6시간, 중복 client_message_id, 방문당 먼저 말 걸기 1회) |
| `db.py` (JSON 파일 DB) | Supabase `llm1_docs` 표 (`db/migrations/004_llm1.sql`) | 대화·프로필 문서를 플레이어별 한 줄씩 |
| `llm.py` OpenAI 클라이언트 | `db/functions/bori-talk` (fetch + `response_format: json_schema` strict) | 모델 GPT-6 Luna, `app/core/llmModel.ts` |
| `engine.py` 탐지 모드, `elicitation.py`, `delivery.py` | — | **아직 안 옮김 (2단계)**: 손절 신호 → 근거 수집 대화 → 분석 모델로 전달 |
| Gemini 클라이언트, `chat.py`, `run_demo.py`, `ops_log` | — | 안 옮김 (OpenAI만 쓰기로 함) |

## 원본과 다른 점

- 대화는 플레이어당 하나(`session_id = s1`). 원본은 세션을 여럿 열 수 있다.
- 기업 자료(`companies/`)가 우리 앱엔 아직 없어서 `COMPANY_CONTEXT`는 보유 종목의 코드·이름만 넣는다. 뉴스(`NEWS_CONTEXT`)는 비어 있다. 실제 기업·뉴스 수집이 붙으면 채운다.
- 보유 종목은 앱이 매 호출에 보낸다(정원의 나무: 종목 코드 + 이름). company_views 경로는 이 종목들만 쓸 수 있다.
- 하루 AI 호출 한도(1인 40번)를 지기 AI·캡처 읽기와 같이 센다(`llm_take`).
- 운영 로그(`ops_log.jsonl`)는 아직 없다.

## 테스트

`tests/llm1.test.mjs` 10개: 원본 `test_daily.py`·`test_contracts.py`의 평상시 시나리오를 대본 모델로 옮겼다(처음 대화·기분 만료, 프롬프트·스키마, 수정 생성·고정 대사, 표정, 캐릭터 말은 근거 아님, 새 근거 없으면 승격 금지·삭제·차단·해제, 경로·자료형·나이·일반화, 전략 ID·미해결, 중복 ID·방문 한도·버퍼 만료, 기억 삭제 API).
실제 모델로 대화 품질을 본 것은 아직 없다(원본도 마찬가지, DESIGN_DIFF 0장).

## 켜는 법

`docs/server.md` 14번.
