/**
 * Input Validation Middleware
 * Provides validation and sanitization for API requests
 */

const validator = require('validator');

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Trim whitespace
  str = str.trim();
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Escape HTML to prevent XSS
  str = validator.escape(str);
  
  return str;
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

/**
 * Input Sanitization Middleware
 * Sanitizes all request body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(500).json({
      success: false,
      error: 'Input validation error',
    });
  }
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return validator.isEmail(email);
};

/**
 * Validate MongoDB ObjectID
 */
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return validator.isMongoId(id);
};

/**
 * Validate DICOM UID format
 */
const validateDICOMUID = (uid) => {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  // DICOM UID format: 1.2.840.xxxx
  // Must start with digit, contain only digits and dots
  // Each component must be numeric
  const uidPattern = /^[0-9]+(\.[0-9]+)*$/;
  
  if (!uidPattern.test(uid)) {
    return false;
  }
  
  // Maximum length is 64 characters
  if (uid.length > 64) {
    return false;
  }
  
  // Minimum length should be at least 3 characters (e.g., "1.2")
  if (uid.length < 3) {
    return false;
  }
  
  return true;
};

/**
 * Validate patient name
 */
const validatePatientName = (name) => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Allow letters, spaces, hyphens, apostrophes, and DICOM ^ delimiter
  const namePattern = /^[a-zA-Z\s\-'^]+$/;
  return namePattern.test(name) && name.length <= 100;
};

/**
 * Validate date format (YYYY-MM-DD or YYYYMMDD)
 */
const validateDate = (date) => {
  if (!date || typeof date !== 'string') {
    return false;
  }
  
  // DICOM date format: YYYYMMDD
  if (/^\d{8}$/.test(date)) {
    const year = parseInt(date.substring(0, 4));
    const month = parseInt(date.substring(4, 6));
    const day = parseInt(date.substring(6, 8));
    
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    return true;
  }
  
  // ISO date format: YYYY-MM-DD
  return validator.isDate(date, { format: 'YYYY-MM-DD' });
};

/**
 * Validate modality code
 */
const validateModality = (modality) => {
  if (!modality || typeof modality !== 'string') {
    return false;
  }
  
  // Common DICOM modalities
  const validModalities = [
    'CR', 'CT', 'MR', 'US', 'XA', 'RF', 'DX', 'MG', 'NM', 'PT',
    'ES', 'XC', 'DF', 'DG', 'LS', 'VL', 'DM', 'ECG', 'GM', 'IO',
    'IVUS', 'OP', 'OPM', 'OPT', 'OPV', 'PX', 'SM', 'TG', 'SC',
    'RTIMAGE', 'RTDOSE', 'RTSTRUCT', 'RTPLAN', 'SR', 'DOC', 'OT',
  ];
  
  return validModalities.includes(modality.toUpperCase());
};

/**
 * Validate study instance UID from request
 */
const validateStudyUID = (req, res, next) => {
  const studyUID = req.params.studyInstanceUID || req.body.studyInstanceUID;
  
  if (!studyUID) {
    return res.status(400).json({
      success: false,
      error: 'Study Instance UID is required',
    });
  }
  
  if (!validateDICOMUID(studyUID)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Study Instance UID format',
    });
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Page number must be greater than 0',
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
    });
  }
  
  req.pagination = { page, limit };
  next();
};

/**
 * Validate search query parameters
 */
const validateSearchQuery = (req, res, next) => {
  const { patientName, studyDate, modality, studyDescription } = req.query;
  
  if (patientName && !validatePatientName(patientName)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid patient name format',
    });
  }
  
  if (studyDate && !validateDate(studyDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid study date format. Use YYYY-MM-DD or YYYYMMDD',
    });
  }
  
  if (modality && !validateModality(modality)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid modality code',
    });
  }
  
  if (studyDescription && studyDescription.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Study description too long',
    });
  }
  
  next();
};

/**
 * Rate limiting helper
 */
const createRateLimiter = (maxRequests, windowMs) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < windowMs
    );
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
      });
    }
    
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    next();
  };
};

/**
 * General rate limiter (100 requests per minute)
 */
const rateLimiter = createRateLimiter(100, 60 * 1000);

/**
 * Strict rate limiter for sensitive endpoints (10 requests per minute)
 */
const strictRateLimiter = createRateLimiter(10, 60 * 1000);

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  validateEmail,
  validateObjectId,
  validateDICOMUID,
  validatePatientName,
  validateDate,
  validateModality,
  validateStudyUID,
  validatePagination,
  validateSearchQuery,
  rateLimiter,
  strictRateLimiter,
};
