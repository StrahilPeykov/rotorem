import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_OUTPUT_DIR = path.join(__dirname, '../src/pages/blog');
const BLOG_INDEX_FILE = path.join(BLOG_OUTPUT_DIR, 'index.astro');

// Function to extract metadata from Astro files
function extractMetadata(astroContent, filename) {
  // Extract title from the title variable
  const titleMatch = astroContent.match(/const title = '([^']+)';/);
  // Extract description  
  const descMatch = astroContent.match(/const description = '([^']+)';/);
  // Extract category
  const categoryMatch = astroContent.match(/const category = '([^']+)';/);
  // Extract readTime
  const readTimeMatch = astroContent.match(/const readTime = '([^']+)';/);
  // Extract blogImage
  const imageMatch = astroContent.match(/const blogImage = '([^']+)';/);
  
  // Generate slug from filename
  const slug = filename.replace('.astro', '');
  
  // Extract excerpt from first paragraph in content
  const contentMatch = astroContent.match(/<div class="prose[^>]*">\s*(.*?)\s*<\/div>/s);
  let excerpt = 'Професионални съвети от експертите на РотоРем Варна...';
  
  if (contentMatch) {
    // Look for first paragraph
    const firstPMatch = contentMatch[1].match(/<p[^>]*>(.*?)<\/p>/s);
    if (firstPMatch) {
      excerpt = firstPMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 120) + '...';
    }
  }
  
  return {
    title: titleMatch ? titleMatch[1] : 'Untitled Post',
    excerpt,
    date: new Date().toLocaleDateString('bg-BG', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    readTime: readTimeMatch ? readTimeMatch[1] : '5 мин четене',
    slug,
    category: categoryMatch ? categoryMatch[1] : 'Съвети и ръководства',
    image: imageMatch ? imageMatch[1] : '/img/blog/default.webp'
  };
}

