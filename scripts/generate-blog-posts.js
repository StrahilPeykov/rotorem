import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_INPUT_DIR = path.join(__dirname, '../blog-input');
const BLOG_OUTPUT_DIR = path.join(__dirname, '../src/pages/blog');
const TRACKING_FILE = path.join(__dirname, '../.blog-tracking.json');

// Load tracking data
function loadTrackingData() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not load tracking data:', error.message);
  }
  return { processed: [] };
}

// Save tracking data
function saveTrackingData(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
}

// Parse blog input file
function parseBlogInput(content, filename) {
  // Extract meta title and description from the bottom
  const metaTitleMatch = content.match(/Мета заглавие:\s*(.+?)(?:\n|$)/i);
  const metaDescMatch = content.match(/Мета описание:\s*(.+?)(?:\n|$)/i);
  
  // Remove meta information from content
  const cleanContent = content
    .replace(/Мета заглавие:[\s\S]*$/i, '')
    .trim();
  
  // Generate slug from filename
  const slug = filename.replace('.html', '').toLowerCase();
  
  // Extract first h2 as title if no meta title
  const firstH2Match = cleanContent.match(/<h2[^>]*>(.*?)<\/h2>/);
  const title = metaTitleMatch ? metaTitleMatch[1].trim() : 
                firstH2Match ? firstH2Match[1].replace(/<[^>]*>/g, '').trim() : 
                'Untitled Post';
  
  const description = metaDescMatch ? metaDescMatch[1].trim() : 
                     'Професионални съвети от експертите на РотоРем Варна.';
  
  // Determine category from content
  let category = 'Съвети и ръководства';
  if (content.includes('перални') || content.includes('пералня')) {
    category = 'Ремонт на перални';
  } else if (content.includes('електротехник') || content.includes('електро')) {
    category = 'Електроуслуги';
  } else if (content.includes('бойлер') || content.includes('бойлери')) {
    category = 'Ремонт на бойлери';
  } else if (content.includes('котлон') || content.includes('котлони')) {
    category = 'Ремонт на уреди';
  } else if (content.includes('съдомиялн')) {
    category = 'Ремонт на съдомиялни';
  }

  // Generate gradient colors based on category
  const gradientColors = {
    'Ремонт на перални': 'from-green-600 to-emerald-700',
    'Електроуслуги': 'from-yellow-600 to-orange-600', 
    'Ремонт на бойлери': 'from-blue-600 to-indigo-700',
    'Ремонт на уреди': 'from-orange-600 to-red-700',
    'Ремонт на съдомиялни': 'from-purple-600 to-pink-700',
    'Съвети и ръководства': 'from-gray-600 to-slate-700'
  };

  const gradient = gradientColors[category] || gradientColors['Съвети и ръководства'];
  
  return {
    title,
    description,
    content: cleanContent,
    slug,
    category,
    gradient,
    readTime: Math.max(3, Math.ceil(cleanContent.length / 1000)) + ' мин четене',
    publishDate: new Date().toLocaleDateString('bg-BG', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  };
}

// Generate Astro blog post
function generateAstroPost(postData) {
  const relatedPosts = generateRelatedPosts(postData.category);
  
  return `---
import Layout from '../../layouts/Base.astro';
import { getLangFromUrl, useTranslations } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);
const t = useTranslations(lang);

const title = '${postData.title}';
const description = '${postData.description}';

const publishDate = '${postData.publishDate}';
const readTime = '${postData.readTime}';
const category = '${postData.category}';
---

<Layout title={title} description={description}>
  <!-- Blog Post Header -->
  <section class="py-16 bg-gradient-to-r ${postData.gradient} text-white">
    <div class="container max-w-4xl">
      <div class="text-center">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white mb-4">
          {category}
        </div>
        <h1 class="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          ${postData.title}
        </h1>
        <div class="text-orange-100">
          <span>{readTime}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Blog Post Content -->
  <article class="py-16">
    <div class="container max-w-4xl">
      <div class="prose prose-lg max-w-none text-gray-900 prose-headings:text-gray-900 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-800">
        ${postData.content}
      </div>
    </div>
  </article>

  <!-- CTA Section -->
  <section class="py-16 bg-gradient-to-r ${postData.gradient} text-white">
    <div class="container text-center">
      <h2 class="text-3xl font-bold mb-4">Нуждаете се от професионална помощ?</h2>
      <p class="text-xl mb-8 opacity-90">Свържете се с нас за експертни услуги във Варна!</p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="tel:+359898340982" class="bg-white text-gray-800 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
          📞 089 834 0982
        </a>
        <a href="/contact" class="bg-amber-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-lg">
          Свържете се с нас
        </a>
      </div>
      
      <p class="mt-6 opacity-75">
        Диагностика: 30 лв (15 €) • Гаранция за качество • Сервиз в цяла Варна
      </p>
    </div>
  </section>

  <!-- Related Posts -->
  <section class="py-16 bg-gray-50">
    <div class="container">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Свързани статии</h2>
        <div class="w-20 h-1 bg-orange-500 mx-auto"></div>
      </div>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${relatedPosts}
      </div>
    </div>
  </section>

  <!-- Schema Markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${postData.title}",
    "description": "${postData.description}",
    "image": "https://www.rotorem.bg/img/blog/default.webp",
    "author": {
      "@type": "Organization", 
      "name": "РотоРем Варна"
    },
    "publisher": {
      "@type": "Organization",
      "name": "РотоРем Варна",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.rotorem.bg/favicon.svg"
      }
    },
    "datePublished": "${new Date().toISOString().split('T')[0]}",
    "dateModified": "${new Date().toISOString().split('T')[0]}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://www.rotorem.bg/blog/${postData.slug}"
    }
  }
  </script>
</Layout>`;
}

// Generate related posts HTML
function generateRelatedPosts(category) {
  const relatedPostsData = {
    'Ремонт на перални': [
      {
        title: 'Ремонт на съдомиялни машини Варна',
        excerpt: 'Професионален ремонт на съдомиялни машини на място...',
        url: '/services/dishwasher-repair'
      },
      {
        title: 'Електроуслуги Варна - професионални решения',
        excerpt: 'Пълен спектър електротехнически услуги и монтажи...',
        url: '/services/electrical-services'
      },
      {
        title: 'Ремонт на фурни Варна',
        excerpt: 'Професионален ремонт на електрически фурни...',
        url: '/services/oven-repair'
      }
    ],
    'Електроуслуги': [
      {
        title: 'Ремонт на перални машини Варна',
        excerpt: 'Професионален ремонт на перални машини на място...',
        url: '/services/washing-machine-repair'
      },
      {
        title: 'Ремонт на фурни Варна',
        excerpt: 'Професионален ремонт на електрически фурни...',
        url: '/services/oven-repair'
      },
      {
        title: 'Ремонт на съдомиялни машини Варна',
        excerpt: 'Експертен ремонт на съдомиялни машини...',
        url: '/services/dishwasher-repair'
      }
    ]
  };

  const defaultRelated = [
    {
      title: 'Ремонт на перални машини Варна',
      excerpt: 'Професионален ремонт на перални машини на място...',
      url: '/services/washing-machine-repair'
    },
    {
      title: 'Електроуслуги Варна',
      excerpt: 'Пълен спектър електротехнически услуги...',
      url: '/services/electrical-services'
    },
    {
      title: 'Ремонт на съдомиялни машини Варна',
      excerpt: 'Експертен ремонт на съдомиялни машини...',
      url: '/services/dishwasher-repair'
    }
  ];

  const posts = relatedPostsData[category] || defaultRelated;
  
  return posts.map(post => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-3">
              <a href="${post.url}" class="hover:text-orange-600 transition-colors">
                ${post.title}
              </a>
            </h3>
            <p class="text-gray-600 mb-4">${post.excerpt}</p>
            <a href="${post.url}" class="text-orange-600 font-medium hover:text-orange-800 transition-colors">
              Прочетете повече →
            </a>
          </div>
        </div>`).join('\n');
}

// Main function
async function generateBlogPosts() {
  console.log('🚀 Starting blog post generation...');
  
  // Ensure directories exist
  if (!fs.existsSync(BLOG_INPUT_DIR)) {
    console.error('❌ Blog input directory does not exist:', BLOG_INPUT_DIR);
    return;
  }
  
  if (!fs.existsSync(BLOG_OUTPUT_DIR)) {
    fs.mkdirSync(BLOG_OUTPUT_DIR, { recursive: true });
  }

  // Load tracking data
  const trackingData = loadTrackingData();
  let newPostsCount = 0;

  // Process all HTML files in blog-input
  const inputFiles = fs.readdirSync(BLOG_INPUT_DIR)
    .filter(file => file.endsWith('.html'));

  console.log(`📁 Found ${inputFiles.length} input files`);

  for (const filename of inputFiles) {
    // Skip if already processed
    if (trackingData.processed.includes(filename)) {
      console.log(`⏭️  Skipping ${filename} (already processed)`);
      continue;
    }

    try {
      console.log(`📝 Processing ${filename}...`);
      
      // Read and parse input file
      const inputPath = path.join(BLOG_INPUT_DIR, filename);
      const content = fs.readFileSync(inputPath, 'utf8');
      const postData = parseBlogInput(content, filename);
      
      // Generate Astro post
      const astroContent = generateAstroPost(postData);
      
      // Write output file
      const outputPath = path.join(BLOG_OUTPUT_DIR, `${postData.slug}.astro`);
      fs.writeFileSync(outputPath, astroContent);
      
      // Mark as processed
      trackingData.processed.push(filename);
      newPostsCount++;
      
      console.log(`✅ Generated: ${postData.slug}.astro`);
      console.log(`   Title: ${postData.title}`);
      console.log(`   Category: ${postData.category}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }

  // Save tracking data
  saveTrackingData(trackingData);
  
  console.log(`\n🎉 Blog post generation complete!`);
  console.log(`📊 Generated ${newPostsCount} new posts`);
  console.log(`📈 Total processed: ${trackingData.processed.length} files`);
  
  if (newPostsCount > 0) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the generated posts in src/pages/blog/`);
    console.log(`   2. Update the blog index if needed`);
    console.log(`   3. Run "npm run dev" to test locally`);
  }
}

// Run the generator
generateBlogPosts().catch(console.error);