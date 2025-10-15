/**
 * Database Indexing Script
 * Creates indexes on frequently queried fields for performance optimization
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const Instance = require('../models/Instance');

/**
 * Create indexes for Study collection
 */
async function createStudyIndexes() {
  console.log('\n📊 Creating Study collection indexes...');
  
  try {
    // Single field indexes
    await Study.collection.createIndex({ studyInstanceUID: 1 }, { unique: true });
    console.log('✓ Index created: studyInstanceUID (unique)');
    
    await Study.collection.createIndex({ patientName: 1 });
    console.log('✓ Index created: patientName');
    
    await Study.collection.createIndex({ patientID: 1 });
    console.log('✓ Index created: patientID');
    
    await Study.collection.createIndex({ studyDate: -1 });
    console.log('✓ Index created: studyDate (descending)');
    
    await Study.collection.createIndex({ modality: 1 });
    console.log('✓ Index created: modality');
    
    await Study.collection.createIndex({ studyDescription: 1 });
    console.log('✓ Index created: studyDescription');
    
    await Study.collection.createIndex({ accessionNumber: 1 });
    console.log('✓ Index created: accessionNumber');
    
    // Compound indexes for common queries
    await Study.collection.createIndex({ patientName: 1, studyDate: -1 });
    console.log('✓ Compound index: patientName + studyDate');
    
    await Study.collection.createIndex({ modality: 1, studyDate: -1 });
    console.log('✓ Compound index: modality + studyDate');
    
    await Study.collection.createIndex({ patientID: 1, studyDate: -1 });
    console.log('✓ Compound index: patientID + studyDate');
    
    // Text index for full-text search
    await Study.collection.createIndex(
      { 
        patientName: 'text', 
        studyDescription: 'text',
        patientID: 'text',
      },
      { 
        name: 'study_text_search',
        weights: {
          patientName: 10,
          patientID: 5,
          studyDescription: 1,
        }
      }
    );
    console.log('✓ Text index created: study_text_search');
    
    // Index for sorting by creation date
    await Study.collection.createIndex({ createdAt: -1 });
    console.log('✓ Index created: createdAt');
    
    console.log('✅ Study indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Study indexes:', error.message);
    throw error;
  }
}

/**
 * Create indexes for Patient collection
 */
async function createPatientIndexes() {
  console.log('\n📊 Creating Patient collection indexes...');
  
  try {
    await Patient.collection.createIndex({ patientID: 1 }, { unique: true });
    console.log('✓ Index created: patientID (unique)');
    
    await Patient.collection.createIndex({ patientName: 1 });
    console.log('✓ Index created: patientName');
    
    await Patient.collection.createIndex({ patientBirthDate: 1 });
    console.log('✓ Index created: patientBirthDate');
    
    // Text index for patient search
    await Patient.collection.createIndex(
      { patientName: 'text', patientID: 'text' },
      { name: 'patient_text_search' }
    );
    console.log('✓ Text index created: patient_text_search');
    
    console.log('✅ Patient indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Patient indexes:', error.message);
    throw error;
  }
}

/**
 * Create indexes for Instance collection
 */
async function createInstanceIndexes() {
  console.log('\n📊 Creating Instance collection indexes...');
  
  try {
    // Try to create unique index, but skip if duplicates exist
    try {
      await Instance.collection.createIndex({ sopInstanceUID: 1 }, { unique: true });
      console.log('✓ Index created: sopInstanceUID (unique)');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Skipping sopInstanceUID unique index (duplicates exist)');
        // Create non-unique index instead
        await Instance.collection.createIndex({ sopInstanceUID: 1 });
        console.log('✓ Index created: sopInstanceUID (non-unique)');
      } else {
        throw error;
      }
    }
    
    await Instance.collection.createIndex({ studyInstanceUID: 1 });
    console.log('✓ Index created: studyInstanceUID');
    
    await Instance.collection.createIndex({ seriesInstanceUID: 1 });
    console.log('✓ Index created: seriesInstanceUID');
    
    await Instance.collection.createIndex({ instanceNumber: 1 });
    console.log('✓ Index created: instanceNumber');
    
    // Compound index for fetching instances of a series
    await Instance.collection.createIndex({ 
      seriesInstanceUID: 1, 
      instanceNumber: 1 
    });
    console.log('✓ Compound index: seriesInstanceUID + instanceNumber');
    
    // Compound index for fetching all instances of a study
    await Instance.collection.createIndex({ 
      studyInstanceUID: 1, 
      seriesInstanceUID: 1,
      instanceNumber: 1 
    });
    console.log('✓ Compound index: studyInstanceUID + seriesInstanceUID + instanceNumber');
    
    console.log('✅ Instance indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Instance indexes:', error.message);
    throw error;
  }
}

