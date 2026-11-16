# 서버 DB 계획 (R5)

## Supabase 시작하기 (계정·DB) — 2026-11-15

서버는 **Supabase**로 정했어(로그인: 이메일·카카오·구글). 앱 코드는 준비돼 있고, 아래 키가 `.env.local`에 들어오면 자동으로 Supabase 로그인으로 바뀌어(`app/proto3d/supabase.ts`, `server.ts`의 `authRepo`). 키가 없으면 지금처럼 이 기기에만 저장되는 모의 계정으로 돌아가.

비밀번호·비밀키는 채팅이나 코드에 붙이지 마. 아래 순서대로 대시보드에서 직접 넣으면 돼.

1. **프로젝트 만들기**: supabase.com 가입 → New project. 지역은 Northeast Asia (Seoul). DB 비밀번호는 네가 보관해.
2. **DB 만들기**: 왼쪽 SQL Editor → `db/schema.sql` 내용을 통째로 붙여 넣고 Run.
3. **키 넣기**: Project Settings → API에서 두 값을 복사해서, 저장소 맨 위에 `.env.local` 파일을 만들어 넣어(이 파일은 git에 안 올라가).
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public 키>
   ```
   `service_role` 키는 절대 넣지 마. 그건 서버 함수 전용이야.
4. **주소 허용**: Authentication → URL Configuration
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**` (배포 주소가 생기면 그것도 추가)
5. **이메일 로그인**: Authentication → Providers → Email 켜기. "Confirm email"을 켜면 가입 후 메일 링크를 눌러야 시작돼(팀 테스트 중엔 꺼도 돼).
6. **카카오**: developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가
   - 앱 키의 **REST API 키**가 Client ID, 보안 → **Client Secret** 생성
   - 카카오 로그인 활성화, Redirect URI에 `https://<프로젝트>.supabase.co/auth/v1/callback`
   - 동의항목: 닉네임, 카카오계정(이메일). 이메일은 비즈 앱 전환이 필요할 수 있어.
   - Supabase → Authentication → Providers → Kakao에 두 값 넣고 켜기
