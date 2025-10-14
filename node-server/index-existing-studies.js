require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dicomParser = require('dicom-parser');
const Study = require('./src/models/Study');
const Series = require('./src/models/Series');
const Instance = require('./src/models/Instance');
const Patient = require('./src/models/Patient');

async function indexExistingStudies() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dicomdb');
    console.log('✅ Connected to MongoDB');

    const studiesDir = path.join(__dirname, 'backend', 'uploaded_studies');
    
    if (!fs.existsSync(studiesDir)) {
      console.error('❌ Studies directory not found:', studiesDir);
      process.exit(1);
    }

    const studyFolders = fs.readdirSync(studiesDir).filter(item => {
      const itemPath = path.join(studiesDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    console.log(`📁 Found ${studyFolders.length} study folders`);

    let indexedCount = 0;
    let skippedCount = 0;

    for (const studyUID of studyFolders) {
      try {
        // Check if study already exists
        const existingStudy = await Study.findOne({ studyInstanceUID: studyUID });
        if (existingStudy) {
          console.log(`  ⏭️  Study already indexed: ${studyUID}`);
          skippedCount++;
          continue;
        }

        const studyPath = path.join(studiesDir, studyUID);
        const seriesFolders = fs.readdirSync(studyPath).filter(item => {
          const itemPath = path.join(studyPath, item);
          return fs.statSync(itemPath).isDirectory();
        });

        if (seriesFolders.length === 0) {
          console.log(`  ⚠️  No series found in study: ${studyUID}`);
          continue;
        }

        // Read first DICOM file to get metadata
        const firstSeriesPath = path.join(studyPath, seriesFolders[0]);
        const dicomFiles = fs.readdirSync(firstSeriesPath).filter(f => f.endsWith('.dcm'));
        
        if (dicomFiles.length === 0) {
          console.log(`  ⚠️  No DICOM files in series: ${seriesFolders[0]}`);
          continue;
        }

        const firstDicomPath = path.join(firstSeriesPath, dicomFiles[0]);
        const buffer = fs.readFileSync(firstDicomPath);
        const dataSet = dicomParser.parseDicom(buffer);

        // Extract patient info
        const patientID = dataSet.string('x00100020') || 'Unknown';
        const patientName = dataSet.string('x00100010') || 'Unknown';
        
        // Create or update patient
        let patient = await Patient.findOne({ patientID });
        if (!patient) {
          patient = new Patient({
            patientID,
            patientName,
            patientBirthDate: dataSet.string('x00100030'),
            patientSex: dataSet.string('x00100040')
          });
          await patient.save();
        }

        // Create study
        const study = new Study({
          studyInstanceUID: studyUID,
          patientID,
          studyDate: dataSet.string('x00080020'),
          studyTime: dataSet.string('x00080030'),
          studyDescription: dataSet.string('x00081030') || 'Unknown',
          accessionNumber: dataSet.string('x00080050'),
          modality: dataSet.string('x00080060') || 'OT',
          numberOfSeries: seriesFolders.length,
          numberOfInstances: 0,
          metadata: {
            source: 'filesystem_indexing'
          }
        });

        let totalInstances = 0;

        // Index all series
        for (const seriesUID of seriesFolders) {
          const seriesPath = path.join(studyPath, seriesUID);
          const seriesDicomFiles = fs.readdirSync(seriesPath).filter(f => f.endsWith('.dcm'));
          
          if (seriesDicomFiles.length === 0) continue;

          // Read first DICOM in series for metadata
          const seriesDicomPath = path.join(seriesPath, seriesDicomFiles[0]);
          const seriesBuffer = fs.readFileSync(seriesDicomPath);
          const seriesDataSet = dicomParser.parseDicom(seriesBuffer);

          const series = new Series({
            seriesInstanceUID: seriesUID,
            studyInstanceUID: studyUID,
            seriesNumber: seriesDataSet.intString('x00200011') || 1,
            modality: seriesDataSet.string('x00080060') || 'OT',
            seriesDescription: seriesDataSet.string('x0008103e') || 'Unknown',
            numberOfInstances: seriesDicomFiles.length,
            metadata: {
              source: 'filesystem_indexing'
            }
          });
          await series.save();

          // Index instances
          for (let i = 0; i < seriesDicomFiles.length; i++) {
            const dicomFile = seriesDicomFiles[i];
            const instancePath = path.join(seriesPath, dicomFile);
            const instanceBuffer = fs.readFileSync(instancePath);
            const instanceDataSet = dicomParser.parseDicom(instanceBuffer);

            const sopInstanceUID = instanceDataSet.string('x00080018') || `generated-${Date.now()}-${i}`;

            const instance = new Instance({
              sopInstanceUID,
              seriesInstanceUID: seriesUID,
              studyInstanceUID: studyUID,
              instanceNumber: instanceDataSet.intString('x00200013') || (i + 1),
              filePath: instancePath,
              metadata: {
                transferSyntaxUID: instanceDataSet.string('x00020010'),
                source: 'filesystem_indexing'
              }
            });
            await instance.save();
            totalInstances++;
          }
        }

        study.numberOfInstances = totalInstances;
        await study.save();

        console.log(`  ✅ Indexed study: ${studyUID} (${totalInstances} instances)`);
        indexedCount++;

      } catch (error) {
        console.error(`  ❌ Error indexing study ${studyUID}:`, error.message);
      }
    }

    console.log('\n📊 Indexing complete:');
    console.log(`   ✅ Indexed: ${indexedCount} studies`);
    console.log(`   ⏭️  Skipped: ${skippedCount} studies`);
    console.log(`   📝 Total: ${studyFolders.length} studies`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

indexExistingStudies();
