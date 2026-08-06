# posselect-shell

posselect 쇼핑몰(customer.front / home.front / product.front)이 공통으로 쓰는 상단 Header / 하단
Footer를 **독립 배포되는 런타임 마이크로프론트엔드**로 서빙하는 저장소.

## 반응형(Responsive) 구현은 필수

이 저장소가 서빙하는 Header/Footer는 `customer`/`home`/`product`/`admin` 4개 프론트 전체가 공유하는
**단일 진입점**이라, 여기서 반응형이 깨지면 posselect 전 서비스의 모바일 화면이 동시에 깨진다.
**새로 만들거나 수정하는 마크업/스타일은 전부 최소 320px ~ 데스크톱까지 레이아웃이 깨지지 않아야
하며, 이는 선택 사항이 아니라 병합 조건이다.**

- **회귀 사례 (2026-08-05)**: `.site-header-search`가 `flex: 1`만 있고 `min-width: 0`이 없어서,
  flex 아이템의 기본값(`min-width: auto`)이 검색창 내부 콘텐츠의 min-content 폭을 강제해버렸다.
  그 결과 좁은 화면(375px)에서 `.site-header-main`이 컨테이너 폭(356px)보다 넓은 실제 콘텐츠
  (538px)를 갖게 됐고, `overflow: hidden` 없이 `margin-left: auto`로 오른쪽에 붙어 있던
  `.site-header-actions`(찜/마이페이지/장바구니 아이콘)가 뷰포트 밖으로 완전히 밀려나 **보이지도
  클릭되지도 않는 상태**가 됐다 — `@media (max-width: 768px)` 규칙 자체는 있었는데도 발생한
  문제라, "미디어쿼리가 있으니 반응형"이라고 착각하면 안 된다. `min-width: 0`을 shrink 가능한
  flex 아이템에, `flex-shrink: 0`을 고정폭으로 유지해야 하는 아이템(`.site-header-actions`,
  `.site-header-menu-toggle`)에 명시해서 해결(`src/styles.ts`).
- **검증 방법**: 실제 배포된 페이지는 Shadow DOM 안에 있어서 브라우저 창을 그냥 줄이는 것만으론
  DevTools 디바이스 툴바가 아닐 경우 놓치기 쉽다. 코드 리뷰 시 `min-width`/`flex-shrink`가 빠진
  flex 아이템이 있는지부터 의심하고, 실기기 또는 실제 뷰포트 폭을 갖는 `<iframe>`(윈도우 리사이즈가
  아니라 iframe 자체 폭)으로 320/375/768px 각각에서 모든 헤더/푸터 요소(아이콘, 카테고리 메뉴,
  검색창)가 화면 안에 그대로 보이고 클릭 가능한지 눈으로 확인할 것 — `scrollWidth > clientWidth`
  여부를 JS로 찍어보는 것도 빠른 회귀 감지법이다.

## 왜 posselect-ui가 아니라 별도 저장소인가

`@posselect/ui`(posselect-ui 저장소)는 토큰/Button/Card/Tag/Nav/Logo 같은 **순수 디자인 요소**만
관리한다 — 라우팅이나 도메인, API를 전혀 모른다. 반면 Header/Footer는 `customer.posselect.com`
같은 실제 도메인, `/api/auth/me`·`/api/cart`·`/api/categories` 같은 실제 엔드포인트를 아는 "조합된
앱 셸"이라 성격이 다르다. 이 저장소가 `@posselect/ui`를 의존성으로 가져와 쓰는 방향이지, 반대가
아니다.

## 왜 npm 패키지가 아니라 런타임 셸인가

이전 시도는 Header/Footer를 `@posselect/ui`에 넣고 각 프론트가 `github:` 의존성으로 설치하는
방식이었다 — 이 경우 Header/Footer 코드가 바뀔 때마다 3개 프론트를 전부 재배포해야 전파된다.
이 저장소는 대신:

1. Vite로 `header.js`/`footer.js`를 **독립 IIFE 번들**로 빌드한다(React 포함, 호스트와 공유 안 함).
2. `nginx:alpine`으로 정적 서빙, `shell.posselect.com`에 배포.
3. 각 프론트는 `<script src="https://shell.posselect.com/v1/header.js">` + `<posselect-header>`
   커스텀 엘리먼트 태그만 넣으면 된다 — 빌드 타임 의존성 전혀 없음.

