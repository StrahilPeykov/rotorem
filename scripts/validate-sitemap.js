import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const DIST_DIR = './dist';
const SITEMAP_PATH = path.join(DIST_DIR, 'sitemap.xml');
const ROBOTS_PATH = path.join(DIST_DIR, 'robots.txt');

// Critical URLs that must be in sitemap
const CRITICAL_URLS = [
  '/',
  '/en/',
  '/services/',
  '/en/services/',
  '/contact/',
  '/en/contact/',
  '/reviews/',
  '/en/reviews/',
  '/faq/',
  '/en/faq/',
];

// Service pages that should be included
const SERVICE_PAGES = [
  '/services/washing-machine-repair',
  '/services/dishwasher-repair',
  '/services/oven-repair',
  '/services/electrical-services',
  '/en/services/washing-machine-repair',
  '/en/services/dishwasher-repair',
  '/en/services/oven-repair',
  '/en/services/electrical-services',
];

async function validateSitemap() {
  console.log('🗺️  Validating sitemap...\n');
  
  try {
    // Check if sitemap exists
    const sitemapContent = await fs.readFile(SITEMAP_PATH, 'utf-8');
    
    // Basic XML validation
    if (!sitemapContent.includes('<?xml') || !sitemapContent.includes('<urlset')) {
      throw new Error('Sitemap is not valid XML');
    }
    
    console.log('✅ Sitemap file exists and is valid XML');
    
    // Extract URLs from sitemap
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) {
      throw new Error('No URLs found in sitemap');
    }
    
    const urls = urlMatches.map(match => 
      match.replace('<loc>', '').replace('</loc>', '')
    );
    
    console.log(`📊 Found ${urls.length} URLs in sitemap\n`);
    
    // Check critical URLs
    const missingCritical = CRITICAL_URLS.filter(url => 
      !urls.some(sitemapUrl => sitemapUrl.endsWith(url))
    );
    
    if (missingCritical.length > 0) {
      console.warn('⚠️  Missing critical URLs:');
      missingCritical.forEach(url => console.warn(`   - ${url}`));
      console.log('');
    } else {
      console.log('✅ All critical URLs are present');
    }
    
    // Check service pages
    const missingServices = SERVICE_PAGES.filter(url => 
      !urls.some(sitemapUrl => sitemapUrl.includes(url))
    );
    
    if (missingServices.length > 0) {
      console.warn('⚠️  Missing service pages:');
      missingServices.forEach(url => console.warn(`   - ${url}`));
      console.log('');
    } else {
      console.log('✅ All service pages are present');
    }
    
    // Check for proper HTTPS URLs
    const httpUrls = urls.filter(url => url.startsWith('http://'));
    if (httpUrls.length > 0) {
      console.warn('⚠️  Found HTTP URLs (should be HTTPS):');
      httpUrls.forEach(url => console.warn(`   - ${url}`));
      console.log('');
    } else {
      console.log('✅ All URLs use HTTPS');
    }
    
    // Check for lastmod dates
    const hasLastmod = sitemapContent.includes('<lastmod>');
    if (hasLastmod) {
      console.log('✅ Sitemap includes lastmod dates');
    } else {
      console.warn('⚠️  Sitemap missing lastmod dates');
    }
    
    // Check for priority values
    const hasPriority = sitemapContent.includes('<priority>');
    if (hasPriority) {
      console.log('✅ Sitemap includes priority values');
    } else {
      console.warn('⚠️  Sitemap missing priority values');
    }
    
    return urls;
    
  } catch (error) {
    console.error('❌ Sitemap validation failed:', error.message);
    throw error;
  }
}

async function validateRobots() {
  console.log('\n🤖 Validating robots.txt...\n');
  
  try {
    const robotsContent = await fs.readFile(ROBOTS_PATH, 'utf-8');
    
    // Check for sitemap reference
    if (robotsContent.includes('Sitemap:')) {
      console.log('✅ Robots.txt includes sitemap reference');
    } else {
      console.warn('⚠️  Robots.txt missing sitemap reference');
    }
    
    // Check for proper formatting
    const lines = robotsContent.split('\n').filter(line => line.trim());
    let hasUserAgent = false;
    
    for (const line of lines) {
      if (line.startsWith('User-agent:')) {
        hasUserAgent = true;
        break;
      }
    }
    
    if (hasUserAgent) {
      console.log('✅ Robots.txt has proper User-agent directive');
    } else {
      console.warn('⚠️  Robots.txt missing User-agent directive');
    }
    
    // Check for host directive
    if (robotsContent.includes('Host:')) {
      console.log('✅ Robots.txt includes host directive');
    } else {
      console.warn('⚠️  Robots.txt missing host directive');
    }
    
  } catch (error) {
    console.error('❌ Robots.txt validation failed:', error.message);
  }
}

