const cloudinary = require('cloudinary').v2;

/**
 * Upload signature image to Cloudinary
 */
exports.uploadSignature = async (req, res) => {
  try {
    const { signatureDataUrl, reportId, radiologistName } = req.body;

    if (!signatureDataUrl) {
      return res.status(400).json({
        success: false,
        error: 'Signature data is required'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(signatureDataUrl, {
      folder: 'medical-reports/signatures',
      public_id: `signature_${reportId || Date.now()}`,
      resource_type: 'image',
      tags: ['signature', 'medical-report', radiologistName || 'unknown'],
      context: {
        reportId: reportId || 'draft',
        radiologist: radiologistName || 'Unknown',
        uploadedAt: new Date().toISOString()
      }
    });

    console.log('✅ Signature uploaded to Cloudinary:', uploadResult.secure_url);

    res.json({
      success: true,
      data: {
        signatureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        uploadedAt: new Date().toISOString()
      },
      message: 'Signature uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload signature',
      details: error.message
    });
  }
};

/**
 * Get signature by report ID
 */
exports.getSignature = async (req, res) => {
  try {
    const { reportId } = req.params;

    // Search for signature in Cloudinary
    const result = await cloudinary.search
      .expression(`folder:medical-reports/signatures AND context.reportId=${reportId}`)
      .sort_by('created_at', 'desc')
      .max_results(1)
      .execute();

    if (result.resources.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Signature not found'
      });
    }

    const signature = result.resources[0];

    res.json({
      success: true,
      data: {
        signatureUrl: signature.secure_url,
        publicId: signature.public_id,
        uploadedAt: signature.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signature',
      details: error.message
    });
  }
};

/**
 * Delete signature
 */
exports.deleteSignature = async (req, res) => {
  try {
    const { publicId } = req.params;

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Signature deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Signature not found or already deleted'
      });
    }

  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete signature',
      details: error.message
    });
  }
};