// Generate blog index content
function generateBlogIndex(blogPosts) {
  // Sort posts by date (newest first)
  const sortedPosts = [...blogPosts].reverse();

  const blogPostsArray = sortedPosts.map(post => `  {
    title: '${post.title.replace(/'/g, "\\'")}',
    excerpt: '${post.excerpt.replace(/'/g, "\\'")}',
    date: '${post.date}',
    readTime: '${post.readTime}',
    slug: '${post.slug}',
    category: '${post.category}',
    image: '${post.image}'
  }`).join(',\n');

  return `---
import Layout from '../../layouts/Base.astro';
import { getLangFromUrl, useTranslations } from '../../i18n/utils';

const lang = getLangFromUrl(Astro.url);
const t = useTranslations(lang);
const isEN = lang === 'en';

const title = isEN 
  ? 'Appliance Repair Blog | Tips & Guides | RotoRem Varna'
  : 'Блог за ремонт на битова техника | Съвети и ръководства | РотоРем Варна';

const description = isEN 
  ? 'Helpful tips and guides for appliance maintenance and repair from RotoRem Varna experts. Learn how to keep your appliances running smoothly.'
  : 'Полезни съвети и ръководства за поддръжка и ремонт на битова техника от експертите на РотоРем Варна. Научете как да поддържате уредите си.';

// Auto-generated blog posts data
const blogPosts = [
${blogPostsArray}
];
---

<Layout title={title} description={description}>
  <section class="py-16">
    <div class="container max-w-6xl">
      <!-- Header -->
      <header class="text-center max-w-3xl mx-auto mb-16">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Блог за ремонт на битова техника
        </h1>
        <div class="w-20 h-1 bg-accent mx-auto my-4"></div>
        <p class="text-xl text-gray-600">
          Експертни съвети и ръководства от РотоРем Варна за поддръжка и ремонт на вашите уреди
        </p>
      </header>

      <!-- Featured Post -->
      {blogPosts.length > 0 && (
        <div class="mb-16">
          <h2 class="text-2xl font-semibold mb-6 text-gray-900">
            Препоръчана статия
          </h2>
          <article class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div class="md:flex">
              <div class="md:w-1/3">
                <img 
                  src={blogPosts[0].image} 
                  alt={blogPosts[0].title}
                  class="w-full h-48 md:h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="md:w-2/3 p-8">
                <div class="flex items-center mb-4">
                  <span class="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                    {blogPosts[0].category}
                  </span>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-4">
                  <a href={\`/blog/\${blogPosts[0].slug}\`} class="hover:text-primary transition-colors">
                    {blogPosts[0].title}
                  </a>
                </h3>
                <p class="text-gray-600 mb-6">
                  {blogPosts[0].excerpt}
                </p>
                <div class="flex items-center justify-between">
                  <a 
                    href={\`/blog/\${blogPosts[0].slug}\`}
                    class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors font-medium"
                  >
                    Прочетете повече
                  </a>
                  <span class="text-gray-500 text-sm">{blogPosts[0].readTime}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}

      <!-- Blog Posts Grid -->
      <div class="mb-16">
        <h2 class="text-2xl font-semibold mb-8 text-gray-900">
          Последни статии
        </h2>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.slice(1).map(post => (
            <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div class="aspect-video overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div class="p-6">
                <div class="flex items-center mb-3">
                  <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {post.category}
                  </span>
                </div>
                
                <h3 class="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  <a href={\`/blog/\${post.slug}\`} class="hover:text-primary transition-colors">
                    {post.title}
                  </a>
                </h3>
                
                <p class="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <div class="flex items-center justify-between">
                  <a 
                    href={\`/blog/\${post.slug}\`}
                    class="text-primary font-medium hover:text-primary-dark transition-colors"
                  >
                    Прочетете повече →
                  </a>
                  <span class="text-gray-500 text-sm">{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <!-- Newsletter Signup -->
      <div class="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-8 text-white text-center mb-16">
        <h2 class="text-2xl font-bold mb-4">
          Получавайте експертни съвети
        </h2>
        <p class="text-xl mb-6 opacity-90">
          Абонирайте се за нашия бюлетин за най-новите съвети за поддръжка и ръководства за ремонт
        </p>
        
        <form class="max-w-md mx-auto flex gap-3">
          <input 
            type="email" 
            placeholder="Въведете вашия имейл"
            class="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            required
          />
          <button 
            type="submit" 
            class="bg-accent hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Абонирай се
          </button>
        </form>
        
        <p class="text-sm mt-4 opacity-75">
          Без спам, отписване по всяко време. Уважаваме вашата поверителност.
        </p>
      </div>

      <!-- Contact CTA -->
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">
          Нуждаете се от професионална помощ?
        </h2>
        <p class="text-gray-600 mb-6">
          Не можете да намерите отговора, който търсите? Нашите експертни техници са тук, за да помогнат.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:+359898340982" class="btn-primary inline-flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            089 834 0982
          </a>
          
          <a href="mailto:n.ivanov.ivanov@abv.bg" class="btn-cta inline-flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Изпратете имейл
          </a>
        </div>
        
        <div class="mt-4 text-center text-gray-600 text-sm">
          <p>Обадете се за запазване на час за ремонт</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SEO Content Section -->
  <div class="rotorem-seo-text">
    <style>
      .rotorem-seo-text {
        font-size: 74%;
        color: #777 !important;
        background-color: #f9fafb;
        padding: 2rem 0;
      }
      .rotorem-seo-text h2,
      .rotorem-seo-text h3,
      .rotorem-seo-text h4 {
        font-size: 1em;
        margin: 1em 0 0.5em;
        color: #777;
        font-weight: 400;
      }
      .rotorem-seo-text a {
        color: #777;
        text-decoration: underline;
      }
      .rotorem-seo-text p {
        margin: 0.5em 0;
        line-height: 1.5;
      }
      .rotorem-seo-text ul {
        margin: 0.5em 0;
        padding-left: 1.5em;
      }
      .rotorem-seo-text li {
        margin: 0.3em 0;
      }
      
      /* Line clamp utilities for better text truncation */
      .line-clamp-2 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      
      .line-clamp-3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }
    </style>
    
    <div class="container max-w-4xl">
      <h2>Блог за ремонт на битова техника – професионални съвети от експертите на РотоРем Варна</h2>
      <p>В нашия блог за ремонт на битова техника ще намерите реални, практични съвети от професионалните техници на РотоРем Варна. Всяка статия е написана въз основа на реален опит и хиляди ремонти, извършени в домовете на клиентите ни във Варна и региона.</p>
      
      <h3>Какво ще намерите в нашия блог</h3>
      <p>Нашите статии покриват широк спектър от теми, свързани с ремонта и поддръжката на битова техника. От практични съвети за ежедневната употреба до сложни технически обяснения - всичко е написано на разбираем език от наши експерти.</p>
    </div>
  </div>
</Layout>`;
}

async function updateBlogIndex() {
  console.log('📝 Updating blog index...');
  
  try {
    if (!fs.existsSync(BLOG_OUTPUT_DIR)) {
      console.error('❌ Blog output directory does not exist');
      return;
    }
    
    // Get all blog post files (except index.astro)
    const blogFiles = fs.readdirSync(BLOG_OUTPUT_DIR)
      .filter(file => file.endsWith('.astro') && file !== 'index.astro');
    
    console.log(`📁 Found ${blogFiles.length} blog posts`);
    
    // Extract metadata from each post
    const blogPosts = [];
    
    for (const filename of blogFiles) {
      try {
        const filePath = path.join(BLOG_OUTPUT_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const metadata = extractMetadata(content, filename);
        blogPosts.push(metadata);
        console.log(`📄 Processed: ${metadata.title}`);
        console.log(`   Image: ${metadata.image}`);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not process ${filename}:`, error.message);
      }
    }
    
    // Generate new blog index
    const indexContent = generateBlogIndex(blogPosts);
    
    // Write updated index
    fs.writeFileSync(BLOG_INDEX_FILE, indexContent);
    
    console.log('✅ Blog index updated successfully!');
    console.log(`📊 Included ${blogPosts.length} blog posts`);
    console.log('🎨 Removed category filtering for cleaner interface');
    console.log('📸 Added image support for blog posts');
    
  } catch (error) {
    console.error('❌ Error updating blog index:', error.message);
  }
}

updateBlogIndex().catch(console.error);