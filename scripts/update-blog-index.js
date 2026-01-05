import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_OUTPUT_DIR = path.join(__dirname, '../src/pages/blog');
const BLOG_INDEX_FILE = path.join(BLOG_OUTPUT_DIR, 'index.astro');

// Extract metadata from a single Astro file
function extractMetadata(astroContent, filename) {
  const titleMatch = astroContent.match(/const title = '([^']+)'/);
  const descMatch = astroContent.match(/const description = '([^']+)'/);
  const dateMatch = astroContent.match(/const datePublished = '([^']+)'/);
  const imageMatch = astroContent.match(/const blogImage = '([^']+)'/);

  const slug = filename.replace('.astro', '');

  // Extract excerpt from first paragraph
  const contentMatch = astroContent.match(/<div class="prose[^>]*">\s*(.*?)\s*<\/div>/s);
  let excerpt = 'Професионални съвети от експертите на РотоРем Варна...';
  if (contentMatch) {
    const firstPMatch = contentMatch[1].match(/<p[^>]*>(.*?)<\/p>/s);
    if (firstPMatch) {
      excerpt = firstPMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 120) + '...';
    }
  }

  return {
    title: titleMatch ? titleMatch[1] : 'Untitled Post',
    excerpt,
    slug,
    image: imageMatch ? imageMatch[1] : '/img/blog/default.webp',
    publishDate: dateMatch ? dateMatch[1] : '1970-01-01'
  };
}

// Generate index.astro content
function generateBlogIndex(blogPosts) {
  // Sort by publishDate (newest first)
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.publishDate) - new Date(a.publishDate)
  );

  const blogPostsArray = sortedPosts.map(post => `  {
    title: '${post.title.replace(/'/g, "\\'")}',
    excerpt: '${post.excerpt.replace(/'/g, "\\'")}',
    slug: '${post.slug}',
    image: '${post.image}',
    publishDate: '${post.publishDate}'
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
  ? 'Helpful tips and guides for appliance maintenance and repair from RotoRem Varna experts.'
  : 'Полезни съвети и ръководства за поддръжка и ремонт на битова техника от експертите на РотоРем Варна.';

// Auto-generated blog posts
const blogPosts = [
${blogPostsArray}
];
---

<Layout title={title} description={description}>
  <section class="py-16">
    <div class="container max-w-6xl">
      <header class="text-center max-w-3xl mx-auto mb-16">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Блог за ремонт на битова техника
        </h1>
        <div class="w-20 h-1 bg-accent mx-auto my-4"></div>
        <p class="text-xl text-gray-600">
          Експертни съвети и ръководства от РотоРем Варна и София за поддръжка и ремонт на вашите уреди
        </p>
      </header>

      <div class="mb-16">
        <h2 class="text-2xl font-semibold mb-8 text-gray-900">
          Последни статии
        </h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map(post => (
            <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div class="aspect-video overflow-hidden">
                <img src={post.image} alt={post.title} class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
              <div class="p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  <a href={\`/blog/\${post.slug}\`} class="hover:text-primary transition-colors">{post.title}</a>
                </h3>
                <p class="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                <a href={\`/blog/\${post.slug}\`} class="text-primary font-medium hover:text-primary-dark transition-colors">
                  Прочетете повече →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  </section>
</Layout>`;
}

// Update index.astro automatically
async function updateBlogIndex() {
  console.log('📝 Updating blog index...');

  if (!fs.existsSync(BLOG_OUTPUT_DIR)) {
    console.error('❌ Blog output directory does not exist');
    return;
  }

  const blogFiles = fs.readdirSync(BLOG_OUTPUT_DIR)
    .filter(f => f.endsWith('.astro') && f !== 'index.astro');

  const blogPosts = blogFiles.map(filename => {
    const content = fs.readFileSync(path.join(BLOG_OUTPUT_DIR, filename), 'utf8');
    return extractMetadata(content, filename);
  });

  const indexContent = generateBlogIndex(blogPosts);
  fs.writeFileSync(BLOG_INDEX_FILE, indexContent);

  console.log(`✅ Blog index updated with ${blogPosts.length} posts (sorted by publishDate)`);
}

updateBlogIndex().catch(console.error);
