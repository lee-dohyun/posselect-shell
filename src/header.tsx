import { createRoot } from 'react-dom/client';
import { Header } from './components/Header';
import { SHELL_CSS } from './styles';

const DEFAULT_SEARCH_HREF = 'https://product.posselect.com';
const DEFAULT_AUTH_API_BASE = 'https://customer.posselect.com';
const DEFAULT_CART_API_BASE = 'https://product.posselect.com';
const DEFAULT_CATEGORIES_API_BASE = 'https://product.posselect.com';

// attribute="" (호스트가 "같은 origin이라 상대경로로 써라"는 의미로 명시적으로 빈 문자열을
// 넘긴 경우)와 attribute 자체를 안 넘긴 경우(기본값 사용)를 구분해야 하므로 `||`가 아니라
// hasAttribute로 판단한다 — "" || DEFAULT는 빈 문자열도 falsy라 기본값으로 덮여버린다.
function attr(el: HTMLElement, name: string, fallback: string): string {
  return el.hasAttribute(name) ? (el.getAttribute(name) ?? fallback) : fallback;
}

class PosselectHeaderElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return; // 이미 마운트됨(재연결 등 대비)

    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHELL_CSS;
    shadow.appendChild(style);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    createRoot(mountPoint).render(
      <Header
        searchHref={attr(this, 'search-href', DEFAULT_SEARCH_HREF)}
        authApiBase={attr(this, 'auth-api-base', DEFAULT_AUTH_API_BASE)}
        cartApiBase={attr(this, 'cart-api-base', DEFAULT_CART_API_BASE)}
        categoriesApiBase={attr(this, 'categories-api-base', DEFAULT_CATEGORIES_API_BASE)}
      />
    );
  }
}

if (!customElements.get('posselect-header')) {
  customElements.define('posselect-header', PosselectHeaderElement);
}
