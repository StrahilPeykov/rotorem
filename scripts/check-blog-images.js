import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_INPUT_DIR = path.join(__dirname, '../blog-input');
const BLOG_OUTPUT_DIR = path.join(__dirname, '../src/pages/blog');
const BLOG_IMAGES_DIR = path.join(__dirname, '../public/img/blog');

const exts = ['.webp', '.jpg', '.jpeg', '.png'];

function listSlugs() {
  const inputSlugs = fs.existsSync(BLOG_INPUT_DIR)
    ? fs.readdirSync(BLOG_INPUT_DIR)
        .filter((f) => f.toLowerCase().endsWith('.html'))
        .map((f) => f.replace(/\.html$/i, '').toLowerCase())
    : [];

  const outputSlugs = fs.existsSync(BLOG_OUTPUT_DIR)
    ? fs
        .readdirSync(BLOG_OUTPUT_DIR)
        .filter((f) => f.toLowerCase().endsWith('.astro') && f !== 'index.astro')
        .map((f) => f.replace(/\.astro$/i, '').toLowerCase())
    : [];

  return Array.from(new Set([...inputSlugs, ...outputSlugs])).sort();
}

function hasImageForSlug(slug) {
  if (!fs.existsSync(BLOG_IMAGES_DIR)) return false;
  return exts.some((ext) => fs.existsSync(path.join(BLOG_IMAGES_DIR, slug + ext)));
}

function main() {
  const slugs = listSlugs();
  if (slugs.length === 0) {
    console.log('No blog posts found in blog-input/ or src/pages/blog/.');
    return;
  }

  const missing = [];
  const present = [];

  for (const slug of slugs) {
    if (hasImageForSlug(slug)) {
      present.push(slug);
    } else {
      missing.push(slug);
    }
  }

  console.log('Blog image check');
  console.log('================');
  console.log(`Images directory: ${BLOG_IMAGES_DIR}`);
  console.log(`Total posts found: ${slugs.length}`);
  console.log(`With image: ${present.length}`);
  console.log(`Missing image: ${missing.length}`);
  console.log('');

  if (missing.length > 0) {
    console.log('Posts missing images (expected file: public/img/blog/<slug>.{webp,jpg,jpeg,png}):');
    missing.forEach((s) => console.log(` - ${s}`));
    console.log('');
  }

  if (present.length > 0 && process.argv.includes('--show-present')) {
    console.log('Posts with images:');
    present.forEach((s) => console.log(` - ${s}`));
  }
}

main();

