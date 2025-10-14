const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const studiesDir = path.join(__dirname, 'backend', 'uploaded_studies');

if (!fs.existsSync(studiesDir)) {
  console.error('❌ Studies directory not found');
  process.exit(1);
}

const studyFolders = fs.readdirSync(studiesDir).filter(item => {
  const itemPath = path.join(studiesDir, item);
  return fs.statSync(itemPath).isDirectory();
});

console.log(`📁 Found ${studyFolders.length} studies`);
console.log('🔄 Regenerating frames for all studies...\n');

let successCount = 0;
let failCount = 0;

for (let i = 0; i < studyFolders.length; i++) {
  const studyUID = studyFolders[i];
  console.log(`[${i + 1}/${studyFolders.length}] Processing: ${studyUID}`);
  
  try {
    execSync(`node regenerate-frames.js "${studyUID}"`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    successCount++;
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    failCount++;
  }
}

console.log('\n✅ Frame regeneration complete');
console.log(`   Success: ${successCount}`);
console.log(`   Failed: ${failCount}`);
