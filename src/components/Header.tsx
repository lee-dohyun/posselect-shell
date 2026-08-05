import { FormEvent, useEffect, useState } from 'react';

interface HeaderCategory {
  id: number;
  name: string;
  href: string;
  highlight?: boolean;
}

interface HeaderProps {
  searchHref: string;
  categoriesApiBase: string;
  authApiBase: string;
  cartApiBase: string;
}

// 로고는 어느 호스트 앱(customer/product/admin/home.front)에 박혀있든 항상 홈으로 보내야 하므로
// 호스트가 넘기는 속성이 아니라 상수로 고정한다 — 예전엔 product.front/home.front가 각자
// home-href="/"를 넘겨서 로고를 누르면 자기 자신의 루트로만 갔었다(의도와 다른 동작).
const HOME_URL = 'https://home.posselect.com';

// MinIO shop-images 버킷(private)에 원본을 두고, image.posselect.com(imgproxy) 뒤에서 리사이징해
// 서빙한다. imgproxy는 서명 없는 요청을 거부하므로 이 URL은 IMGPROXY_KEY/SALT로 미리 서명해둔
// 고정 URL이다(서명에 만료 시각이 없어 재생성 불필요) — 로고 이미지를 교체할 때는 같은 키
// (brand/posselect-logo.png)로 덮어쓰기만 하면 이 URL 그대로 새 이미지를 받아온다.
const LOGO_URL =
  'https://image.posselect.com/iuuE7fLcayc6Eoa5QtbP-LjJCiSRK9slj8rw_CuIy-k/rs:fit:300:90:0/plain/s3://shop-images/brand/posselect-logo.png';

interface AuthMe {
  name?: string | null;
  email?: string | null;
}

interface Cart {
  items: { quantity: number }[];
}

/**
 * 독립 배포 런타임 셸의 Header 위젯. 호스트 앱(customer.front/home.front/product.front)의
 * 서버 컴포넌트가 아니라 이 컴포넌트 자신이 카테고리/로그인/장바구니를 전부 절대 URL로 직접
 * fetch한다 — 빌드 타임 결합이 전혀 없어야 스크립트 태그 하나로 완결되는 배포가 된다.
 */
export function Header({ searchHref, categoriesApiBase, authApiBase, cartApiBase }: HeaderProps) {
  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [user, setUser] = useState<AuthMe | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${categoriesApiBase}/api/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: number; name: string }[]) => {
        setCategories(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            href: `${categoriesApiBase}/?category=${c.id}`,
          }))
        );
      })
      .catch(() => setCategories([]));

    fetch(`${authApiBase}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));

    fetch(`${cartApiBase}/api/cart`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Cart | null) => {
        const count = data?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
        setCartCount(count);
      })
      .catch(() => setCartCount(0));
  }, [categoriesApiBase, authApiBase, cartApiBase]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem('q') as HTMLInputElement)?.value ?? '';
    window.location.href = `${searchHref}?q=${encodeURIComponent(q)}`;
  };

  return (
    <header className="site-header">
      <div className="site-header-utility">
        {checked && user?.name ? (
          <>
            <span>{user.name}님</span>
            <a href={`${authApiBase}/mypage`}>마이페이지</a>
            <button
              type="button"
              className="link"
              onClick={async () => {
                await fetch(`${authApiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
                window.location.reload();
              }}
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <a href="https://customer.posselect.com/login">로그인</a>
            <a href="https://customer.posselect.com/signup">회원가입</a>
          </>
        )}
        <a href="https://customer.posselect.com/mypage">주문조회</a>
        <a href="https://customer.posselect.com/mypage">고객센터</a>
      </div>

      <div className="site-header-main">
        <button
          type="button"
          className="site-header-menu-toggle"
          aria-label="카테고리 메뉴"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <a href={HOME_URL} className="site-header-logo-link" aria-label="PosSelect 홈">
          <img src={LOGO_URL} alt="PosSelect" className="site-header-logo" />
        </a>

        <div className="site-header-search">
          <form className="site-header-search-box" onSubmit={handleSearch}>
            <input name="q" placeholder="상품, 브랜드 검색" />
            <button type="submit" aria-label="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>
        </div>

        <div className="site-header-actions">
          <a className="site-header-action" href="https://customer.posselect.com/mypage" aria-label="찜">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
            </svg>
            <span className="label">찜</span>
          </a>
          <a className="site-header-action" href="https://customer.posselect.com/mypage" aria-label="마이페이지">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"></path>
            </svg>
            <span className="label">마이페이지</span>
          </a>
          <a className="site-header-action" href="https://product.posselect.com/cart" aria-label="장바구니">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"></path>
            </svg>
            <span className="label">장바구니</span>
            {cartCount > 0 && <span className="site-header-action-badge">{cartCount}</span>}
          </a>
        </div>
      </div>

      <nav className={`site-header-categories ${menuOpen ? 'open' : ''}`} aria-label="카테고리">
        <a href={searchHref} aria-current="page">
          전체카테고리
        </a>
        {categories.map((c) => (
          <a key={c.id} href={c.href} className={c.highlight ? 'highlight' : ''}>
            {c.name}
          </a>
        ))}
      </nav>
    </header>
  );
}
