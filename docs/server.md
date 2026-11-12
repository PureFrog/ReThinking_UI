# 서버 DB 계획 (R5)

지금은 **연결 안 돼 있어.** 앱은 브라우저 저장(`rethink-garden-v1`)과 로컬 모의 리그로 돌아가.
서버를 붙일 때 바꿔 끼울 곳만 정해 뒀어. 배포 설정은 건드리지 않았어. 어디에 띄울지는 팀이 정해.

## 바꿔 끼울 곳

| 무엇 | 지금(모의) | 서버를 붙이면 |
| --- | --- | --- |
| 오늘 시장 숫자 | `app/content/market.ts` `marketProvider` | 실제 지수 등락률·장중 변동폭 |
| 모델 신호 | `app/content/signals.ts` `signalProvider` | 팀 모델(올슨·F-score·듀퐁·서서히·급락·반박) 출력 |
| 판단 뒤 주가 움직임 | `app/content/outcomes.ts` `outcomeProvider` | 실제 가격으로 30·90일 등락 |
| 오늘의 케이스 | `app/content/cases.ts` `CASES` | `cases` 테이블(검증한 사실만) |
| 리그 | `app/proto3d/server.ts` `leagueRepo` | `league_groups`, `league_points` |
| 저장 | `app/proto3d/state.ts` (localStorage) | `judgments`, `grades`, `cooldowns`, `case_answers` |

채점 규칙(`app/core/judgment.ts`), 리그 규칙(`app/core/league.ts`), 냉각 규칙(`app/core/cooldown.ts`)은 서버를 붙여도 그대로야.
같은 규칙을 서버에서도 돌리려면 이 파일들을 그대로 가져가면 돼(엔진과 상관없는 TS).

## 스키마

`db/schema.sql`. Postgres 문법이라 Supabase에는 그대로 들어가. Cloudflare D1(지금 빌드가 워커 기반)이면 타입만 TEXT/INTEGER로 낮추면 돼.

- 주문·거래는 저장하지 않아.
- 수익률도 저장하지 않아. 판단 뒤 움직임(`grades.after_pct`)만 채점용으로 남아.
- 리그 이름은 `players.handle`이야. 실명은 기본으로 안 보여.

## 정할 것 (팀)

- 어디에 띄울지(Supabase / D1)와 언제 붙일지
- 로그인 방식
- 실제 가격 데이터 출처와 라이선스
- 케이스 사실 검증 담당(`cases.verified_by`)