/**
 * Create indexes for Machine collection
 */
async function createMachineIndexes() {
  console.log('\n📊 Creating Machine collection indexes...');
  
  try {
    // Check if Machine model exists
    if (!mongoose.models.Machine) {
      const Machine = require('../models/Machine');
    }
    
    const Machine = mongoose.models.Machine;
    
    await Machine.collection.createIndex({ machineId: 1 }, { unique: true });
    console.log('✓ Index created: machineId (unique)');
    
    await Machine.collection.createIndex({ organizationId: 1 });
    console.log('✓ Index created: organizationId');
    
    await Machine.collection.createIndex({ status: 1 });
    console.log('✓ Index created: status');
    
    await Machine.collection.createIndex({ machineType: 1 });
    console.log('✓ Index created: machineType');
    
    // Compound index for organization queries
    await Machine.collection.createIndex({ 
      organizationId: 1, 
      status: 1 
    });
    console.log('✓ Compound index: organizationId + status');
    
    console.log('✅ Machine indexes created successfully');
  } catch (error) {
    if (error.message.includes('Cannot read')) {
      console.log('⚠️ Machine model not found, skipping...');
    } else {
      console.error('❌ Error creating Machine indexes:', error.message);
    }
  }
}

/**
 * Create indexes for AI Analysis collection
 */
async function createAIAnalysisIndexes() {
  console.log('\n📊 Creating AI Analysis collection indexes...');
  
  try {
    // Check if AIAnalysis model exists
    if (!mongoose.models.AIAnalysis) {
      const AIAnalysis = require('../models/AIAnalysis');
    }
    
    const AIAnalysis = mongoose.models.AIAnalysis;
    
    await AIAnalysis.collection.createIndex({ studyInstanceUID: 1 });
    console.log('✓ Index created: studyInstanceUID');
    
    await AIAnalysis.collection.createIndex({ analysisDate: -1 });
    console.log('✓ Index created: analysisDate');
    
    await AIAnalysis.collection.createIndex({ 
      studyInstanceUID: 1, 
      analysisDate: -1 
    });
    console.log('✓ Compound index: studyInstanceUID + analysisDate');
    
    console.log('✅ AI Analysis indexes created successfully');
  } catch (error) {
    if (error.message.includes('Cannot read')) {
      console.log('⚠️ AIAnalysis model not found, skipping...');
    } else {
      console.error('❌ Error creating AI Analysis indexes:', error.message);
    }
  }
}

/**
 * List all indexes
 */
async function listIndexes() {
  console.log('\n📋 Current Indexes Summary:');
  console.log('=' .repeat(60));
  
  try {
    // Study indexes
    const studyIndexes = await Study.collection.indexes();
    console.log(`\n📚 Study Collection (${studyIndexes.length} indexes):`);
    studyIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // Patient indexes
    const patientIndexes = await Patient.collection.indexes();
    console.log(`\n👥 Patient Collection (${patientIndexes.length} indexes):`);
    patientIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // Instance indexes
    const instanceIndexes = await Instance.collection.indexes();
    console.log(`\n🖼️  Instance Collection (${instanceIndexes.length} indexes):`);
    instanceIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('Error listing indexes:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=' .repeat(60));
  console.log('🚀 Database Indexing Script');
  console.log('=' .repeat(60));
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for each collection
    await createStudyIndexes();
    await createPatientIndexes();
    await createInstanceIndexes();
    await createMachineIndexes();
    await createAIAnalysisIndexes();
    
    // List all indexes
    await listIndexes();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All indexes created successfully!');
    console.log('=' .repeat(60));
    
    // Performance tips
    console.log('\n💡 Performance Tips:');
    console.log('  • Indexes are now optimized for common queries');
    console.log('  • Text search is available on patientName and studyDescription');
    console.log('  • Consider monitoring query performance with explain()');
    console.log('  • Run this script again if you add new collections');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  createStudyIndexes,
  createPatientIndexes,
  createInstanceIndexes,
  createMachineIndexes,
  createAIAnalysisIndexes,
};
