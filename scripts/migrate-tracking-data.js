// scripts/migrate-tracking-data.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKING_FILE = path.join(__dirname, '../.blog-tracking.json');
const BACKUP_FILE = path.join(__dirname, '../.blog-tracking.backup.json');

function migrateTrackingData() {
  console.log('🔄 Migrating blog tracking data to new scheduling format...\n');
  
  if (!fs.existsSync(TRACKING_FILE)) {
    console.log('📝 No existing tracking file found. Creating new one.');
    const newData = {
      scheduled: [],
      published: []
    };
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(newData, null, 2));
    console.log('✅ Created new tracking file with scheduling format');
    return;
  }
  
  // Read existing data
  const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  
  // Check if already in new format
  if (data.scheduled && data.published) {
    console.log('✅ Tracking data is already in the new format');
    console.log(`📊 Current status:`);
    console.log(`   • Scheduled posts: ${data.scheduled.length}`);
    console.log(`   • Published posts: ${data.published.length}`);
    return;
  }
  
  // Backup old format
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
  console.log('💾 Created backup of old tracking data');
  
  // Migrate old format
  const today = new Date().toISOString().split('T')[0];
  const newData = {
    scheduled: [],
    published: []
  };
  
  // If there were processed posts, mark them as published today
  if (data.processed && Array.isArray(data.processed)) {
    newData.published = [...data.processed];
    newData.scheduled = data.processed.map(filename => ({
      filename,
      publishDate: today,
      status: 'published'
    }));
    
    console.log(`📝 Migrated ${data.processed.length} previously processed posts`);
  }
  
  // Save new format
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(newData, null, 2));
  
  console.log('✅ Migration completed successfully!');
  console.log(`📊 New format:`);
  console.log(`   • Scheduled entries: ${newData.scheduled.length}`);
  console.log(`   • Published posts: ${newData.published.length}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Run: npm run blog:schedule (to schedule any new posts)`);
  console.log(`   2. Run: npm run blog:status (to see current schedule)`);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔄 Blog Tracking Data Migration Tool

Usage:
  node scripts/migrate-tracking-data.js

This tool migrates your existing .blog-tracking.json file from the old format
to the new scheduling format that supports automatic publishing.

What it does:
  • Backs up your existing tracking file
  • Converts old 'processed' array to new 'scheduled' format
  • Marks existing posts as published
  • Creates new tracking structure

Safe to run multiple times - won't overwrite if already migrated.
`);
  process.exit(0);
}

try {
  migrateTrackingData();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}