이 셸의 코드를 바꾸고 재배포하면, 프론트 3개는 **아무것도 안 해도** 다음 페이지 로드부터 새
버전을 받는다. Module Federation을 쓰지 않은 이유: Next.js 15 App Router(RSC)와 궁합이 나빠서
프레임워크에 완전히 무관한(호스트가 React든 뭐든 상관없는) 스크립트 태그 방식을 택했다.

## 버전 관리

URL 경로에 메이저 버전을 박는다: `/v1/header.js`. `v1` 안에서의 무중단 개선(스타일 조정, 버그
수정)은 즉시 전체 프론트에 전파된다. **속성(attribute) 계약을 깨는 변경이나 마크업 구조를 크게
바꾸는 변경은 반드시 `/v2/`로 새로 만들 것** — 기존 `v1`을 덮어쓰면 이미 그 버전을 참조 중인
프론트가 예고 없이 깨진다.

## 커스텀 엘리먼트 계약

### `<posselect-header>`

| attribute | 기본값 | 설명 |
|---|---|---|
| `search-href` | `https://product.posselect.com` | 검색창 제출 / "전체카테고리" 클릭 시 이동(`?q=`, 카테고리는 `?category=`) |
| `auth-api-base` | `https://customer.posselect.com` | 로그인 상태 조회(`/api/auth/me`)·로그아웃(`/api/auth/logout`) origin |
| `cart-api-base` | `https://product.posselect.com` | 장바구니 개수 조회(`/api/cart`) origin |
| `categories-api-base` | `https://product.posselect.com` | 카테고리 목록 조회(`/api/categories`) origin, 카테고리 링크의 base로도 사용 |

호스트 앱이 이미 해당 도메인 위에 있다면(예: product.front 자신이 `product.posselect.com`) 상대
경로 대신 자기 origin을 그대로 넘겨도 되고, 기본값을 그대로 둬도 크로스 도메인으로 정상 동작한다
(CORS는 auth.api/product-api 양쪽에 `https://*.posselect.com` 허용 완료).

**로고(좌상단)는 항상 `https://home.posselect.com`으로 이동한다 (2026-08-05, 속성 아님, 하드코딩).**
예전엔 `home-href` attribute로 호스트가 이 목적지를 바꿀 수 있었는데, 그 결과 `product.front`/
`home.front`가 각자 `home-href="/"`를 넘겨서 로고를 눌러도 자기 자신의 루트로만 가는(의도와 다른)
동작이 실제로 있었다. 로고 클릭 목적지가 호스트마다 달라지는 걸 원천 차단하기 위해
`src/components/Header.tsx`의 `HOME_URL` 상수로 고정했고, `home-href` attribute는 더 이상
읽지 않는다(넘겨도 조용히 무시됨 — 커스텀 엘리먼트 특성상 에러는 안 남). 로고 자체도 더는
SVG 컴포넌트가 아니라 `<img>` 태그로, MinIO `cdn` 버킷(프로덕션 브랜드 자산)의
`logos/posselect-logo-hires-no-r.webp`를 `image.posselect.com/cdn/<key>` 짧은 경로로 가져온다
(2026-08-06, 이전엔 `shop-images` 버킷에 직접 만든 imgproxy 서명 URL을 썼으나 정식 `cdn`
버킷/별칭 체계로 통일함). `image.posselect.com/cdn/*`는 `cdn-alias` nginx(`minio` 네임스페이스,
`~/msa/imgproxy/cdn-alias/`)가 실제 imgproxy 서명 URL로 302 리다이렉트해주는 별칭 경로라 —
`Header.tsx`의 `LOGO_URL` 상수는 서명을 신경 쓸 필요 없이 그냥 이 짧은 경로를 가리킨다. 로고
이미지를 교체하려면 `cdn` 버킷의 `logos/posselect-logo-hires-no-r.webp`를 같은 키로 덮어쓰면
되고, 아예 다른 파일(다른 키)을 쓰려면 `cdn-alias/generate-cdn-alias-conf.sh`를 재실행해서
새 키에 대한 별칭을 생성해야 한다(버킷에 파일을 추가/삭제할 때마다 필요한 절차).

두 컴포넌트 모두 320px(가장 좁은 실사용 모바일 기준) ~ 데스크톱 전 구간에서 요소가 잘리거나
뷰포트 밖으로 밀려나지 않아야 한다 — 위 "반응형(Responsive) 구현은 필수" 섹션 참고.