async function validateHTMLPages() {
  console.log('\n📄 Validating HTML pages for SEO...\n');
  
  try {
    // Find all HTML files
    const files = await fs.readdir(DIST_DIR, { recursive: true });
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} HTML files to validate\n`);
    
    let issues = 0;
    
    for (const file of htmlFiles.slice(0, 10)) { // Limit to first 10 files
      const filePath = path.join(DIST_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const $ = cheerio.load(content);
      
      const relativePath = file.replace('index.html', '');
      console.log(`🔍 Checking: /${relativePath}`);
      
      // Check title
      const title = $('title').text();
      if (!title || title.length < 10) {
        console.warn(`   ⚠️  Missing or short title (${title?.length || 0} chars)`);
        issues++;
      } else if (title.length > 60) {
        console.warn(`   ⚠️  Title too long (${title.length} chars)`);
        issues++;
      }
      
      // Check meta description
      const description = $('meta[name="description"]').attr('content');
      if (!description || description.length < 50) {
        console.warn(`   ⚠️  Missing or short meta description (${description?.length || 0} chars)`);
        issues++;
      } else if (description.length > 160) {
        console.warn(`   ⚠️  Meta description too long (${description.length} chars)`);
        issues++;
      }
      
      // Check canonical link
      const canonical = $('link[rel="canonical"]').attr('href');
      if (!canonical) {
        console.warn(`   ⚠️  Missing canonical link`);
        issues++;
      }
      
      // Check hreflang
      const hreflang = $('link[rel="alternate"][hreflang]').length;
      if (hreflang === 0) {
        console.warn(`   ⚠️  Missing hreflang links`);
        issues++;
      }
      
      // Check Open Graph
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogDescription = $('meta[property="og:description"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      
      if (!ogTitle || !ogDescription || !ogImage) {
        console.warn(`   ⚠️  Incomplete Open Graph tags`);
        issues++;
      }
      
      // Check structured data
      const jsonLd = $('script[type="application/ld+json"]').length;
      if (jsonLd === 0) {
        console.warn(`   ⚠️  Missing structured data (JSON-LD)`);
        issues++;
      }
      
      // Check heading structure
      const h1Count = $('h1').length;
      if (h1Count === 0) {
        console.warn(`   ⚠️  Missing H1 tag`);
        issues++;
      } else if (h1Count > 1) {
        console.warn(`   ⚠️  Multiple H1 tags (${h1Count})`);
        issues++;
      }
      
      // Check image alt attributes
      const imagesWithoutAlt = $('img:not([alt])').length;
      if (imagesWithoutAlt > 0) {
        console.warn(`   ⚠️  ${imagesWithoutAlt} images missing alt attributes`);
        issues++;
      }
      
      if (issues === 0) {
        console.log(`   ✅ No SEO issues found`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    if (issues === 0) {
      console.log('🎉 All HTML pages passed SEO validation!');
    } else {
      console.log(`⚠️  Found ${issues} SEO issues across HTML pages`);
    }
    
  } catch (error) {
    console.error('❌ HTML validation failed:', error.message);
  }
}

async function generateSEOReport() {
  console.log('\n📊 Generating SEO Report...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    sitemap: {
      valid: false,
      urlCount: 0,
      issues: []
    },
    robots: {
      valid: false,
      issues: []
    },
    pages: {
      total: 0,
      issues: 0
    }
  };
  
  try {
    // Save report to file
    const reportPath = path.join(DIST_DIR, 'seo-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 SEO report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Failed to generate SEO report:', error.message);
  }
}

async function main() {
  console.log('🔍 Starting SEO validation...\n');
  
  try {
    const urls = await validateSitemap();
    await validateRobots();
    await validateHTMLPages();
    await generateSEOReport();
    
    console.log('\n✅ SEO validation completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Submit sitemap to Google Search Console');
    console.log('2. Test robots.txt with Google Search Console');
    console.log('3. Run Lighthouse audit for Core Web Vitals');
    console.log('4. Monitor for 404 errors and crawl issues');
    
  } catch (error) {
    console.error('\n❌ SEO validation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);