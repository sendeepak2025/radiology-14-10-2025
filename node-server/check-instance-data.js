// Quick script to check instance data in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');

const InstanceSchema = new mongoose.Schema({
  studyInstanceUID: String,
  seriesInstanceUID: String,
  sopInstanceUID: String,
  instanceNumber: Number,
  modality: String,
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  orthancInstanceId: String,
  orthancUrl: String,
  useOrthancPreview: Boolean
}, { timestamps: true });

const Instance = mongoose.model('Instance', InstanceSchema);

async function checkInstances() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dicomdb');
    
    const studyUID = '1.3.6.1.4.1.16568.1759569566212.470976844';
    
    const instances = await Instance.find({ studyInstanceUID: studyUID }).limit(5);
    
    console.log(`Found ${instances.length} instances for study ${studyUID}`);
    console.log('\nFirst 5 instances:');
    instances.forEach((inst, idx) => {
      console.log(`\n${idx + 1}. Instance ${inst.instanceNumber}:`);
      console.log(`   SOP UID: ${inst.sopInstanceUID}`);
      console.log(`   Orthanc ID: ${inst.orthancInstanceId || 'NOT SET'}`);
      console.log(`   Use Orthanc Preview: ${inst.useOrthancPreview}`);
      console.log(`   Orthanc URL: ${inst.orthancUrl || 'NOT SET'}`);
    });
    
    const totalCount = await Instance.countDocuments({ studyInstanceUID: studyUID });
    console.log(`\nTotal instances in DB: ${totalCount}`);
    
    const withOrthancId = await Instance.countDocuments({ 
      studyInstanceUID: studyUID,
      orthancInstanceId: { $exists: true, $ne: null }
    });
    console.log(`Instances with Orthanc ID: ${withOrthancId}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInstances();
