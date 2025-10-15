/**
 * DICOM File Validation Middleware
 * Validates DICOM files before processing
 */

const fs = require('fs').promises;

/**
 * DICOM File Magic Number (DICM at offset 128)
 */
const DICOM_MAGIC = Buffer.from('DICM', 'ascii');
const DICOM_PREAMBLE_SIZE = 128;

/**
 * Validate DICOM file format
 */
async function validateDICOMFile(filePath) {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);
    
    // Check file size (minimum 132 bytes for preamble + DICM)
    if (stats.size < DICOM_PREAMBLE_SIZE + 4) {
      return {
        valid: false,
        error: 'File too small to be a valid DICOM file',
      };
    }
    
    // Check maximum file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds maximum allowed size (2GB)',
      };
    }
    
    // Read the file header
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(DICOM_PREAMBLE_SIZE + 4);
    await fileHandle.read(buffer, 0, DICOM_PREAMBLE_SIZE + 4, 0);
    await fileHandle.close();
    
    // Check for DICM magic number at offset 128
    const magicNumber = buffer.slice(DICOM_PREAMBLE_SIZE, DICOM_PREAMBLE_SIZE + 4);
    
    if (!magicNumber.equals(DICOM_MAGIC)) {
      // Some DICOM files don't have the preamble (implicit VR, little endian)
      // In this case, we should check for DICOM tags at the beginning
      // This is a simplified check - in production, use a DICOM parser like dcmjs
      return {
        valid: false,
        error: 'Invalid DICOM file format (missing DICM magic number)',
        warning: 'File might be a valid DICOM file without preamble',
      };
    }
    
    return {
      valid: true,
      fileSize: stats.size,
      fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    return {
      valid: false,
      error: `File validation error: ${error.message}`,
    };
  }
}

/**
 * Validate DICOM file extension
 */
function validateDICOMExtension(filename) {
  const validExtensions = ['.dcm', '.dicom', '.DCM', '.DICOM', ''];
  const ext = filename.substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext) || !ext;
}

/**
 * Middleware to validate uploaded DICOM file
 */
const validateUploadedDICOM = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }
    
    const file = req.file || (req.files && req.files[0]);
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file upload',
      });
    }
    
    // Validate file extension
    if (!validateDICOMExtension(file.originalname)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file extension. Expected .dcm or .dicom',
      });
    }
    
    // Validate DICOM format
    const validation = await validateDICOMFile(file.path);
    
    if (!validation.valid) {
      // Clean up the uploaded file
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error('Error deleting invalid file:', err);
      }
      
      return res.status(400).json({
        success: false,
        error: validation.error,
        warning: validation.warning,
      });
    }
    
    // Attach validation info to request
    req.dicomValidation = validation;
    
    next();
  } catch (error) {
    console.error('DICOM validation error:', error);
    res.status(500).json({
      success: false,
      error: 'File validation failed',
    });
  }
};

/**
 * Validate DICOM file from buffer
 */
function validateDICOMBuffer(buffer) {
  try {
    // Check buffer size
    if (buffer.length < DICOM_PREAMBLE_SIZE + 4) {
      return {
        valid: false,
        error: 'Buffer too small to be a valid DICOM file',
      };
    }
    
    // Check for DICM magic number
    const magicNumber = buffer.slice(
      DICOM_PREAMBLE_SIZE,
      DICOM_PREAMBLE_SIZE + 4
    );
    
    if (!magicNumber.equals(DICOM_MAGIC)) {
      return {
        valid: false,
        error: 'Invalid DICOM format (missing DICM magic number)',
      };
    }
    
    return {
      valid: true,
      fileSize: buffer.length,
      fileSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    return {
      valid: false,
      error: `Buffer validation error: ${error.message}`,
    };
  }
}

/**
 * Prevent duplicate study uploads
 */
const preventDuplicateStudy = (StudyModel) => {
  return async (req, res, next) => {
    try {
      const studyInstanceUID =
        req.body.studyInstanceUID || req.params.studyInstanceUID;
      
      if (!studyInstanceUID) {
        return next(); // No UID to check, proceed
      }
      
      // Check if study already exists
      const existingStudy = await StudyModel.findOne({ studyInstanceUID });
      
      if (existingStudy) {
        return res.status(409).json({
          success: false,
          error: 'Study already exists',
          studyInstanceUID,
          existingStudyId: existingStudy._id,
        });
      }
      
      next();
    } catch (error) {
      console.error('Duplicate check error:', error);
      // Continue anyway - don't block on duplicate check failure
      next();
    }
  };
};

module.exports = {
  validateDICOMFile,
  validateDICOMExtension,
  validateDICOMBuffer,
  validateUploadedDICOM,
  preventDuplicateStudy,
};