7. **구글**: console.cloud.google.com → API 및 서비스 → OAuth 동의 화면 설정 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<프로젝트>.supabase.co/auth/v1/callback`
   - Supabase → Providers → Google에 클라이언트 ID·보안 비밀 넣고 켜기
8. **팀원 계정**: 각자 앱에서 가입하면 돼. 대신 만들어 줄 땐 Authentication → Users → Invite user.
9. 개발 서버를 껐다 켜면(`corepack pnpm dev`) 새 키를 읽어.

10. **정원 저장·계정 삭제**: SQL Editor → `db/migrations/002_saves_and_delete.sql`을 붙여 넣고 Run.
    - `garden_saves`: 로그인한 사람의 정원(판단·채점·원정 기록 포함)을 통째로 한 줄에 저장해. 본인만 읽고 써(RLS).
    - `delete_me()`: 설정 → 계정 → 계정 삭제 버튼이 부르는 함수. 그 사람의 모든 행과 로그인 계정을 지워.
    - `friend_talk`: 보리 자유 대화를 하루 몇 번 했는지만 세(요금 폭주 방지).
11. **보리 자유 대화(OpenAI)**:
    - 터미널에서 `node tools/build-functions.mjs friend-chat` → `db/functions/friend-chat/bundle.js`가 생겨.
    - Supabase → Edge Functions → Deploy a new function → Via Editor → 이름 `friend-chat` → bundle.js 내용을 통째로 붙여 넣고 Deploy.
    - Edge Functions → Secrets에 `OPENAI_API_KEY` 추가(모델을 바꾸려면 `OPENAI_MODEL`, 기본 gpt-4.1-mini). 이 키는 앱·.env.local·채팅에 절대 넣지 마.
    - 앱에서 로그인한 상태로 보리를 누르면 입력창이 열려. 키가 없거나 함수가 없으면 보리가 "지금은 대답을 못 하겠어"라고 해.

12. **지기 일지 표·LLM**: SQL Editor → `db/migrations/003_jigi.sql` Run.
    - `journals`·`hypotheses`: 내 일지와 가설을 한 줄씩 저장(본인만). 예시 일지는 안 보내고, 연습 일지는 practice로 표시돼.
    - `llm_use`: 지기 LLM 하루 사용량(1인 하루 40번).
    - `delete_me()`가 이 표들까지 지우게 바뀌어.
    - `node tools/build-functions.mjs jigi-llm` → Edge Functions에 `jigi-llm` 이름으로 `db/functions/jigi-llm/bundle.js`를 붙여 넣고 Deploy. 시크릿은 friend-chat과 같은 `OPENAI_API_KEY`를 써.
    - 앱에서 로그인한 상태면: 가설 뽑기(호출 A), 작성 도움 질문(B), 분석 설명 문장(C)이 OpenAI로 나와. 함수가 없거나 답이 규칙을 어기면 지금처럼 규칙 기반 문장으로 돌아가.

13. **캡처 사진 읽기(OpenAI 비전)**: `node tools/build-functions.mjs portfolio-read` → Edge Functions에 `portfolio-read`로 `db/functions/portfolio-read/bundle.js` 붙여 넣고 Deploy. 시크릿은 같은 `OPENAI_API_KEY`(모델 바꾸려면 `OPENAI_VISION_MODEL`, 기본 gpt-4.1-mini).
    - 로그인한 사람만 실제로 읽어(지기 AI와 합쳐 하루 40번). 손님은 예시 4종목이 나오고 화면에 그렇게 써 있어.
    - 사진은 앱에서 1600px로 줄여 한 번 보내고 저장하지 않아. 계좌번호·총액은 읽지 않게 했어(`app/core/capture.ts`).
    - 국외 이전 동의 문구에 "올린 캡처"를 넣었어. 이미 동의한 사람은 예전 문구에 동의한 거라, 정식 출시 전에 다시 받을지 정해야 해.

14. **보리 대화 (정균 1번 LLM, `docs/llm1.md`)**: SQL Editor에서 `db/migrations/004_llm1.sql` Run → `node tools/build-functions.mjs bori-talk` → Edge Functions에 `bori-talk` 이름으로 `db/functions/bori-talk/bundle.js`를 붙여 넣고 Deploy. 시크릿은 같은 `OPENAI_API_KEY`.
   - 손절 신호 대화(2단계): `db/migrations/005_llm1_detection.sql`도 Run (004 다음). 함수는 같은 `bori-talk`를 다시 빌드해서 붙여 넣으면 된다.
    - 로그인한 상태에서 보리를 눌러 말을 걸면 이 함수가 대답하고, 내가 한 말에서 투자 성향·종목 생각을 배워 프로필에 남겨(보리의 말은 근거가 안 됨).
    - 예전 `friend-chat` 함수는 더 이상 앱이 부르지 않아. 지워도 돼.
    - 모델: 모든 텍스트 함수의 기본은 GPT-6 Luna(`app/core/llmModel.ts`). 바꾸려면 시크릿 `OPENAI_MODEL`.

들어가는 것: 가입하면 `players` 표에 닉네임과 동의 내역이 생겨(트리거). 카카오·구글로 처음 들어온 사람은 동의 화면을 한 번 거쳐.

정원 동기화(`app/proto3d/sync.ts`, 규칙은 `app/core/sync.ts`): 로그인하면 서버의 정원과 이 기기의 정원을 비교해서 **더 최근 것**을 써. 빈 정원은 심어 둔 정원을 절대 덮지 않아. 그 뒤로는 바뀔 때마다 2.5초 뒤 서버에 올려. 손님·`?demo`는 동기화 안 해. 두 폰에서 동시에 하면 나중 것이 남아(합치기 없음).

다음 단계: 판단·채점을 표(`judgments`, `grades`)로 나눠 저장하고 실제 가격으로 서버 채점, 리그·다른 유저 실시간, 반박 분석 LLM(팀원 인과그래프·Toulmin 파이프라인)과 분석가별 말투.


지금은 **키가 들어오기 전이라 연결 안 돼 있어.** 앱은 브라우저 저장(`rethink-garden-v1`)과 로컬 모의 리그로 돌아가.
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
