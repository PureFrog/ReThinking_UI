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
| 관측소 원정 순위·제출 | `app/proto3d/server.ts` `expeditionRepo` (예시 순위) | `supabaseExpeditions(url, anonKey)` → `expedition_week` 뷰, `expedition-submit` 함수 |

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

## 알림 (판정 도착)

- 지금은 화면 안에서만 알려줘: "오늘 할 일" 시트의 "다음에 올 이유"(`core/today.ts` nextGrade)와 판정 도착 배너.
- 진짜 푸시는 앱 껍데기(웹뷰 앱)나 서버의 Web Push가 있어야 해. 서버가 붙으면 판단을 기록할 때 `nextGrade`의 날짜로 예약하면 돼.
- 문구는 매매 권유 없이: "강철중공업, 30일 판정 도착".

## 관측소 원정 (docs/game.md)

준비만 해 뒀어. 붙이는 순서는 이래.

1. `db/schema.sql` 아래쪽 `expedition_runs` 테이블과 `expedition_week` 뷰를 만들어. RLS는 켜져 있고, 쓰기는 서비스 키를 가진 함수만 해.
2. 서버 채점: `app/core/game/verify.ts`를 esbuild로 묶어서 `db/functions/expedition-submit/`에 넣고 Supabase 함수로 배포해(명령은 그 파일 맨 위). 함수는 받은 결정·주문·교체를 같은 판에서 다시 돌리고, 맞으면 **서버가 계산한 점수**만 저장해. 클라이언트가 보낸 점수는 안 받아.
3. 함수 환경변수: `PACKS_URL`(판 JSON이 올라간 사이트 주소), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. 대시보드에만 넣고 저장소에는 안 둬.
4. 앱: `app/proto3d/server.ts`의 `expeditionRepo`를 `supabaseExpeditions(url, anonKey)`로 바꿔. url과 anon 키는 빌드 환경에서 넘겨. 그러면 순위 화면의 "예시 순위 · 서버 연결 전"이 "이번 주 순위"로 바뀌어.
5. 로그인: 제출은 플레이어 JWT가 있어야 받아(함수가 `auth/v1/user`로 확인). 로그인 방식은 팀이 정해.

- 원정의 "주문"은 과거 판 안에서의 모의 움직임이야. 실제 주문·거래는 여전히 저장하지 않아.
- 주간 순위는 플레이어마다 그 주 판의 첫 판만 들어가(`distinct on`).
- 새 npm 패키지는 안 썼어. 앱은 fetch로 REST를 부르고, 함수는 Deno 기본만 써.
