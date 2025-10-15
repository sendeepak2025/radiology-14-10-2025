/**
 * Report Controller
 * Handles CRUD operations for reports
 */

const Report = require('../models/Report');
const ReportTemplate = require('../models/ReportTemplate');
const Study = require('../models/Study');

/**
 * POST /api/reports
 * Create a new report
 */
async function createReport(req, res) {
  try {
    const {
      studyInstanceUID,
      templateId,
      content,
      sections,
      findings,
      impression,
      organizationId,
    } = req.body;

    // Validate required fields
    if (!studyInstanceUID || !content) {
      return res.status(400).json({
        success: false,
        error: 'Study UID and content are required',
      });
    }

    // Fetch study details
    const study = await Study.findOne({ studyInstanceUID });
    if (!study) {
      return res.status(404).json({
        success: false,
        error: 'Study not found',
      });
    }

    // Fetch template if provided
    let templateName = null;
    if (templateId) {
      const template = await ReportTemplate.findOne({
        $or: [{ _id: templateId }, { templateId }],
      });
      if (template) {
        templateName = template.name;
        // Increment template usage
        await template.updateOne({ $inc: { usageCount: 1 } });
      }
    }

    // Generate unique reportId
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate metadata
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

    const newReport = new Report({
      reportId,
      studyInstanceUID,
      patientName: study.patientName,
      patientID: study.patientID,
      studyDate: study.studyDate,
      modality: study.modality,
      templateId,
      templateName,
      content,
      sections,
      findings,
      impression,
      status: 'draft',
      createdBy: req.user?.id || 'system',
      radiologist: {
        name: req.user?.name || 'Unknown',
        id: req.user?.id || 'system',
      },
      organizationId,
      version: 1,
      metadata: {
        wordCount,
        readingTime,
        criticalFindings: false,
      },
    });

    await newReport.save();

    res.status(201).json({
      success: true,
      data: newReport,
      message: 'Report created successfully',
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
      message: error.message,
    });
  }
}

/**
 * GET /api/reports/:id
 * Get a specific report
 */
async function getReportById(req, res) {
  try {
    const { id } = req.params;

    const report = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      message: error.message,
    });
  }
}

/**
 * GET /api/studies/:studyInstanceUID/reports
 * Get all reports for a study
 */
async function getReportsByStudy(req, res) {
  try {
    const { studyInstanceUID } = req.params;

    const reports = await Report.find({ studyInstanceUID })
      .sort({ version: -1, createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      data: reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      message: error.message,
    });
  }
}

/**
 * PUT /api/reports/:id
 * Update a report
 */
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the report
    const report = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Don't allow updating finalized reports
    if (report.status === 'finalized' && updates.status !== 'amended') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update finalized report. Create an amendment instead.',
      });
    }

    // Update metadata if content changed
    if (updates.content) {
      const wordCount = updates.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);
      updates.metadata = {
        ...report.metadata,
        wordCount,
        readingTime,
      };
    }

    // Update report
    Object.assign(report, updates);
    await report.save();

    res.json({
      success: true,
      data: report,
      message: 'Report updated successfully',
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report',
      message: error.message,
    });
  }
}

/**
 * POST /api/reports/:id/finalize
 * Finalize a report
 */
async function finalizeReport(req, res) {
  try {
    const { id } = req.params;

    const report = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (report.status === 'finalized') {
      return res.status(400).json({
        success: false,
        error: 'Report is already finalized',
      });
    }

    report.status = 'finalized';
    report.finalizedBy = req.user?.id || 'system';
    report.finalizedAt = new Date();

    await report.save();

    res.json({
      success: true,
      data: report,
      message: 'Report finalized successfully',
    });
  } catch (error) {
    console.error('Error finalizing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize report',
      message: error.message,
    });
  }
}

/**
 * POST /api/reports/:id/sign
 * Sign a report with digital signature
 */
async function signReport(req, res) {
  try {
    const { id } = req.params;
    const { signatureData } = req.body;

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        error: 'Signature data is required',
      });
    }

    const report = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (report.status !== 'finalized') {
      return res.status(400).json({
        success: false,
        error: 'Only finalized reports can be signed',
      });
    }

    report.signature = {
      data: signatureData,
      timestamp: new Date(),
      signedBy: req.user?.id || 'system',
    };

    await report.save();

    res.json({
      success: true,
      data: report,
      message: 'Report signed successfully',
    });
  } catch (error) {
    console.error('Error signing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign report',
      message: error.message,
    });
  }
}

/**
 * POST /api/reports/:id/amend
 * Create an amendment to a finalized report
 */
async function amendReport(req, res) {
  try {
    const { id } = req.params;
    const { reason, changes, newContent } = req.body;

    const originalReport = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!originalReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (originalReport.status !== 'finalized') {
      return res.status(400).json({
        success: false,
        error: 'Only finalized reports can be amended',
      });
    }

    // Create new version
    const newReportId = `${originalReport.reportId}-V${originalReport.version + 1}`;

    const amendedReport = new Report({
      ...originalReport.toObject(),
      _id: undefined,
      reportId: newReportId,
      content: newContent || originalReport.content,
      status: 'amended',
      version: originalReport.version + 1,
      previousVersionId: originalReport.reportId,
      amendments: [
        ...(originalReport.amendments || []),
        {
          amendedBy: req.user?.id || 'system',
          amendedAt: new Date(),
          reason,
          changes,
        },
      ],
      signature: undefined, // Remove old signature
      finalizedAt: undefined,
      finalizedBy: undefined,
    });

    await amendedReport.save();

    res.status(201).json({
      success: true,
      data: amendedReport,
      message: 'Report amended successfully',
    });
  } catch (error) {
    console.error('Error amending report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to amend report',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/reports/:id
 * Delete a report (only drafts)
 */
async function deleteReport(req, res) {
  try {
    const { id } = req.params;

    const report = await Report.findOne({
      $or: [{ _id: id }, { reportId: id }],
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (report.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft reports can be deleted',
      });
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      message: error.message,
    });
  }
}

/**
 * GET /api/reports/stats
 * Get report statistics
 */
async function getReportStats(req, res) {
  try {
    const [
      totalReports,
      byStatus,
      recentReports,
      avgReadingTime,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('reportId studyInstanceUID patientName status createdAt'),
      Report.aggregate([
        { $group: { _id: null, avgTime: { $avg: '$metadata.readingTime' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalReports,
        byStatus,
        recentReports,
        avgReadingTime: avgReadingTime[0]?.avgTime || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report statistics',
    });
  }
}

module.exports = {
  createReport,
  getReportById,
  getReportsByStudy,
  updateReport,
  finalizeReport,
  signReport,
  amendReport,
  deleteReport,
  getReportStats,
};
