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
| `engine.py` 탐지 모드 (receive_stop_loss_signal, start_next_pending_detection, _apply_elicitation, pause/resume, investor_background, 연속 질문 검사) | `engine.ts` `receiveStopLossSignal` `startNextPendingDetection` `runTurn`(모드 자동) `pauseElicitation` `resumeElicitation` | 옮김 (2단계, 2026-11-16) |
| `elicitation.py` | `app/core/llm1/elicitation.ts` | 옮김 (근거 add/replace/retract, 단순 호응·new_reflection 소급 거부, 종료 검증, 전달 패킷 v2.0 `conversation: [{question, answer}]`, 2026-11-17 정균 changed_files 반영으로 S4 입력 변환 없앰) |
| `schemas.py` ElicitationTurnOutput | `validate.ts` `checkTurn`, `prompt.ts` `ELICITATION_SCHEMA` | 옮김 |
| `delivery.py` (작업·워커·수신 측) | `engine.ts` `runDeliveryWorker` + 수신함 `analysis_inbox` 표 (`005_llm1_detection.sql`) | 옮김 (sha256 해시 영수증, 재시도 5초→30초→2분→10분→30분, 인수 확인 뒤 원문 삭제) |
| `engine.py` `expire_stale` (7일 무응답 만료, 전달 기록 30일 보존) | `engine.ts` `expireStale` — 서버 함수가 매 호출 처음에 돌린다 | 옮김 (2026-11-16) |
| `engine.py` `reopen_for_correction` (전달 뒤 정정 → 새 수집 세션) | `engine.ts` `reopenForCorrection`, 서버 함수 `reopen {request_id}` | 옮김 (2026-11-16). 패킷에 `supersedes_request_id`가 붙는다 |
| `engine.py` `_log_turn` + `db.py` `ops_log.jsonl` | `engine.ts` `opsEntry` → Supabase `llm1_ops` 표 (`db/migrations/006_llm1_ops.sql`) | 옮김 (2026-11-16). 대사 원문은 남기지 않는다 |
| `data/seed/companies/*.json` (가상 DEMO-A~E) | `app/content/llm1/companies.json` — 같은 형식으로 우리 12개 종목(삼성전자 등) | 새로 씀 (2026-11-16). 사업 구조만, 숫자·최근 사건은 비움(`unknowns`). 출처 `rt_overview_v1`은 원문 대조 전 |
| Gemini 클라이언트, `chat.py`, `run_demo.py` | — | 안 옮김 (OpenAI만 쓰기로 함, 대화 화면은 앱) |

## 원본과 다른 점

- 대화는 플레이어당 하나(`session_id = s1`). 원본은 세션을 여럿 열 수 있다.
- 기업 자료는 우리 12개 종목만 있다(`companies.json`). 그 밖의 종목은 `COMPANY_CONTEXT`에 코드·이름만 넣는다. 사업부 비중·최근 사건은 비어 있다. 뉴스(`NEWS_CONTEXT`)도 비어 있다. 실제 기업·뉴스 수집이 붙으면 채운다.
- 보유 종목은 앱이 매 호출에 보낸다(정원의 나무: 종목 코드 + 이름). company_views 경로는 이 종목들만 쓸 수 있다.
- 하루 AI 호출 한도(1인 40번)를 지기 AI·캡처 읽기와 같이 센다(`llm_take`).
- 손절 신호는 아직 자사 탐지 모델이 아니라 앱의 모의 신호(`content/signals.ts`의 손실 신호)가 보낸다: 보리 창을 열 때 앱이 오늘 손실 신호 종목 코드를 `open`으로 보내고, 서버가 중복을 거른 뒤 가장 오래된 것부터 보리가 먼저 말을 건다. 실제 탐지 모델이 붙으면 서버에서 `receiveStopLossSignal`을 바로 부르면 된다.
- 분석 모델(S4 툴민 분석)은 아직 없다. 패킷은 `analysis_inbox`에 쌓이고 `analyzed_at`이 비어 있다. 분석 워커가 생기면 이 표를 읽는다. 패킷 본문은 `conversation`(질문·답 쌍): `answer`는 사용자 발언 원문 한 개씩, `question`은 바로 앞 보리 대사가 질문이었으면 그 대사, 아니면 null. 정정·철회 발언도 말한 순서대로 들어간다.
- 전달 워커는 따로 돌지 않고 매 호출 끝에 한 번 돈다(실패하면 다음 호출 때 재시도).
- 만료는 정해진 시각에 따로 돌지 않고, 그 플레이어의 다음 호출 때 처리된다.

## 테스트

`tests/llm1-elicitation.test.mjs` 13개: 원본 `test_elicitation.py`·`test_delivery.py` 시나리오(보유 종목만·중복 신호 제거·대기열, 보리가 먼저 말 걸기·한 번에 한 대화, 캐릭터 말·단순 호응은 근거 아님, new_reflection 소급 금지, "그리고 하나 더"면 종료 금지, 종료 응답에 질문 금지·근거 없으면 종료 금지, "그만하자"는 보류·재개, revision 충돌, 재시도 백오프·영수증 확인 뒤 원문 삭제·다음 신호, 해시 불일치·충돌, 연속 질문 3번째 막기, 7일 만료·전달 기록 30일 삭제, 전달 뒤 정정 재개, 운영 로그에 원문 없음·기업 자료가 COMPANY_CONTEXT로).
`tests/e2e/proto3d-friend.spec.ts`: 손실 신호가 있으면 보리 창이 손절 신호 대화로 열린다(서버는 `window.__boriOpen`으로 대신).

`tests/llm1.test.mjs` 10개: 원본 `test_daily.py`·`test_contracts.py`의 평상시 시나리오를 대본 모델로 옮겼다(처음 대화·기분 만료, 프롬프트·스키마, 수정 생성·고정 대사, 표정, 캐릭터 말은 근거 아님, 새 근거 없으면 승격 금지·삭제·차단·해제, 경로·자료형·나이·일반화, 전략 ID·미해결, 중복 ID·방문 한도·버퍼 만료, 기억 삭제 API).
실제 모델로 대화 품질을 본 것은 아직 없다(원본도 마찬가지, DESIGN_DIFF 0장).

## 켜는 법

`docs/server.md` 14번.

## 앱에서 보리가 먼저 오기 (2026-11-17)

- 손실 신호가 있는 날, 정원이 자리 잡고 2.5초 뒤(`TIMING.boriCome`) 보리가 플레이어 옆(`LOOK.boriCome`)으로 걸어온다.
- 그때 서버에 `open`을 한 번 부르고, 받은 첫 말을 보리 말풍선에 띄운다. 이때는 이 말풍선 하나만 보인다.
- 첫 말은 그날 하루 기기에 저장한다(`rethink-bori-open`). 대화창은 같은 말로 시작한다. 서버는 같은 대화를 두 번 열지 않는다.
- 하루 한 번만 온다. 말을 걸면 그날은 입구 자리로 돌아간다. 다시 재촉하지 않는다.

