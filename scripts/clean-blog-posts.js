import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_OUTPUT_DIR = path.join(__dirname, '../src/pages/blog');
const TRACKING_FILE = path.join(__dirname, '../.blog-tracking.json');

async function cleanBlogPosts() {
  console.log('🧹 Cleaning existing blog posts...');
  
  try {
    // Remove all .astro files in blog directory (except index.astro)
    if (fs.existsSync(BLOG_OUTPUT_DIR)) {
      const files = fs.readdirSync(BLOG_OUTPUT_DIR);
      let removedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.astro') && file !== 'index.astro') {
          const filePath = path.join(BLOG_OUTPUT_DIR, file);
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️  Removed: ${file}`);
        }
      }
      
      console.log(`✅ Removed ${removedCount} blog post files`);
    }
    
    // Reset tracking file
    if (fs.existsSync(TRACKING_FILE)) {
      fs.unlinkSync(TRACKING_FILE);
      console.log('🗑️  Reset tracking file');
    }
    
    console.log('🎉 Blog cleanup complete!');
    console.log('💡 Run "npm run blog:generate" to regenerate posts from blog-input/');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

cleanBlogPosts().catch(console.error);