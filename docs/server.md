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
   - 운영 로그·기업 자료·7일 만료(2026-11-16): `db/migrations/006_llm1_ops.sql`도 Run (005 다음). 함수 `bori-talk`를 다시 빌드해서 붙여 넣는다. 로그는 Table Editor의 `llm1_ops`에서 본다(대사 원문은 없음).
    - 로그인한 상태에서 보리를 눌러 말을 걸면 이 함수가 대답하고, 내가 한 말에서 투자 성향·종목 생각을 배워 프로필에 남겨(보리의 말은 근거가 안 됨).
    - 예전 `friend-chat` 함수는 더 이상 앱이 부르지 않아. 지워도 돼.
    - 모델: 모든 텍스트 함수의 기본은 GPT-6 Luna(`app/core/llmModel.ts`). 바꾸려면 시크릿 `OPENAI_MODEL`.
15. **입장코드 · 실제 시세 (비공개 테스트, 2026-11-17)**: SQL Editor에서 `db/migrations/007_invite_prices.sql` Run (006 다음).
    - 코드 만들기: Table Editor → `invite_codes` → Insert. `code`는 대문자(예: 팀만 아는 단어), `max_uses`는 몇 명까지. 코드는 저장소에 적지 않는다.
    - 로그인한 사람은 코드를 한 번 넣어야 정원이 열린다. "가입 없이 둘러보기"는 실서버에서도 열려 있다(2026-11-23, B2C 기본으로 다시 염): 정원은 그 기기에만, 서버로 아무것도 안 보내고, 보리 자유 대화·캡처 읽기·관측소 서버 채점은 로그인하면 열린다. 서버 함수 4개(`bori-talk`, `jigi-llm`, `portfolio-read`, `friend-chat`)도 코드 없으면 거절(403)하니 `node tools/build-functions.mjs`로 다시 빌드해서 붙여 넣는다.
    - 시세 올리기: investment-evidence-system의 매일 실행(`live.py`)이 KRX 하루치를 받은 뒤 `python tools/prices/push_prices.py --env <키가 든 .env 경로>`. `.env`에는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 두 줄(서비스 키는 이 파일에만, 코드·문서에 안 남김). 처음 실행은 2024-01-01부터 시가총액 상위 300 + 일지 12종목 + 정원 종목 일봉(약 20만 줄)을 올리고, 그 뒤로는 새 날짜만 올린다. `--dry`는 세기만 한다.
    - 앱: 내 종목 → "실제 시세로"에서 종목·산 날짜·수량을 넣으면 산 가격은 그날 실제 종가, 수익률은 최근 종가(`app/core/real.ts`). 실제 시세 나무에는 차트에서 읽은 숫자만으로 모아 신호가 뜬다(토리 재무 신호는 재무 자료가 붙을 때까지 없음).
16. **마스터 계정 (2026-11-17)**: SQL Editor에서 `db/migrations/008_master.sql` Run (007 다음). 그 계정으로 한 번 로그인한 뒤, SQL Editor에서 `insert into masters (player_id, note) select id, 'owner' from auth.users where email = '<그 계정 이메일>';`을 한 번 Run. 이메일은 저장소에 적지 않는다.
    - 마스터는 입장코드 없이 들어가고(코드 없는 `invite_uses` 행이 생김), AI 하루 한도(`llm_take`, `friend_talk_take`)를 안 받고, 앱이 코인을 9999까지 채우고 쓸 때마다 다시 채운다(`app/core/ledger.ts` MASTER). 옷장 전부·분석가 신뢰 단계도 다 열린다(`app/core/master.ts`). 서버 함수는 다시 붙일 필요 없다.

