import { createRoot } from 'react-dom/client';
import { Footer } from './components/Footer';
import { SHELL_CSS } from './styles';

class PosselectFooterElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHELL_CSS;
    shadow.appendChild(style);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    createRoot(mountPoint).render(<Footer />);
  }
}

if (!customElements.get('posselect-footer')) {
  customElements.define('posselect-footer', PosselectFooterElement);
}
