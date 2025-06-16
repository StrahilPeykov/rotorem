import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.rotorem.bg',
  integrations: [
    tailwind({
      // Using a simple config without requiring daisyui directly 
      // (it will be loaded via the tailwind.config.cjs file)
    }),
    sitemap({
      i18n: {
        defaultLocale: 'bg',
        locales: {
          bg: '', // No prefix for Bulgarian (empty string)
          en: 'en', // /en/ prefix for English
        },
      },
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        // Set higher priority for main pages
        if (item.url.endsWith('/') || 
            item.url.endsWith('/en') || 
            item.url.includes('/services') ||
            item.url.includes('/contact')) {
          item.priority = 0.9;
        }
        
        // Set lower priority for thank you pages
        if (item.url.includes('/thankyou')) {
          item.priority = 0.1;
        }
        
        return item;
      },
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['astro'],
            utils: ['./src/i18n/utils.ts'],
            components: ['./src/components/Hero.astro', './src/components/Services.astro']
          },
        },
      },
    },
    ssr: {
      noExternal: ['three', 'astro-seo']
    }
  },
});