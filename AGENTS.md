# posselect-shell AI 개발 지침

> **캐논 참조**: 이 저장소의 공통 개발 원칙(DB/트랜잭션/보안/배포 규칙, 작업 기록 워크플로 등)은
> `~/msa/AGENTS.md`를 우선 따른다. 아래는 이 저장소만의 특이사항이다.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 저장소는

posselect 쇼핑몰의 공통 상단 Header / 하단 Footer를 **독립 배포되는 런타임 마이크로프론트엔드**로
서빙한다. Vite가 `header.js` / `footer.js`를 React까지 포함한 **독립 IIFE 번들**로 빌드하고,
`nginx:alpine`으로 `shell.posselect.com/v1/`에 정적 서빙한다. 호스트 앱(`customer.front` /
`store.front` / `product.front` / `admin.front`)은 이 저장소를 빌드 타임 의존성으로 **설치하지 않고**
`<script src="https://shell.posselect.com/v1/header.js">` + `<posselect-header>` 태그만 넣는다.

**따라서 여기에 push한 변경은 4개 프론트 전체에 즉시, 동시에 반영된다.** 재빌드를 기다리는 소비
저장소도, 단계적 롤아웃도, 버전 협상도 없다. 다른 컴포넌트 라이브러리라면 평범한 리팩터링일 변경이
여기서는 4개 앱에 대한 파괴적 변경이다.

`@posselect/ui`(posselect-ui)와 역할이 다르다: `@posselect/ui`는 라우팅/도메인/API를 전혀 모르는 순수
디자인 요소만 갖고, 이 저장소는 `customer.posselect.com` 같은 실제 도메인과 `/api/auth/me` 같은 실제
엔드포인트를 아는 "조합된 앱 셸"이다. 의존 방향은 이 저장소 → `@posselect/ui` 한 방향이다.

## 커맨드

```bash
npm install
npm run typecheck        # tsc --noEmit — CI가 돌리는 유일한 검증
npm run build            # dist/v1/header.js, dist/v1/footer.js (두 vite config 모두 빌드돼야 함)
npm run storybook        # Storybook 개발 서버, http://localhost:6006
npx vitest run           # 스토리 인터랙션 테스트(vitest.config.ts + @storybook/addon-vitest)
```

**`package.json`에 `test` 스크립트가 없다.** `vitest.config.ts`는 있고 playwright 브라우저 모드로
스토리를 돌리도록 설정돼 있지만, 실행하려면 `npx vitest run`을 직접 쳐야 한다.
CI(`.github/workflows/docker-image.yml`)가 배포 전에 돌리는 것은 `npm run typecheck` **하나뿐**이다 —
즉 **CI 통과는 동작이 멀쩡하다는 증거가 아니다.** 특히 레이아웃/반응형은 타입체크로 절대 안 잡힌다.

## 이 저장소의 최대 함정 두 가지

전체 서술은 `README.md`에 있으나, README를 안 읽고 작업하면 그대로 사고로 이어지는 두 가지를 여기
옮겨 둔다.

### 1. `/v1/` 계약은 되돌릴 수 없다

URL 경로에 메이저 버전을 박는다(`/v1/header.js`). `v1` 안에서의 스타일 조정·버그 수정은 즉시 전체
프론트에 전파되지만, **속성(attribute) 계약을 깨는 변경이나 마크업 구조를 크게 바꾸는 변경은 반드시
`/v2/`로 새로 만들어야 한다.** 기존 `v1`을 덮어쓰면 이미 그 URL을 참조 중인 프론트 4개가 예고 없이
동시에 깨진다.

계약의 실체(= 함부로 바꾸면 안 되는 것):

- **커스텀 엘리먼트 이름**: `<posselect-header>`, `<posselect-footer>` (`src/header.tsx` /
  `src/footer.tsx`의 `customElements.define`).
- **`<posselect-header>` 속성 4개**: `search-href`, `auth-api-base`, `cart-api-base`,
  `categories-api-base`. 각각 기본값이 있고, `attr()` 헬퍼가 `||`가 아니라 `hasAttribute`로 판단한다
  — 호스트가 "같은 origin이니 상대경로를 쓰라"는 뜻으로 넘긴 `attribute=""`와 아예 안 넘긴 경우를
  구분해야 하기 때문이다. 이 구분을 `||`로 되돌리면 빈 문자열이 falsy라 기본값으로 덮여버린다.