### `<posselect-footer>`

속성 없음 — 완전 정적. 링크 그룹(`.site-footer-links`)은 `flex-wrap: wrap`으로 좁은 화면에서
자연스럽게 줄바꿈되도록 되어 있음 — 새 링크 그룹을 추가할 때 이 wrap 동작을 깨뜨리지 말 것.

## 호스트 앱에서 쓰는 법

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Script src="https://shell.posselect.com/v1/header.js" strategy="beforeInteractive" />
        <posselect-header />
        {children}
        <Script src="https://shell.posselect.com/v1/footer.js" strategy="beforeInteractive" />
        <posselect-footer />
      </body>
    </html>
  );
}
```

TypeScript가 `posselect-header`/`posselect-footer`를 모르는 태그로 거부하지 않도록, 호스트 앱에
아래 앰비언트 선언을 추가해야 한다(빌드 타임 의존성이 아니라 타입 전용, 이 저장소를 설치할 필요
없음):

```ts
// app/posselect-shell.d.ts
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'posselect-header': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'search-href'?: string;
        'auth-api-base'?: string;
        'cart-api-base'?: string;
        'categories-api-base'?: string;
      };
      'posselect-footer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
```

## 스타일링

Shadow DOM으로 캡슐화한다 — 호스트 페이지의 CSS와 절대 충돌하지 않는다. 다만 `--color-*`,
`--space-*` 등 `@posselect/ui`의 `tokens.css`가 정의하는 CSS 커스텀 프로퍼티는 Shadow DOM
경계를 통과해 상속되므로, 호스트가 이미 `import '@posselect/ui/tokens.css'`를 하고 있다면
그 값 그대로 테마가 맞춰진다(이 저장소는 색상 값을 직접 정의하지 않는다).

**반응형 필수 (`src/styles.ts`)**: 새 flex/grid 레이아웃을 추가할 때마다 아래를 기본으로 챙길 것.
- 폭이 줄어들어야 하는 아이템(검색창, 텍스트 컨테이너 등)에는 `min-width: 0`을 명시 — flex
  아이템의 기본값 `min-width: auto`가 콘텐츠의 min-content 폭을 강제해 형제 요소를 밀어내는
  게 이 저장소에서 실제로 발생한 회귀 원인이다(위 "회귀 사례" 참고).
- 고정폭을 유지해야 하는 아이템(아이콘 그룹, 로고, 토글 버튼 등)에는 `flex-shrink: 0`을 명시.
- 새 브레이크포인트가 필요하면 기존 `@media (max-width: 768px)` 패턴을 재사용하되, 768px
  구간만으로 충분한지 320px 근처까지 반드시 재확인할 것 — 미디어쿼리가 하나 있다고 반응형이
  보장되지 않는다.

## 로컬 빌드

```bash
npm install
npm run build   # dist/v1/header.js, dist/v1/footer.js
```

빌드 후 배포 전 반드시 320/375/768px 폭에서 Header/Footer의 모든 요소(아이콘, 메뉴, 검색창,
링크 그룹)가 잘리거나 뷰포트 밖으로 밀려나지 않는지 눈으로 확인할 것 — 위 "반응형(Responsive)
구현은 필수" 섹션 참고. 이 저장소는 단일 진입점이라 여기서 놓친 반응형 버그는 전 프론트로
동시에 퍼진다.

## 배포

Docker Hub `leedohyun1985/posselect-shell`, K8s `default` 네임스페이스 `posselect-shell`
Deployment(nginx 정적 서빙, `posselect-ui`와 동일 패턴), 게이트웨이 `shell.posselect.com` 라우트.
CI/CD(빌드+푸시+배포)는 GitHub Actions self-hosted runner로 자동화되어 있다 — 단, 새 저장소라
아래 3가지가 사람이 직접 해야 준비되는 부분이다(다른 마이크로서비스 저장소 추가 시와 동일한
체크리스트, `~/msa/README.md`의 "새 마이크로서비스 저장소를 추가할 때 필요한 인프라" 참고):

1. 이 저장소의 GitHub Actions repo secret: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
2. 저장소 전용 self-hosted runner 등록
3. `default` 네임스페이스에 `ci-posselect-shell-deployer` RBAC + `~/.kube-ci/posselect-shell-deployer.kubeconfig`
