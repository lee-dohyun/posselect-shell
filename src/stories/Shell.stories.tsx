import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const meta = {
  title: 'Components/Shell',
  parameters: {
    layout: 'fullscreen',
  },
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