- **`<posselect-footer>`는 속성 없음** — 완전 정적.
- **전역 네임스페이스**: `window.posselect.recentlyViewed`(`add`/`get`/`clear`). 호스트가 이 저장소를
  import할 수 없으므로 최근 본 상품 API도 전역으로 노출된다 — 이것도 계약의 일부다.
- **`home-href` 속성은 제거됐다(2026-08-05).** 로고 목적지는 `src/components/Header.tsx`의 `HOME_URL`
  상수로 `https://home.posselect.com`에 고정돼 있다. 예전엔 호스트가 이 목적지를 바꿀 수 있어서
  `product.front`/`store.front`가 각자 `home-href="/"`를 넘겨 로고가 자기 루트로만 가는 문제가 있었다.
  지금 `home-href`를 넘기면 **에러 없이 조용히 무시된다**(커스텀 엘리먼트 특성).

속성/엘리먼트/전역 이름을 바꾸거나 지우기 전에는 `~/git/*.front`에서 `<script>` 태그와 그 이름들을
grep해서 실제로 누가 읽고 있는지 먼저 확인할 것.

### 2. 반응형은 병합 조건이고, 회귀는 테스트로 안 잡힌다

단일 진입점이라 여기서 반응형이 깨지면 posselect 전 서비스의 모바일 화면이 동시에 깨진다. 새로
만들거나 수정하는 마크업/스타일은 **최소 320px ~ 데스크톱 전 구간**에서 레이아웃이 깨지지 않아야 한다.

**회귀 사례 (2026-08-05)**: `.site-header-search`에 `flex: 1`만 있고 `min-width: 0`이 없었다. flex
아이템의 기본값인 `min-width: auto`가 검색창 내부 콘텐츠의 min-content 폭을 강제하는 바람에, 375px
화면에서 `.site-header-main`이 컨테이너 폭(356px)보다 넓은 실제 콘텐츠(538px)를 갖게 됐고,
`margin-left: auto`로 오른쪽에 붙어 있던 `.site-header-actions`(찜/마이페이지/장바구니 아이콘)가
**뷰포트 밖으로 완전히 밀려나 보이지도 클릭되지도 않는 상태**가 됐다. `@media (max-width: 768px)`
규칙은 이미 있었는데도 발생했다 — **"미디어쿼리가 있으니 반응형"은 착각이다.** 해결은
`src/styles.ts`에서 줄어들어야 하는 아이템에 `min-width: 0`, 고정폭을 유지해야 하는
아이템(`.site-header-actions`, `.site-header-menu-toggle`)에 `flex-shrink: 0`을 명시한 것.

2026-08-13에 같은 함정에 다시 걸렸다: 768px 규칙만 있고 그 아래 구간이 없어서 375px에서 검색창이
버튼만 남게 찌그러지며 문서 폭이 3px 초과돼 **전 페이지가 가로 스크롤**됐다. 480px 이하에서 검색창을
둘째 줄 전체 폭으로 내려 해결.

여기서 따라오는 규칙:

- 브레이크포인트는 **768px + 480px** 두 단계이고, 이 값은 `@posselect/ui`의 `tokens.css`
  ("Responsive layer")와 **공유하는 계약**이다. 미디어쿼리가 `var()`를 못 읽어서 리터럴로 중복돼
  있을 뿐이므로, 한쪽만 바꾸면 두 저장소가 갈라진다.
- **`tokens.css`에 없는 CSS 변수를 쓰지 말 것.** fallback 없는 `var()`는 무효라 그 선언이 통째로
  버려진다 — 조용히 죽는다. 실제로 `--space-5`가 정의되지 않은 채 카테고리 드로어 4곳에서 쓰이고
  있었고, 모바일 카테고리 패널이 여백 0으로 렌더링됐다(2026-08-13 발견).
- 검증은 눈으로가 아니라 숫자로. 320 / 375 / 768px 각각에서
  `document.documentElement.scrollWidth`가 `clientWidth`를 넘지 않는지 확인한다(3px 초과처럼 눈에 안
  띄는 값도 가로 스크롤바를 만든다). 배포된 페이지는 Shadow DOM 안이라 창을 줄이는 것만으로는 놓치기
  쉽다 — 실제 뷰포트 폭을 갖는 `<iframe>`이나 헤드리스 크롬을 쓸 것(README에 명령 있음).

