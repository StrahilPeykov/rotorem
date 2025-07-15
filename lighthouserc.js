module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:4321/', // Homepage BG
        'http://localhost:4321/en/', // Homepage EN
        'http://localhost:4321/services/', // Services page
        'http://localhost:4321/services/washing-machine-repair', // Service detail
        'http://localhost:4321/contact/', // Contact page
        'http://localhost:4321/reviews/', // Reviews page
      ],
      // Lighthouse settings
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3, // Run 3 times and average results
      settings: {
        // Performance optimizations for testing
        preset: 'desktop', // Test desktop version
        // throttling: {
        //   rttMs: 40,
        //   throughputKbps: 10240,
        //   cpuSlowdownMultiplier: 1,
        //   requestLatencyMs: 0,
        //   downloadThroughputKbps: 0,
        //   uploadThroughputKbps: 0
        // },
        // emulatedFormFactor: 'desktop',
        // internalDisableDeviceScreenEmulation: true,
        skipAudits: [
          'canonical', // We have custom canonical handling
          'uses-http2', // Depends on hosting
        ],
      },
    },
    assert: {
      // Performance thresholds
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }], // 90+ performance score
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95+ accessibility
        'categories:best-practices': ['error', { minScore: 0.95 }], // 95+ best practices
        'categories:seo': ['error', { minScore: 0.95 }], // 95+ SEO score
        
        // Core Web Vitals - Critical for Google ranking
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // LCP < 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }], // FCP < 1.8s
        'speed-index': ['error', { maxNumericValue: 3400 }], // SI < 3.4s
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // TBT < 300ms
        
        // SEO specific audits
        'meta-description': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'link-text': 'error',
        'robots-txt': 'warn', // Not critical but important
        'hreflang': 'error',
        
        // Performance specific audits
        'uses-webp-images': 'warn', // We generate WebP
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'efficiently-encode-images': 'warn',
        'render-blocking-resources': 'warn',
        'unused-css-rules': 'warn',
        'uses-text-compression': 'error',
        'server-response-time': ['error', { maxNumericValue: 600 }], // < 600ms server response
        
        // Accessibility
        'color-contrast': 'error',
        'heading-order': 'error',
        'duplicate-id-aria': 'error',
        'duplicate-id-active': 'error',
        
        // Best Practices
        'uses-https': 'error',
        'is-on-https': 'error',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
      },
    },
    upload: {
      // Store results temporarily (can be configured for external storage)
      target: 'temporary-public-storage',
    },
    server: {
      // No server needed, we're testing preview build
    },
  },
  
  // Desktop-specific configuration
  desktop: {
    collect: {
      settings: {
        preset: 'desktop',
        emulatedFormFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }], // Higher threshold for desktop
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }], // Stricter for desktop
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
      },
    },
  },
  
  // Mobile-specific configuration  
  mobile: {
    collect: {
      settings: {
        preset: 'mobile',
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }], // Slightly lower for mobile
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
};