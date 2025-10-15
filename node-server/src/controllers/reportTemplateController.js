/**
 * Report Template Controller
 * Handles CRUD operations for report templates
 */

const ReportTemplate = require('../models/ReportTemplate');
const defaultTemplates = require('../data/defaultReportTemplates');

/**
 * GET /api/report-templates
 * Get all report templates with optional filters
 */
async function getReportTemplates(req, res) {
  try {
    const {
      modality,
      category,
      bodyPart,
      isActive,
      organizationId,
      search,
    } = req.query;

    // Build query
    const query = {};

    if (modality) {
      query.modality = { $in: modality.split(',') };
    }

    if (category) {
      query.category = category;
    }

    if (bodyPart) {
      query.bodyPart = new RegExp(bodyPart, 'i');
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (organizationId) {
      query.$or = [
        { organizationId },
        { isPublic: true },
      ];
    } else {
      query.isPublic = true;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    const templates = await ReportTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report templates',
      message: error.message,
    });
  }
}

/**
 * GET /api/report-templates/:id
 * Get a specific report template
 */
async function getReportTemplateById(req, res) {
  try {
    const { id } = req.params;

    const template = await ReportTemplate.findOne({
      $or: [{ _id: id }, { templateId: id }],
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching report template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report template',
      message: error.message,
    });
  }
}

/**
 * POST /api/report-templates
 * Create a new report template
 */
async function createReportTemplate(req, res) {
  try {
    const {
      name,
      description,
      modality,
      bodyPart,
      category,
      template,
      sections,
      variables,
      isPublic,
      organizationId,
      tags,
    } = req.body;

    // Validate required fields
    if (!name || !template) {
      return res.status(400).json({
        success: false,
        error: 'Name and template are required',
      });
    }

    // Generate unique templateId
    const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTemplate = new ReportTemplate({
      templateId,
      name,
      description,
      modality,
      bodyPart,
      category: category || 'custom',
      template,
      sections,
      variables,
      isPublic: isPublic !== undefined ? isPublic : false,
      createdBy: req.user?.id || 'system',
      organizationId,
      tags,
      isActive: true,
    });

    await newTemplate.save();

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('Error creating report template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report template',
      message: error.message,
    });
  }
}

/**
 * PUT /api/report-templates/:id
 * Update a report template
 */
async function updateReportTemplate(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing templateId
    delete updates.templateId;
    delete updates.createdBy;
    delete updates.usageCount;

    const template = await ReportTemplate.findOneAndUpdate(
      { $or: [{ _id: id }, { templateId: id }] },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating report template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report template',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/report-templates/:id
 * Delete (soft delete) a report template
 */
async function deleteReportTemplate(req, res) {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const template = await ReportTemplate.findOneAndUpdate(
      { $or: [{ _id: id }, { templateId: id }] },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report template',
      message: error.message,
    });
  }
}

/**
 * POST /api/report-templates/seed
 * Seed default templates
 */
async function seedDefaultTemplates(req, res) {
  try {
    // Check if default templates already exist
    const existingCount = await ReportTemplate.countDocuments({
      createdBy: 'system',
    });

    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Default templates already exist',
        count: existingCount,
      });
    }

    // Insert default templates
    const inserted = await ReportTemplate.insertMany(defaultTemplates);

    res.json({
      success: true,
      data: inserted,
      count: inserted.length,
      message: 'Default templates seeded successfully',
    });
  } catch (error) {
    console.error('Error seeding default templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed default templates',
      message: error.message,
    });
  }
}

/**
 * POST /api/report-templates/:id/increment-usage
 * Increment usage count for a template
 */
async function incrementUsageCount(req, res) {
  try {
    const { id } = req.params;

    const template = await ReportTemplate.findOneAndUpdate(
      { $or: [{ _id: id }, { templateId: id }] },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment usage count',
    });
  }
}

/**
 * GET /api/report-templates/stats
 * Get template statistics
 */
async function getTemplateStats(req, res) {
  try {
    const [
      totalTemplates,
      activeTemplates,
      byCategory,
      byModality,
      mostUsed,
    ] = await Promise.all([
      ReportTemplate.countDocuments(),
      ReportTemplate.countDocuments({ isActive: true }),
      ReportTemplate.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ReportTemplate.aggregate([
        { $unwind: '$modality' },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ReportTemplate.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(5)
        .select('templateId name usageCount'),
    ]);

    res.json({
      success: true,
      stats: {
        totalTemplates,
        activeTemplates,
        byCategory,
        byModality,
        mostUsed,
      },
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template statistics',
    });
  }
}

module.exports = {
  getReportTemplates,
  getReportTemplateById,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  seedDefaultTemplates,
  incrementUsageCount,
  getTemplateStats,
};