16. **오늘의 관측소 (일일 퀘스트, 2026-11-18)**: SQL Editor에서 `db/migrations/008_observatory.sql` Run (007 다음) → `node tools/build-functions.mjs quest-settle` → Edge Functions에 `quest-settle` 이름으로 `db/functions/quest-settle/bundle.js`를 붙여 넣고 Deploy. 시크릿은 따로 없어. **`bori-talk`도 다시 빌드해서 붙여 넣어**(아래 덮어쓰기 방지 때문).
    - 앱이 판을 끝내면 결정과 쓴 글만 보내. 서버가 같은 규칙(`app/core/game/daily/server.ts`)으로 다시 돌려서 일지 점수·투자 성과·XP를 계산하고, 앱이 보낸 점수는 안 읽어. 과제 순서 건너뛰기, 미래 날짜, 빈칸은 거절(422).
    - 기록: `quest_runs`(판마다 한 줄), `quest_awards`(XP 원장, 플레이어·날짜·과제마다 한 번). 같은 날 같은 과제를 다시 하면 연습이라 XP가 없고, 날짜가 지난 뒤 끝낸 판도 연습이야.
    - 프로필: `llm1_docs`의 'profile'(v5.0) 최상위 `investor_progress`에 숙련도를 써. 값은 원장에서 다시 계산하고, 저장된 revision이 읽은 그대로일 때만 써(바뀌었으면 다시 읽고 재시도). 프로필이 없는 사람은 템플릿으로 새로 만들어.
    - 보리(LLM)는 이 칸을 못 바꿔(필드 레지스트리에 경로가 없음). `bori-talk`은 대화하는 몇 초 사이에 XP가 들어와도 지워지지 않게, 프로필을 저장하기 직전에 최신 `investor_progress`를 다시 읽어 합쳐.
    - 순위: 함수의 `ranking`(닉네임·일지 점수·투자 성과, 내 줄 표시). 공개 뷰 `quest_daily`도 있어(쓴 글은 안 나감).
    - 로그인 상태에선 과제 해금도 서버 기록을 따라. 로그인 전에 이 기기에서 한 판은 이 기기 기록으로만 남아.
    - 예시 판(`app/content/daily/solbit.ts`, 가상 회사)은 함수 안에 같이 묶여 있어. 그날 배정된 공식 판이 없으면 예시 판을 연습으로 해.
    - 툴민 채점: 시크릿 `LLM_API_KEY`(+ `LLM_BASE_URL`, `MODEL_JUDGE`)를 넣으면 켜져. 서버가 답을 검사해(인용은 유저 문장 그대로, 카드는 그 장면에서 보이던 것, 요구한 축만). 같은 입력은 `quest_assessments`에 저장한 채점을 다시 써. 모델이 답을 못 하면 '평가 중'으로 두고(투자 성과만 먼저), 앱이 다시 물을 때(`result`) 채점해. 키가 없으면 체험용 채점.
17. **관측소 콘텐츠·공식 판 (2026-11-18)**: `db/migrations/009_content.sql` Run (008 다음) → `node tools/build-functions.mjs quest-content`, `quest-play`도 같은 방법으로 붙여 넣고 Deploy. `quest-settle`도 다시 빌드해서 붙여 넣는다.
    - 편집자 등록: Table Editor → `editors`에 `player_id`와 `role`(`editor` 올리기 / `approver` 승인·발행). 올린 사람은 자기 판을 승인할 수 없어.
    - 판 만들기(콘텐츠 기계에서): `node tools/content/build-pack.mjs [초안 모듈] --out content/packs`. 공급자마다 아래 환경변수가 있으면 실제 연결, 없으면 예시 데이터를 써. 보고서에 오류가 하나라도 있으면 판 파일을 안 만들어(미래 자료, 출처 없는 숫자·부호·단위·비교 기준, 추정을 확정처럼, 실명·티커·연도 노출, 카드 3~5장·두 해석, 수정주가, 거래정지, 분할·배당 한 번만, 13F는 CUSIP으로만, 거장 출처, 초상 사용권).
      - `SEC_USER_AGENT`(SEC 공시·13F, 연락처가 든 이름표. 개인 메일 말고 팀 주소), `MARKET_DATA_URL`/`MARKET_DATA_KEY`, `CORPORATE_ACTIONS_URL`/`CORPORATE_ACTIONS_KEY`, `NEWS_API_URL`/`NEWS_API_KEY`, `MACRO_API_URL`/`MACRO_API_KEY`, `POLICY_SOURCE_URL`, 거장 등록부는 `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY`, LLM은 `LLM_API_KEY`(+`LLM_BASE_URL`, `MODEL_EDITOR`·`MODEL_EXTRACT`·`MODEL_HINT`·`MODEL_JUDGE`·`MODEL_EXPLAIN`). 공급사를 정하면 그 회사 응답을 우리 계약으로 바꾸는 `map`만 끼우면 돼(`app/core/content/live/vendors.ts` 맨 위).
    - 발행: `quest-content`의 `upload`(판 + 보고서) → `approve`(승인자가 쓴 '보유' 일지와 '부분 매도' 일지가 둘 다 끝까지 플레이돼야 함) → `publish`(KST 날짜·레벨마다 판 하나, `level` 0은 자기 판이 없는 레벨 공통. 레벨 4·5 판에는 보통 비교 회사가 들어가). 발행된 버전은 못 고쳐(트리거). 고치려면 새 버전. 모든 동작은 `editor_audit`에 남아.
    - 공식 판 진행(`quest-play`): 앱은 지금 장면까지 잘린 판만 받아(뒤 장면은 빈 자리, 시세는 그 장면 날짜까지, 평가일·정체 공개 없음). 결정을 확정해야 다음 장면이 와. `quest-settle`은 장면마다 확정된 결정과 정확히 같은 것만 받아.
    - 거장 초상은 사용권을 확인한 것만 판에 들어가고, 아니면 이름 모노그램이야. 거장의 원문과 우리 해설은 따로 둬.
    - 발행 실패일: 그날 배정이 없으면 승인됐지만 안 쓴 판 중 가장 오래된 것을 자동으로 그날(레벨 0)에 배정하고 `editor_audit`에 'auto-assign'으로 남겨. 그것도 없으면 예시 판 연습(공식 판을 한 번이라도 발행한 뒤로는 순위·XP 없음).
    - 순위는 같은 날·판·과제(=레벨)·채점 버전끼리만. 50명씩 넘겨 봐.
