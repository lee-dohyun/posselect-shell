import { createRoot } from 'react-dom/client';
import { Header } from './components/Header';
import { SHELL_CSS } from './styles';

const DEFAULT_HOME_HREF = 'https://home.posselect.com';
const DEFAULT_SEARCH_HREF = 'https://product.posselect.com';
const DEFAULT_AUTH_API_BASE = 'https://customer.posselect.com';
const DEFAULT_CART_API_BASE = 'https://product.posselect.com';
const DEFAULT_CATEGORIES_API_BASE = 'https://product.posselect.com';

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
        homeHref={this.getAttribute('home-href') || DEFAULT_HOME_HREF}
        searchHref={this.getAttribute('search-href') || DEFAULT_SEARCH_HREF}
        authApiBase={this.getAttribute('auth-api-base') || DEFAULT_AUTH_API_BASE}
        cartApiBase={this.getAttribute('cart-api-base') || DEFAULT_CART_API_BASE}
        categoriesApiBase={this.getAttribute('categories-api-base') || DEFAULT_CATEGORIES_API_BASE}
      />
    );
  }
}

if (!customElements.get('posselect-header')) {
  customElements.define('posselect-header', PosselectHeaderElement);
}
