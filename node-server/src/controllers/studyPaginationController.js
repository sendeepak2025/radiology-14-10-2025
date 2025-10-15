/**
 * Study Pagination Controller
 * Optimized endpoints for paginated study retrieval
 */

const Study = require('../models/Study');
const { paginateQuery, parsePaginationParams } = require('../utils/pagination');

/**
 * GET /api/studies/paginated
 * Get paginated list of studies with search and filter support
 */
async function getPaginatedStudies(req, res) {
  try {
    const { page, limit } = parsePaginationParams(req.query);
    const { 
      patientName, 
      patientID, 
      studyDate,
      studyDateFrom,
      studyDateTo,
      modality, 
      studyDescription,
      accessionNumber,
      search, // Full-text search
    } = req.query;
    
    // Build query
    const query = {};
    
    // Search filters
    if (patientName) {
      query.patientName = { $regex: patientName, $options: 'i' };
    }
    
    if (patientID) {
      query.patientID = { $regex: patientID, $options: 'i' };
    }
    
    if (studyDate) {
      query.studyDate = studyDate;
    }
    
    // Date range filter
    if (studyDateFrom || studyDateTo) {
      query.studyDate = {};
      if (studyDateFrom) {
        query.studyDate.$gte = studyDateFrom;
      }
      if (studyDateTo) {
        query.studyDate.$lte = studyDateTo;
      }
    }
    
    if (modality) {
      // Handle both single modality and comma-separated list
      const modalityArray = Array.isArray(modality) 
        ? modality 
        : modality.split(',').map(m => m.trim());
      
      if (modalityArray.length === 1) {
        query.modality = modalityArray[0];
      } else if (modalityArray.length > 1) {
        query.modality = { $in: modalityArray };
      }
    }
    
    if (studyDescription) {
      query.studyDescription = { $regex: studyDescription, $options: 'i' };
    }
    
    if (accessionNumber) {
      query.accessionNumber = accessionNumber;
    }
    
    // Full-text search (if provided)
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sort options
    const sortOptions = req.query.sortBy || 'studyDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortOptions]: sortOrder };
    
    // If using text search, sort by relevance score
    const select = search 
      ? { score: { $meta: 'textScore' }, ...Study.schema.obj }
      : null;
    
    if (search) {
      sort.score = { $meta: 'textScore' };
    }
    
    // Execute paginated query
    const result = await paginateQuery(Study, query, {
      page,
      limit,
      sort,
      select,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching paginated studies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch studies',
      message: error.message,
    });
  }
}

/**
 * GET /api/studies/count
 * Get count of studies with optional filters
 */
async function getStudiesCount(req, res) {
  try {
    const { 
      patientName, 
      patientID, 
      modality, 
      studyDate,
      studyDateFrom,
      studyDateTo,
    } = req.query;
    
    // Build query
    const query = {};
    
    if (patientName) {
      query.patientName = { $regex: patientName, $options: 'i' };
    }
    
    if (patientID) {
      query.patientID = { $regex: patientID, $options: 'i' };
    }
    
    if (studyDate) {
      query.studyDate = studyDate;
    }
    
    if (studyDateFrom || studyDateTo) {
      query.studyDate = {};
      if (studyDateFrom) query.studyDate.$gte = studyDateFrom;
      if (studyDateTo) query.studyDate.$lte = studyDateTo;
    }
    
    if (modality) {
      query.modality = modality;
    }
    
    // Count documents
    const total = await Study.countDocuments(query);
    
    res.json({
      success: true,
      total,
      query: Object.keys(query).length > 0 ? query : 'all',
    });
  } catch (error) {
    console.error('Error counting studies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count studies',
    });
  }
}

/**
 * GET /api/studies/search
 * Advanced search with full-text search capability
 */
async function searchStudies(req, res) {
  try {
    const { q, page, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
      });
    }
    
    const { page: parsedPage, limit: parsedLimit, skip } = parsePaginationParams({ page, limit });
    
    // Perform text search
    const total = await Study.countDocuments({ $text: { $search: q } });
    
    const results = await Study.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parsedLimit);
    
    const totalPages = Math.ceil(total / parsedLimit);
    
    res.json({
      success: true,
      data: results,
      pagination: {
        currentPage: parsedPage,
        pageSize: parsedLimit,
        totalItems: total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1,
      },
      query: q,
    });
  } catch (error) {
    console.error('Error searching studies:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
    });
  }
}

/**
 * GET /api/studies/recent
 * Get most recent studies
 */
async function getRecentStudies(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const maxLimit = Math.min(limit, 50); // Cap at 50
    
    const recentStudies = await Study.find({})
      .sort({ studyDate: -1, createdAt: -1 })
      .limit(maxLimit)
      .select('studyInstanceUID patientName studyDate modality studyDescription numberOfInstances');
    
    res.json({
      success: true,
      data: recentStudies,
      count: recentStudies.length,
    });
  } catch (error) {
    console.error('Error fetching recent studies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent studies',
    });
  }
}

/**
 * GET /api/studies/by-patient/:patientID
 * Get all studies for a specific patient with pagination
 */
async function getStudiesByPatient(req, res) {
  try {
    const { patientID } = req.params;
    const { page, limit } = parsePaginationParams(req.query);
    
    const query = { patientID };
    
    const result = await paginateQuery(Study, query, {
      page,
      limit,
      sort: { studyDate: -1 },
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching patient studies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient studies',
    });
  }
}

/**
 * GET /api/studies/by-modality/:modality
 * Get all studies for a specific modality with pagination
 */
async function getStudiesByModality(req, res) {
  try {
    const { modality } = req.params;
    const { page, limit } = parsePaginationParams(req.query);
    
    const query = { modality: modality.toUpperCase() };
    
    const result = await paginateQuery(Study, query, {
      page,
      limit,
      sort: { studyDate: -1 },
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching studies by modality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch studies',
    });
  }
}

/**
 * GET /api/studies/stats
 * Get study statistics
 */
async function getStudyStats(req, res) {
  try {
    const [
      totalStudies,
      modalityCounts,
      recentCount,
    ] = await Promise.all([
      Study.countDocuments({}),
      Study.aggregate([
        { $group: { _id: '$modality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Study.countDocuments({
        studyDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      }),
    ]);
    
    res.json({
      success: true,
      stats: {
        totalStudies,
        modalityBreakdown: modalityCounts,
        studiesLastWeek: recentCount,
      },
    });
  } catch (error) {
    console.error('Error fetching study stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
}

module.exports = {
  getPaginatedStudies,
  getStudiesCount,
  searchStudies,
  getRecentStudies,
  getStudiesByPatient,
  getStudiesByModality,
  getStudyStats,
};
