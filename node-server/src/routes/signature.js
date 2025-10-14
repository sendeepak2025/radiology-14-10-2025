const express = require('express');
const router = express.Router();
const signatureController = require('../controllers/signatureController');

/**
 * Signature Upload API Routes
 * TODO: Add authentication before production - currently open for testing
 */

// Dummy authentication middleware for testing
const dummyAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 'test-user-123',
    _id: 'test-user-123',
    firstName: 'Test',
    lastName: 'Radiologist',
    email: 'test@example.com',
    username: 'test.radiologist'
  };
  next();
};

// Upload signature to Cloudinary
router.post('/upload', 
  dummyAuthMiddleware,
  signatureController.uploadSignature
);

// Get signature by report ID
router.get('/report/:reportId', 
  dummyAuthMiddleware,
  signatureController.getSignature
);

// Delete signature
router.delete('/:publicId', 
  dummyAuthMiddleware,
  signatureController.deleteSignature
);

module.exports = router;
