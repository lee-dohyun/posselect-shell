# posselect-shell

posselect 쇼핑몰(customer.front / home.front / product.front)이 공통으로 쓰는 상단 Header / 하단
Footer를 **독립 배포되는 런타임 마이크로프론트엔드**로 서빙하는 저장소.

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
| `home-href` | `https://home.posselect.com` | 로고 클릭 시 이동 |
| `search-href` | `https://product.posselect.com` | 검색창 제출 / "전체카테고리" 클릭 시 이동(`?q=`, 카테고리는 `?category=`) |
| `auth-api-base` | `https://customer.posselect.com` | 로그인 상태 조회(`/api/auth/me`)·로그아웃(`/api/auth/logout`) origin |
| `cart-api-base` | `https://product.posselect.com` | 장바구니 개수 조회(`/api/cart`) origin |
| `categories-api-base` | `https://product.posselect.com` | 카테고리 목록 조회(`/api/categories`) origin, 카테고리 링크의 base로도 사용 |

호스트 앱이 이미 해당 도메인 위에 있다면(예: product.front 자신이 `product.posselect.com`) 상대
경로 대신 자기 origin을 그대로 넘겨도 되고, 기본값을 그대로 둬도 크로스 도메인으로 정상 동작한다
(CORS는 auth.api/product-api 양쪽에 `https://*.posselect.com` 허용 완료).

### `<posselect-footer>`

속성 없음 — 완전 정적.

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
        'home-href'?: string;
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

## 로컬 빌드

```bash
npm install
npm run build   # dist/v1/header.js, dist/v1/footer.js
```

## 배포

Docker Hub `leedohyun1985/posselect-shell`, K8s `default` 네임스페이스 `posselect-shell`
Deployment(nginx 정적 서빙, `posselect-ui`와 동일 패턴), 게이트웨이 `shell.posselect.com` 라우트.
CI/CD(빌드+푸시+배포)는 GitHub Actions self-hosted runner로 자동화되어 있다 — 단, 새 저장소라
아래 3가지가 사람이 직접 해야 준비되는 부분이다(다른 마이크로서비스 저장소 추가 시와 동일한
체크리스트, `~/msa/README.md`의 "새 마이크로서비스 저장소를 추가할 때 필요한 인프라" 참고):

1. 이 저장소의 GitHub Actions repo secret: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
2. 저장소 전용 self-hosted runner 등록
3. `default` 네임스페이스에 `ci-posselect-shell-deployer` RBAC + `~/.kube-ci/posselect-shell-deployer.kubeconfig`