## 인증 — Supabase가 아니라 게이트웨이 쿠키다

이 저장소는 인증을 **직접 처리하지 않는다.** `Header.tsx`가 `fetch(..., { credentials: 'include' })`로
`{auth-api-base}/api/auth/me`(기본 `https://customer.posselect.com`)를 호출하고, 브라우저가 실어 보내는
`ACCESS_TOKEN` 쿠키를 게이트웨이의 `JwtAuthenticationFilter`가 검증한다(RS256 + auth.api JWKS).
로그아웃도 같은 origin의 `POST /api/auth/logout`에 위임한다. 세션 저장소도, 토큰 파싱도, SSO 연동
코드도 이 저장소에는 없다 — 로그인 여부는 그 fetch의 성공/실패로만 안다.

크로스 도메인으로 동작하므로 쿠키/CORS 전제가 깨지면 헤더가 항상 로그아웃 상태로 보인다. 이 증상이
나오면 이 저장소가 아니라 gateway의 `PUBLIC_EXACT_PATHS`/CORS 설정부터 확인할 것.

## 스타일링

Shadow DOM으로 캡슐화한다 — 호스트 페이지 CSS와 충돌하지 않는다. 다만 `--color-*`, `--space-*` 등
`@posselect/ui` `tokens.css`의 CSS 커스텀 프로퍼티는 Shadow DOM 경계를 통과해 상속되므로, 호스트가
`import '@posselect/ui/tokens.css'`를 하고 있으면 테마가 그대로 맞춰진다. **이 저장소는 색상 값을
직접 정의하지 않는다.** 스타일은 전부 `src/styles.ts`의 `SHELL_CSS` 문자열에 있다.

Shadow DOM은 스타일만 격리한다. 전역 스코프(`window`, `document` 이벤트)는 호스트 앱 4개와
공유하므로, 새 전역·프로토타입 패치·범위 없는 `document`/`window` 리스너는 오염이다.

## Claude Code 배선

- **`.claude/agents/shell-contract-guard.md`** — 마크업 구조·커스텀 엘리먼트 속성·전역 이름·CSS 레이아웃
  규칙을 건드릴 때 쓰는 서브에이전트. 위 두 함정(v1 계약, 반응형)을 점검 목록으로 갖고 있다.
- **`.claude/hooks/pre-push-verify.sh`** — `git push` 직전 `npm run typecheck`(+ 있으면 lint/test)를
  강제하는 PreToolUse 훅. main push가 곧 4개 프론트 동시 배포이므로 CI에만 의존하지 않는다.
  정당한 사유가 있으면 `CLAUDE_SKIP_PUSH_VERIFY=1`.
- **`.mcp.json`** — `@storybook/addon-mcp`가 Storybook 개발 서버에 띄우는 MCP 서버
  (`http://localhost:6006/mcp`)를 연결한다. **`npm run storybook`이 떠 있을 때만 붙는다** — 서버가
  없으면 그냥 연결 실패로 끝나고 다른 작업에는 영향이 없다. 붙어 있으면 컴포넌트 문서 조회,
  스토리 프리뷰 URL 생성, 스토리 테스트 실행을 도구로 쓸 수 있다.

## 작업 기록 / 커밋 규칙

워크플로 전체(Check & Claim, 이슈 상태 전환, worktree 격리)는 캐논(`~/msa/AGENTS.md` 4장)을 따른다.
이 저장소에 해당하는 부분만:

- **이슈는 변경이 실제로 발생하는 저장소에 만든다.** 여러 저장소에 걸치는 에픽만 이 저장소에 부모
  이슈로 두고 하위 링크를 모은다.
- **GitHub Project(ID: 2)에 저장소 미연결 Draft issue를 만들지 않는다.** 실제 저장소 이슈를 만들고
  그것을 보드에 연결할 것 — Draft로 쌓다가 중복 카드가 210여 건 생긴 사고 이력이 있다.
- 이슈 제목: `[저장소] [작업/에픽] 내용` / 커밋·PR 제목: `<type>: [#이슈번호] 내용`.
- AI가 작성·수정한 커밋은 본문 마지막에 빈 줄 하나를 두고 `Co-Authored-By:` 트레일러로 모델을 명시한다.
- 주석/로그 표준은 `docs/COMMENT_STANDARDS.md`.
