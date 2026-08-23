import type { Preview } from '@storybook/react-vite';
import '@posselect/ui/tokens.css';
import { SHELL_CSS } from '../src/styles';
import React, { useEffect } from 'react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    viewport: {
      options: {
        phone: { name: 'Phone 375 (≤480 규칙)', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet 768 (≤768 규칙)', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '900px' } },
      },
    },

    a11y: {
      test: 'todo',
    },
  },

  decorators: [
    (Story) => {
      useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = SHELL_CSS;
        document.head.appendChild(style);

        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
          if (typeof input === 'string') {
            if (input.includes('/api/categories')) return { ok: true, json: async () => [] } as any;
            if (input.includes('/api/auth/me')) return { ok: true, json: async () => null } as any;
            if (input.includes('/api/cart')) return { ok: true, json: async () => ({ items: [] }) } as any;
          }
          return originalFetch(input, init);
        };

        return () => {
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
          window.fetch = originalFetch;
        };
      }, []);
      return <Story />;
    },
  ],
};

export default preview;