import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_INPUT_DIR = path.join(__dirname, '../blog-input');
const TRACKING_FILE = path.join(__dirname, '../.blog-tracking.json');

// Configuration
const POSTS_PER_WEEK = 2;
const PUBLISH_DAYS = [1, 4]; // Monday = 1, Thursday = 4 (publish twice per week)

// Load or create tracking data with scheduling
function loadTrackingData() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
      
      // Migrate old tracking format if needed
      if (data.processed && !data.scheduled) {
        return {
          scheduled: data.processed.map(filename => ({
            filename,
            publishDate: new Date().toISOString().split('T')[0], // Today for existing posts
            status: 'published'
          })),
          published: data.processed || []
        };
      }
      
      return {
        scheduled: data.scheduled || [],
        published: data.published || []
      };
    }
  } catch (error) {
    console.warn('Could not load tracking data:', error.message);
  }
  
  return {
    scheduled: [],
    published: []
  };
}

// Save tracking data
function saveTrackingData(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
}

// Get next publication date
function getNextPublishDate(lastDate = null) {
  const today = new Date();
  const startDate = lastDate ? new Date(lastDate) : new Date(today);
  
  // If we have a last date, start from the day after
  if (lastDate) {
    startDate.setDate(startDate.getDate() + 1);
  }
  
  // Find the next publish day
  while (true) {
    const dayOfWeek = startDate.getDay();
    
    // Convert Sunday (0) to 7 for easier calculation
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    if (PUBLISH_DAYS.includes(adjustedDay)) {
      return startDate.toISOString().split('T')[0];
    }
    
    startDate.setDate(startDate.getDate() + 1);
  }
}

// Schedule new posts
function scheduleNewPosts() {
  console.log('📅 Scheduling blog posts...\n');
  
  if (!fs.existsSync(BLOG_INPUT_DIR)) {
    console.error('❌ Blog input directory does not exist:', BLOG_INPUT_DIR);
    return;
  }
  
  const trackingData = loadTrackingData();
  const inputFiles = fs.readdirSync(BLOG_INPUT_DIR)
    .filter(file => file.endsWith('.html'))
    .sort(); // Ensure consistent ordering
  
  // Find unscheduled files
  const scheduledFilenames = trackingData.scheduled.map(item => item.filename);
  const unscheduledFiles = inputFiles.filter(file => !scheduledFilenames.includes(file));
  
  if (unscheduledFiles.length === 0) {
    console.log('✅ All available posts are already scheduled');
    console.log(`📊 Status:`);
    console.log(`   • Scheduled posts: ${trackingData.scheduled.length}`);
    console.log(`   • Published posts: ${trackingData.published.length}`);
    return;
  }
  
  console.log(`📝 Found ${unscheduledFiles.length} new posts to schedule`);
  
  // Get the last scheduled date
  const lastScheduled = trackingData.scheduled
    .map(item => item.publishDate)
    .sort()
    .pop();
  
  let nextDate = getNextPublishDate(lastScheduled);
  let scheduledCount = 0;
  
  for (const filename of unscheduledFiles) {
    trackingData.scheduled.push({
      filename,
      publishDate: nextDate,
      status: 'scheduled'
    });
    
    console.log(`📅 Scheduled: ${filename} → ${nextDate}`);
    scheduledCount++;
    
    // Get next publish date
    nextDate = getNextPublishDate(nextDate);
  }
  
  // Save updated tracking data
  saveTrackingData(trackingData);
  
  console.log(`\n✅ Scheduled ${scheduledCount} new posts`);
  console.log('\n📋 Current schedule:');
  
  // Show upcoming schedule
  const upcoming = trackingData.scheduled
    .filter(item => item.status === 'scheduled')
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
    .slice(0, 6); // Show next 6 posts
  
  upcoming.forEach((item, index) => {
    const date = new Date(item.publishDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('bg-BG');
    console.log(`   ${index + 1}. ${item.filename} → ${dayName}, ${formattedDate}`);
  });
  
  if (trackingData.scheduled.filter(item => item.status === 'scheduled').length > 6) {
    console.log(`   ... and ${trackingData.scheduled.filter(item => item.status === 'scheduled').length - 6} more`);
  }
}

// Show current schedule
function showSchedule() {
  const trackingData = loadTrackingData();
  const today = new Date().toISOString().split('T')[0];
  
  console.log('📅 Blog Publishing Schedule\n');
  
  // Published posts
  const published = trackingData.scheduled.filter(item => item.status === 'published');
  if (published.length > 0) {
    console.log(`✅ Published (${published.length}):`);
    published
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
      .slice(0, 5)
      .forEach(item => {
        const date = new Date(item.publishDate).toLocaleDateString('bg-BG');
        console.log(`   • ${item.filename} (${date})`);
      });
    if (published.length > 5) {
      console.log(`   ... and ${published.length - 5} more`);
    }
    console.log('');
  }
  
  // Ready to publish today
  const readyToday = trackingData.scheduled.filter(item => 
    item.status === 'scheduled' && item.publishDate <= today
  );
  
  if (readyToday.length > 0) {
    console.log(`🚀 Ready to publish today (${readyToday.length}):`);
    readyToday.forEach(item => {
      console.log(`   • ${item.filename}`);
    });
    console.log('');
  }
  
  // Upcoming schedule
  const upcoming = trackingData.scheduled
    .filter(item => item.status === 'scheduled' && item.publishDate > today)
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
    .slice(0, 10);
  
  if (upcoming.length > 0) {
    console.log(`📅 Upcoming schedule (${upcoming.length}):`);
    upcoming.forEach(item => {
      const date = new Date(item.publishDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = date.toLocaleDateString('bg-BG');
      const daysFromNow = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`   • ${item.filename} → ${dayName}, ${formattedDate} (in ${daysFromNow} days)`);
    });
  } else {
    console.log('📝 No posts scheduled for the future');
    console.log('💡 Add new HTML files to blog-input/ and run schedule command');
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📅 Blog Scheduling Tool for RotoRem Varna

Usage:
  npm run blog:schedule           # Schedule new posts (2 per week)
  npm run blog:schedule --show    # Show current schedule
  npm run blog:schedule --help    # Show this help

Configuration:
  • Posts per week: ${POSTS_PER_WEEK}
  • Publish days: ${PUBLISH_DAYS.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d === 7 ? 0 : d]).join(', ')}

Workflow:
  1. Add HTML files to blog-input/ folder
  2. Run: npm run blog:schedule (schedules new posts)
  3. Run: npm run blog:generate (publishes scheduled posts for today)
`);
    return;
  }
  
  if (args.includes('--show')) {
    showSchedule();
  } else {
    scheduleNewPosts();
  }
}

main();