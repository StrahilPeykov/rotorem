import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import i18n from '@astrojs/i18n';

import i18nConfig from './src/i18n.config';

// https://astro.build/config
export default defineConfig({
  site: 'https://technofixvarna.com',
  integrations: [
    tailwind({
      // Use DaisyUI
      config: { 
        plugins: [require('daisyui')] 
      },
    }),
    sitemap({
      i18n: {
        defaultLocale: 'bg',
        locales: {
          bg: 'bg',
          en: 'en',
        },
      },
    }),
    i18n({
      config: i18nConfig,
    }),
  ],
});