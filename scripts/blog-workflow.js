import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBlogWorkflow() {
  console.log('🚀 Starting complete blog workflow...\n');
  
  try {
    // Step 1: Generate blog posts
    console.log('📝 Step 1: Generating blog posts from blog-input/');
    console.log('=' .repeat(50));
    execSync('node scripts/generate-blog-posts.js', { stdio: 'inherit' });
    
    console.log('\n📋 Step 2: Updating blog index');
    console.log('=' .repeat(50));
    execSync('node scripts/update-blog-index.js', { stdio: 'inherit' });
    
    console.log('\n🎉 Blog workflow completed successfully!');
    console.log('\n💡 What happened:');
    console.log('   ✅ New blog posts generated from blog-input/ folder');
    console.log('   ✅ Blog index updated with latest posts');
    console.log('   ✅ Categories and metadata automatically extracted');
    console.log('\n🔧 Next steps:');
    console.log('   • Run "npm run dev" to preview your blog');
    console.log('   • Check src/pages/blog/ for generated posts');
    console.log('   • Review and edit posts if needed');
    
  } catch (error) {
    console.error('\n❌ Blog workflow failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Blog Workflow Tool for RotoRem Varna

Usage:
  npm run blog:workflow        # Generate posts and update index
  npm run blog:generate        # Only generate posts from blog-input/
  npm run blog:update-index    # Only update the blog index
  npm run blog:clean           # Clean all existing posts

Commands:
  --help, -h                   # Show this help message

Description:
  This tool automatically converts HTML files from blog-input/ folder
  into properly formatted Astro blog posts with metadata, categories,
  and SEO optimization.

Example:
  1. Add your HTML blog files to blog-input/ folder
  2. Run: npm run blog:workflow
  3. Check src/pages/blog/ for generated posts
  4. Preview with: npm run dev
`);
  process.exit(0);
}

if (args.includes('--clean')) {
  console.log('🧹 Cleaning existing blog posts...');
  execSync('node scripts/clean-blog-posts.js', { stdio: 'inherit' });
  process.exit(0);
}

// Run the workflow
runBlogWorkflow().catch(console.error);