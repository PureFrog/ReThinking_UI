# 배포: Netlify + Supabase (2026-11-16 결정)

| 맡는 곳 | 하는 일 |
|---|---|
| **Netlify** | 사이트 파일(3D 정원 화면)만 내려준다. 정적 내보내기 빌드. |
| **Supabase** | 로그인(이메일·카카오·구글), DB, 정원 동기화, Realtime(접속 표시·리그), Edge Functions(보리 대화, 지기 AI, 챌린지 점수 검증) |
| **게임 서버 (나중)** | 여러 명이 한 판을 초 단위로 같이 하는 실시간 게임이 생기면 따로 띄운다(예: Colyseus를 Fly.io·Render에). 화면은 그대로 Netlify. |

옛 chatgpt.site(OpenAI Sites, Cloudflare 워커) 배포는 쓰지 않는다. 워커 빌드(`pnpm build`)는 지우지 않고 그대로 두고, Netlify는 그 옆에 `STATIC_EXPORT=1`로 따로 빌드한다.

## 지금 배포 (2026-11-16)

- 주소: **https://rethinking7.netlify.app** (프로젝트 이름 rethinking7, 공개)
- 방식: 내 PC에서 정적 빌드 → CLI로 올림. 저장소 자동 배포는 아직(저장소가 PureFrog 계정 것이라 주인이 Netlify 앱을 허락해야 함).
- 다시 올리기: `STATIC_EXPORT=1 corepack pnpm build` 뒤 `npx netlify-cli deploy --prod --no-build --dir dist/client --site 6b8bcce3-aa19-48fb-af08-944b6c87e174`
  (이름으로 지정하면 못 찾을 때가 있어서 사이트 ID로. `--no-build`: netlify.toml의 빌드를 다시 돌리지 않음)
- 오른쪽 아래 "Powered by Netlify" 배지가 메뉴를 가림 → Netlify 설정에서 끄기

## 이미 해 둔 것

- `next.config.ts`: `STATIC_EXPORT=1`이면 `output: 'export'`. 없으면 예전과 같다.
- `netlify.toml`: 빌드 명령 `corepack enable && pnpm install --frozen-lockfile && STATIC_EXPORT=1 pnpm build`, 게시 폴더 `dist/client`, 모델·에셋 캐시.
- 확인: 정적 빌드를 서버 없이 띄워 첫 화면(로고·시작하기)과 데모 정원이 오류·404 없이 뜨는 것을 봤다(2026-11-16). `/`만 정적 페이지로 나오고 `/proto3d`(개발용 같은 화면)·`/classic`(옛 2D)은 빠진다.

## 처음 올리는 순서

1. **커밋·푸시** (사용자 OK 후). Netlify는 깃헙 저장소에서 빌드한다.
2. **Netlify 사이트 만들기**: app.netlify.com → Add new site → Import from GitHub → 이 저장소.
   - 저장소가 팀원 계정 것이라 목록에 안 보이면(Supabase 때와 같은 문제): 저장소 주인이 Netlify GitHub 앱에 그 저장소 접근을 허락해야 한다. 아니면 내 PC에서 `npx netlify-cli deploy --prod --dir dist/client`로 직접 올린다(먼저 `STATIC_EXPORT=1` 빌드).
   - 빌드 설정은 `netlify.toml`을 읽으니 따로 안 넣어도 된다.
3. **환경 변수** (Netlify → Site configuration → Environment variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable 키. `sb_secret_`·service_role 키는 절대 아님)
   - 넣고 나서 다시 빌드해야 들어간다(빌드할 때 코드에 박힌다).
4. **Supabase 주소 허용**: Authentication → URL Configuration
   - Site URL: `https://rethinking7.netlify.app` (설정함, 2026-11-16)
   - Redirect URLs에 `https://<그 주소>/**` 추가. localhost 두 개는 개발용으로 남긴다.
   - 카카오·구글 개발자 콘솔은 리디렉트가 Supabase 주소라 안 바꿔도 된다.
5. **배포 주소에서 확인**: 첫 화면 → 이메일 가입·로그인 → 카카오·구글 → 정원 → 일지 쓰기 → 다른 기기에서 같은 계정으로 들어가 정원이 따라오는지.

## 주의

- 깃헙에 올라가는 건 `.env.local`이 아니다(gitignore). 키는 Netlify 환경 변수와 Supabase 시크릿에만 둔다.
- OpenAI 키는 Netlify에도 넣지 않는다. Supabase Edge Functions 시크릿에만.
- 플레이스토어로 갈 때는 이 사이트를 그대로 감싸는 방식(TWA)이 가장 가볍다. 그때 도메인 소유 확인(`/.well-known/assetlinks.json`)이 필요하다.