18. **보상·운영 (2026-11-19)**: `db/migrations/010_rewards.sql`, `011_ops.sql` Run (009 다음). 함수 세 개(`quest-settle`, `quest-play`, `quest-content`)를 다시 빌드해서 붙여 넣는다.
    - 보상(`reward_grants`): 첫 완주 도장, 주 5회 장식, 날짜 마감 뒤 상위 10% 칭호(20명 미만 보류). 키 하나에 한 번.
    - 운영(`llm_task_log`): 서버 함수의 모델 호출마다 작업·모델·성공·지연·토큰 한 줄(글은 안 남김). 편집자 화면 `/editor`의 운영 탭(편집자 계정)에서 최근 7일 집계와 편집자 수정률을 봐.
    - 편집자 화면 `/editor`: `tools/content/build-pack.mjs`가 만든 `*.bundle.json`을 열어 고치면 검사가 바로 다시 돌고, 오류가 없으면 '서버에 올리기'(편집자 계정).
19. **하루 의뢰 하나 (피드백 F1, 2026-11-19)**: 마이그레이션은 없어. 함수 세 개(`quest-play`, `quest-settle`, `quest-content`)를 다시 빌드해서 붙여 넣는다.
    - 코스(과제 이름·순서·선행 조건)와 레벨 4·5 판은 서버에만 있다(`app/core/game/daily/course.ts`, `app/content/daily/server-packs.ts`). 앱은 이 두 파일을 import하지 않는다(단위 테스트가 막음).
    - `quest-play` `today`: 그날 받을 의뢰 하나(`def`)와 끝냈는지만 돌려준다. 미래 과제 목록은 어떤 응답에도 없다. `start`는 그 의뢰로만 열고, 오늘 이미 끝냈으면 `done-today`(연습은 `practice:true`).
    - `quest-settle`: 같은 날 다른 새 의뢰를 정산하려 하면 `one-a-day`로 거절(이미 끝낸 과제를 다시 하는 연습은 됨).
    - `quest-content` `course`: 편집자 화면이 레벨 미리보기에 쓰는 코스(편집자 계정만).
20. **일지 구조 (피드백 F2, 2026-11-19)**: 마이그레이션은 없어. 함수 네 개(`quest-play`, `quest-settle`, `quest-content`, `bori-talk`)를 다시 빌드해서 붙여 넣는다.
    - 일지 칸에 대상·기간·방향·판단 변화(`target`, `period`, `dir`, `shift`)가 더해졌어. 서버 재연은 목록에 있는 id·값만 받고, 초안 저장(`draft`)도 같이 저장해.
    - 공식 판의 장면 컷(`sceneDto`)은 발표값(`observe.actual`)을 빼고 보내. 끝난 뒤 전체 판에서만 보여.
    - 구조화된 가설은 예측 추출(A)을 부르지 않고 발표값으로 바로 판정해.
21. **결과 두 쪽 (피드백 F3, 2026-11-19)**: 마이그레이션은 없어. 입문(레벨 1)은 재검토 축 없이 철학 적용만 채점하도록 바뀌어서 `quest-settle`(과 같이 묶인 `quest-play`, `quest-content`, `bori-talk`)을 다시 빌드해서 붙여 넣는다. 툴민 채점 캐시는 입력에 활성 축이 들어 있어서 예전 채점과 섞이지 않아.
22. **흐름 재생 (피드백 F4, 2026-11-19)**: 마이그레이션은 없어. 함수 네 개를 다시 빌드해서 붙여 넣는다.
    - 판단 선택지가 보유 · 1/8 · 1/4 · 1/2 매도로 바뀌었어. 서버 재연은 이 넷만 받아(`fraction:<장면>` 오류).
    - 판에 `market`(달력·표시·수수료)과 `news`(거래일 틱·제목·출처)가 더해졌어. 체결 수수료는 판의 `market.fee`. 장면 컷은 뉴스도 그 장면 날까지만 보내.
    - 흐름 재생 위치(`play`)는 기기 상태라 서버로 안 가고, 서버 결과를 받아도 덮어쓰지 않아.

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
