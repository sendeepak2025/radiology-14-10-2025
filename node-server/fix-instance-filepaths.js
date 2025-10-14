require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Instance = require('./src/models/Instance');

async function fixInstanceFilePaths() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dicomdb');
    console.log('✅ Connected to MongoDB');

    const instances = await Instance.find({});
    console.log(`📁 Found ${instances.length} instances to fix`);

    let fixedCount = 0;
    let notFoundCount = 0;

    for (const instance of instances) {
      try {
        // Construct expected file path
        const studyUID = instance.studyInstanceUID;
        const seriesUID = instance.seriesInstanceUID;
        const sopUID = instance.sopInstanceUID;
        
        const expectedPath = path.join(
          __dirname,
          'backend',
          'uploaded_studies',
          studyUID,
          seriesUID,
          `${sopUID}.dcm`
        );

        if (fs.existsSync(expectedPath)) {
          instance.filePath = expectedPath;
          await instance.save();
          fixedCount++;
          console.log(`  ✅ Fixed: ${sopUID.substring(0, 30)}...`);
        } else {
          console.log(`  ⚠️  File not found: ${expectedPath}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error fixing instance ${instance.sopInstanceUID}:`, error.message);
      }
    }

    console.log('\n📊 Fix complete:');
    console.log(`   ✅ Fixed: ${fixedCount} instances`);
    console.log(`   ⚠️  Not found: ${notFoundCount} instances`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixInstanceFilePaths();
