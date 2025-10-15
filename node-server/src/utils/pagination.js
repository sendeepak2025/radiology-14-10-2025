/**
 * Pagination Utilities
 * Provides consistent pagination across the application
 */

/**
 * Default pagination settings
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters
 */
function parsePaginationParams(query) {
  let page = parseInt(query.page) || DEFAULT_PAGE;
  let limit = parseInt(query.limit) || DEFAULT_LIMIT;
  
  // Validate page
  if (page < 1) {
    page = DEFAULT_PAGE;
  }
  
  // Validate and cap limit
  if (limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip,
  };
}

/**
 * Create pagination metadata
 */
function createPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    currentPage: page,
    pageSize: limit,
    totalItems: total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}

/**
 * Paginate a Mongoose query
 * Returns both results and pagination metadata
 */
async function paginateQuery(model, query = {}, options = {}) {
  const {
    page: requestedPage,
    limit: requestedLimit,
    sort = { createdAt: -1 },
    select = null,
    populate = null,
  } = options;
  
  // Parse pagination params
  const { page, limit, skip } = parsePaginationParams({
    page: requestedPage,
    limit: requestedLimit,
  });
  
  try {
    // Count total documents
    const total = await model.countDocuments(query);
    
    // Build query
    let dbQuery = model.find(query).skip(skip).limit(limit).sort(sort);
    
    // Apply select if provided
    if (select) {
      dbQuery = dbQuery.select(select);
    }
    
    // Apply populate if provided
    if (populate) {
      dbQuery = dbQuery.populate(populate);
    }
    
    // Execute query
    const results = await dbQuery.exec();
    
    // Create pagination metadata
    const pagination = createPaginationMeta(page, limit, total);
    
    return {
      success: true,
      data: results,
      pagination,
    };
  } catch (error) {
    console.error('Pagination error:', error);
    throw error;
  }
}

/**
 * Create paginated response
 */
function createPaginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination,
  };
}

/**
 * Cursor-based pagination (for infinite scroll)
 */
async function paginateWithCursor(model, query = {}, options = {}) {
  const {
    limit: requestedLimit = DEFAULT_LIMIT,
    cursor = null, // Last item's ID from previous page
    sort = { _id: 1 },
  } = options;
  
  // Validate limit
  let limit = parseInt(requestedLimit);
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  
  // Add cursor condition if provided
  if (cursor) {
    query._id = { $gt: cursor };
  }
  
  try {
    // Fetch limit + 1 to check if there's a next page
    const results = await model.find(query).limit(limit + 1).sort(sort);
    
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    
    const nextCursor = hasMore && items.length > 0 
      ? items[items.length - 1]._id.toString() 
      : null;
    
    return {
      success: true,
      data: items,
      cursor: {
        next: nextCursor,
        hasMore,
      },
    };
  } catch (error) {
    console.error('Cursor pagination error:', error);
    throw error;
  }
}

/**
 * Express middleware for pagination
 */
function paginationMiddleware(req, res, next) {
  const pagination = parsePaginationParams(req.query);
  req.pagination = pagination;
  next();
}

module.exports = {
  parsePaginationParams,
  createPaginationMeta,
  paginateQuery,
  createPaginatedResponse,
  paginateWithCursor,
  paginationMiddleware,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
