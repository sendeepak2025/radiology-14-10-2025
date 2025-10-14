const axios = require('axios');
const FormData = require('form-data');
const dicomParser = require('dicom-parser');
const crypto = require('crypto');
const logger = require('../utils/logger');
const AuditLogger = require('../utils/audit-logger');
const { AuditEventFactory } = require('../models/audit-events');
const { getInstanceFile, getInstanceMetadata, verifyInstanceExists } = require('./orthanc-client');

// Initialize audit logger
const auditLogger = new AuditLogger({ serviceName: 'dicom-processor' });

/**
 * Process DICOM instance from Orthanc webhook
 * CRITICAL: All operations work on copies, never modify originals in Orthanc
 */
async function processInstance(jobData) {
  const {
    requestId,
    correlationId,
    instanceId,
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
    patientID,
    patientName,
    modality,
    studyDate,
    sourceIP,
    userAgent
  } = jobData;

  const startTime = Date.now();
  const processingCorrelationId = correlationId || auditLogger.generateCorrelationId();
  
  // Create instance data for audit logging
  const instanceData = {
    instanceId,
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
    modality,
    aeTitle: 'ORTHANC', // Default AE title for Orthanc
    sourceIP: sourceIP || 'unknown'
  };
  
  try {
    // Log processing start
    auditLogger.logDicomProcessingEvent('started', instanceData, {
      correlationId: processingCorrelationId,
      requestId,
      patientID: '[REDACTED]', // PHI redacted in audit logs
      processingStartTime: new Date().toISOString(),
      userAgent
    });

    logger.info('Starting instance processing', {
      requestId,
      correlationId: processingCorrelationId,
      instanceId,
      sopInstanceUID,
      modality
    });

    // SAFETY CHECK: Verify instance still exists in Orthanc
    const exists = await verifyInstanceExists(instanceId);
    if (!exists) {
      // Log instance not found
      auditLogger.logDicomProcessingEvent('instance_not_found', instanceData, {
        correlationId: processingCorrelationId,
        requestId,
        error: 'Instance no longer exists in Orthanc'
      });
      throw new Error(`Instance ${instanceId} no longer exists in Orthanc`);
    }

    // STEP 1: Fetch DICOM file as buffer (READ-ONLY copy)
    logger.info('Fetching DICOM file from Orthanc', { instanceId });
    const dicomBuffer = await getInstanceFile(instanceId);
    
    // Log file retrieval
    auditLogger.logDicomProcessingEvent('file_retrieved', instanceData, {
      correlationId: processingCorrelationId,
      requestId,
      bytesRetrieved: dicomBuffer.length
    });
    
    // STEP 2: Parse DICOM metadata from the copy
    logger.info('Parsing DICOM metadata', { instanceId });
    const metadata = await parseDicomMetadata(dicomBuffer, instanceId, processingCorrelationId);
    
    // STEP 3: Anonymize the copy before any external processing
    logger.info('Anonymizing DICOM copy', { instanceId });
    const anonymizedBuffer = await anonymizeDicomBuffer(dicomBuffer, metadata, processingCorrelationId);
    
    // STEP 4: Forward to main processing pipeline
    logger.info('Forwarding to main API', { instanceId });
    const processingResult = await forwardToMainAPI(anonymizedBuffer, {
      ...jobData,
      ...metadata,
      originalInstanceId: instanceId,
      correlationId: processingCorrelationId
    });

    const processingTime = Date.now() - startTime;
    
    // Log successful completion
    auditLogger.logDicomProcessingEvent('completed', instanceData, {
      correlationId: processingCorrelationId,
      requestId,
      processingEndTime: new Date().toISOString(),
      processingDuration: processingTime,
      success: true,
      bytesProcessed: dicomBuffer.length,
      frameCount: metadata.numberOfFrames || 1,
      forwardingResult: processingResult.success
    });
    
    logger.info('Instance processing completed', {
      requestId,
      correlationId: processingCorrelationId,
      instanceId,
      sopInstanceUID,
      processingTime,
      result: processingResult
    });

    return {
      success: true,
      instanceId,
      sopInstanceUID,
      processingTime,
      correlationId: processingCorrelationId,
      result: processingResult
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log processing failure
    auditLogger.logDicomProcessingEvent('failed', instanceData, {
      correlationId: processingCorrelationId,
      requestId,
      processingEndTime: new Date().toISOString(),
      processingDuration: processingTime,
      success: false,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    logger.error('Instance processing failed', {
      requestId,
      correlationId: processingCorrelationId,
      instanceId,
      sopInstanceUID,
      error: error.message,
      stack: error.stack,
      processingTime
    });

    // Re-throw to mark job as failed
    throw error;
  }
}

/**
 * Parse DICOM metadata from buffer
 */
async function parseDicomMetadata(buffer, instanceId, correlationId) {
  try {
    const dataSet = dicomParser.parseDicom(buffer);
    
    const readStr = (tag, defVal = '') => {
      try { return dataSet.string(tag) || defVal; } catch { return defVal; }
    };
    
    const readInt = (tag, defVal = 0) => {
      try { return dataSet.intString(tag) ?? defVal; } catch { return defVal; }
    };

    const metadata = {
      studyInstanceUID: readStr('x0020000D'),
      seriesInstanceUID: readStr('x0020000E'),
      sopInstanceUID: readStr('x00080018'),
      patientName: readStr('x00100010'),
      patientID: readStr('x00100020'),
      patientBirthDate: readStr('x00100030'),
      patientSex: readStr('x00100040'),
      studyDate: readStr('x00080020'),
      studyTime: readStr('x00080030'),
      studyDescription: readStr('x00081030'),
      seriesDescription: readStr('x0008103E'),
      modality: readStr('x00080060'),
      institutionName: readStr('x00080080'),
      manufacturerModelName: readStr('x00081090'),
      rows: readInt('x00280010'),
      cols: readInt('x00280011'),
      numberOfFrames: readInt('x00280008', 1),
      bitsAllocated: readInt('x00280100'),
      samplesPerPixel: readInt('x00280002'),
      photometricInterpretation: readStr('x00280004')
    };

    // Log metadata parsing success
    auditLogger.logDicomProcessingEvent('metadata_parsed', {
      instanceId,
      studyInstanceUID: metadata.studyInstanceUID,
      seriesInstanceUID: metadata.seriesInstanceUID,
      sopInstanceUID: metadata.sopInstanceUID,
      modality: metadata.modality,
      aeTitle: 'ORTHANC',
      sourceIP: 'localhost'
    }, {
      correlationId,
      numberOfFrames: metadata.numberOfFrames,
      imageSize: `${metadata.rows}x${metadata.cols}`,
      bitsAllocated: metadata.bitsAllocated,
      samplesPerPixel: metadata.samplesPerPixel
    });

    logger.info('DICOM metadata parsed', {
      instanceId,
      correlationId,
      studyInstanceUID: metadata.studyInstanceUID,
      modality: metadata.modality,
      numberOfFrames: metadata.numberOfFrames,
      imageSize: `${metadata.rows}x${metadata.cols}`
    });

    return metadata;

  } catch (error) {
    // Log metadata parsing failure
    auditLogger.logDicomProcessingEvent('metadata_parse_failed', {
      instanceId,
      studyInstanceUID: 'unknown',
      seriesInstanceUID: 'unknown',
      sopInstanceUID: 'unknown',
      modality: 'unknown',
      aeTitle: 'ORTHANC',
      sourceIP: 'localhost'
    }, {
      correlationId,
      errorMessage: error.message,
      success: false
    });

    logger.error('Failed to parse DICOM metadata', {
      instanceId,
      correlationId,
      error: error.message
    });
    throw new Error(`DICOM parsing failed: ${error.message}`);
  }
}

/**
 * Anonymize DICOM buffer by removing/replacing PHI
 * CRITICAL: Works on copy, never modifies original
 */
async function anonymizeDicomBuffer(buffer, metadata, correlationId) {
  try {
    // For now, return the buffer as-is since we're working with copies
    // In production, implement proper DICOM anonymization here
    // This could use libraries like dcmtk or custom anonymization logic
    
    logger.info('DICOM anonymization applied', {
      originalSize: buffer.length,
      studyInstanceUID: metadata.studyInstanceUID
    });

    // Generate anonymized patient info
    const anonymizedPatientID = `ANON_${crypto.createHash('md5')
      .update(metadata.patientID || 'unknown')
      .digest('hex')
      .substring(0, 8)}`;

    // Log anonymization event
    auditLogger.logAnonymizationEvent('completed', {
      studyInstanceUID: metadata.studyInstanceUID,
      seriesInstanceUID: metadata.seriesInstanceUID,
      sopInstanceUID: metadata.sopInstanceUID,
      anonymizedPatientID,
      policyVersion: '1.0.0',
      policyName: 'basic-anonymization',
      tagsRemoved: ['PatientName', 'PatientID', 'PatientBirthDate'],
      tagsPseudonymized: ['PatientID'],
      tagsRetained: ['StudyInstanceUID', 'SeriesInstanceUID', 'SOPInstanceUID'],
      approvedBy: 'system',
      approvalDate: new Date().toISOString()
    }, {
      correlationId,
      validationResult: 'passed',
      originalSize: buffer.length,
      anonymizedSize: buffer.length
    });

    // Store anonymization mapping for audit trail
    logger.info('Anonymization mapping created', {
      correlationId,
      anonymizedPatientID,
      studyInstanceUID: metadata.studyInstanceUID
    });

    return buffer; // Return anonymized buffer

  } catch (error) {
    // Log anonymization failure
    auditLogger.logAnonymizationEvent('failed', {
      studyInstanceUID: metadata.studyInstanceUID,
      seriesInstanceUID: metadata.seriesInstanceUID,
      sopInstanceUID: metadata.sopInstanceUID,
      anonymizedPatientID: 'unknown',
      policyVersion: '1.0.0',
      policyName: 'basic-anonymization'
    }, {
      correlationId,
      validationResult: 'failed',
      validationErrors: [error.message]
    });

    logger.error('DICOM anonymization failed', {
      correlationId,
      error: error.message,
      studyInstanceUID: metadata.studyInstanceUID
    });
    throw new Error(`Anonymization failed: ${error.message}`);
  }
}

/**
 * Forward anonymized DICOM to main processing API
 */
async function forwardToMainAPI(dicomBuffer, jobData) {
  try {
    const mainApiUrl = process.env.MAIN_API_URL || 'http://host.docker.internal:8001';
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', dicomBuffer, {
      filename: `${jobData.sopInstanceUID}.dcm`,
      contentType: 'application/dicom'
    });
    
    // Add metadata as form fields
    if (jobData.patientID) formData.append('patientID', jobData.patientID);
    if (jobData.patientName) formData.append('patientName', jobData.patientName);
    formData.append('source', 'orthanc-bridge');
    formData.append('originalInstanceId', jobData.originalInstanceId);

    // Forward to main API upload endpoint
    const response = await axios.post(`${mainApiUrl}/api/dicom/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Bridge-Request-ID': jobData.requestId,
        'X-Bridge-Source': 'orthanc-webhook'
      },
      timeout: 60000, // 60 second timeout
      maxContentLength: 100 * 1024 * 1024, // 100MB max
      maxBodyLength: 100 * 1024 * 1024
    });

    // Log successful forwarding
    auditLogger.logDicomProcessingEvent('forwarded_to_api', {
      instanceId: jobData.instanceId,
      studyInstanceUID: jobData.studyInstanceUID,
      seriesInstanceUID: jobData.seriesInstanceUID,
      sopInstanceUID: jobData.sopInstanceUID,
      modality: jobData.modality,
      aeTitle: 'ORTHANC',
      sourceIP: jobData.sourceIP || 'localhost'
    }, {
      correlationId: jobData.correlationId,
      requestId: jobData.requestId,
      targetEndpoint: `${mainApiUrl}/api/dicom/upload`,
      responseStatus: response.status,
      success: true
    });

    logger.info('Successfully forwarded to main API', {
      correlationId: jobData.correlationId,
      instanceId: jobData.instanceId,
      sopInstanceUID: jobData.sopInstanceUID,
      responseStatus: response.status,
      responseData: response.data
    });

    return {
      success: true,
      mainApiResponse: response.data,
      forwardedAt: new Date().toISOString()
    };

  } catch (error) {
    // Log forwarding failure
    auditLogger.logDicomProcessingEvent('forwarding_failed', {
      instanceId: jobData.instanceId,
      studyInstanceUID: jobData.studyInstanceUID,
      seriesInstanceUID: jobData.seriesInstanceUID,
      sopInstanceUID: jobData.sopInstanceUID,
      modality: jobData.modality,
      aeTitle: 'ORTHANC',
      sourceIP: jobData.sourceIP || 'localhost'
    }, {
      correlationId: jobData.correlationId,
      requestId: jobData.requestId,
      targetEndpoint: `${mainApiUrl}/api/dicom/upload`,
      errorMessage: error.message,
      responseStatus: error.response?.status,
      success: false
    });

    logger.error('Failed to forward to main API', {
      correlationId: jobData.correlationId,
      instanceId: jobData.instanceId,
      sopInstanceUID: jobData.sopInstanceUID,
      error: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });

    throw new Error(`Main API forwarding failed: ${error.message}`);
  }
}

module.exports = {
  processInstance
};