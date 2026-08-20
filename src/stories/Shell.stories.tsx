import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SHELL_CSS } from '../styles';
import React, { useEffect } from 'react';

const meta = {
  title: 'Components/Shell',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = SHELL_CSS;
        document.head.appendChild(style);
        
        // Mock fetch to prevent timeout in test-runner
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
          document.head.removeChild(style);
          window.fetch = originalFetch;
        };
      }, []);
      return <Story />;
    },
  ],
} satisfies Meta;

export default meta;

export const HeaderStory: StoryObj<typeof Header> = {
  name: 'Header',
  render: () => (
    <Header
      searchHref="https://home.posselect.com/search"
      categoriesApiBase="https://product.posselect.com"
      authApiBase="https://customer.posselect.com"
      cartApiBase="https://product.posselect.com"
    />
  ),
};

export const FooterStory: StoryObj<typeof Footer> = {
  name: 'Footer',
  render: () => <Footer />,
};
