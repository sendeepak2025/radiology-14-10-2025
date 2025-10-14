const crypto = require('crypto');
const Redis = require('redis');
const logger = require('./logger');

// Redis client for rate limiting and nonce tracking
let redisClient = null;

/**
 * Initialize Redis client for security operations
 */
async function initializeSecurityRedis() {
  if (!redisClient) {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Security Redis client error', { error: err.message });
    });

    await redisClient.connect();
    logger.info('Security Redis client connected');
  }
  return redisClient;
}

/**
 * Enhanced WebhookSecurity class for comprehensive webhook validation
 */
class WebhookSecurity {
  constructor(options = {}) {
    this.webhookSecret = options.webhookSecret || process.env.WEBHOOK_SECRET || 'webhook_secret_2024_change_in_prod';
    this.maxAge = options.maxAge || 300; // 5 minutes
    this.rateLimitWindow = options.rateLimitWindow || 60000; // 1 minute
    this.rateLimitMax = options.rateLimitMax || 100; // 100 requests per minute
    this.redisClient = null;
  }

  /**
   * Initialize Redis connection for rate limiting and nonce tracking
   */
  async initialize() {
    if (!this.redisClient) {
      this.redisClient = await initializeSecurityRedis();
    }
    return this.redisClient;
  }

  /**
   * Validate HMAC-SHA256 signature with timestamp and nonce
   */
  async validateSignature(payload, signature, timestamp, nonce, sourceIP) {
    try {
      // Ensure Redis is initialized
      await this.initialize();

      // Validate required parameters
      if (!signature) {
        logger.warn('Missing webhook signature', { sourceIP });
        return { valid: false, reason: 'missing_signature' };
      }

      if (!timestamp) {
        logger.warn('Missing webhook timestamp', { sourceIP });
        return { valid: false, reason: 'missing_timestamp' };
      }

      if (!nonce) {
        logger.warn('Missing webhook nonce', { sourceIP });
        return { valid: false, reason: 'missing_nonce' };
      }

      // Validate timestamp (reject if older than maxAge)
      const currentTime = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp);

      if (isNaN(webhookTime)) {
        logger.warn('Invalid webhook timestamp format', { sourceIP, timestamp });
        return { valid: false, reason: 'invalid_timestamp' };
      }

      if (Math.abs(currentTime - webhookTime) > this.maxAge) {
        logger.warn('Webhook timestamp expired', {
          sourceIP,
          currentTime,
          webhookTime,
          ageDiff: Math.abs(currentTime - webhookTime),
          maxAge: this.maxAge
        });
        return { valid: false, reason: 'timestamp_expired' };
      }

      // Check for replay attacks using nonce
      const nonceKey = `webhook_nonce:${nonce}:${timestamp}`;
      const nonceExists = await this.redisClient.exists(nonceKey);
      
      if (nonceExists) {
        logger.warn('Webhook replay attack detected', {
          sourceIP,
          nonce,
          timestamp
        });
        return { valid: false, reason: 'replay_attack' };
      }

      // Store nonce to prevent replay (expire after maxAge + buffer)
      await this.redisClient.setEx(nonceKey, this.maxAge + 60, '1');

      // Validate HMAC-SHA256 signature
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      // Create signature payload: timestamp + nonce + payload
      const signaturePayload = `${timestamp}.${nonce}.${payloadString}`;
      
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signaturePayload)
        .digest('hex');

      // Handle different signature formats (with or without 'sha256=' prefix)
      const cleanSignature = signature.startsWith('sha256=') ? signature.slice(7) : signature;

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        logger.warn('Invalid webhook HMAC signature', {
          sourceIP,
          timestamp,
          nonce,
          expectedLength: expectedSignature.length,
          receivedLength: cleanSignature.length
        });
        return { valid: false, reason: 'invalid_signature' };
      }

      logger.info('Webhook signature validation successful', {
        sourceIP,
        timestamp,
        nonce
      });

      return { valid: true, reason: 'valid' };

    } catch (error) {
      logger.error('Webhook signature validation error', { 
        error: error.message,
        sourceIP,
        stack: error.stack
      });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Rate limiting using Redis-based sliding window algorithm
   */
  async checkRateLimit(sourceIP) {
    try {
      await this.initialize();

      const key = `rate_limit:${sourceIP}`;
      const now = Date.now();
      const windowStart = now - this.rateLimitWindow;

      // Use Redis sorted set for sliding window
      const pipeline = this.redisClient.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zCard(key);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      
      // Set expiry on the key
      pipeline.expire(key, Math.ceil(this.rateLimitWindow / 1000));

      const results = await pipeline.exec();
      const currentCount = results[1][1]; // Get count result

      if (currentCount >= this.rateLimitMax) {
        logger.warn('Rate limit exceeded', {
          sourceIP,
          currentCount,
          maxRequests: this.rateLimitMax,
          windowMs: this.rateLimitWindow
        });
        return { 
          allowed: false, 
          count: currentCount, 
          resetTime: now + this.rateLimitWindow 
        };
      }

      return { 
        allowed: true, 
        count: currentCount + 1, 
        resetTime: now + this.rateLimitWindow 
      };

    } catch (error) {
      logger.error('Rate limit check error', { 
        error: error.message,
        sourceIP 
      });
      // On error, allow the request (fail open)
      return { allowed: true, count: 0, resetTime: Date.now() + this.rateLimitWindow };
    }
  }

  /**
   * Generate secure nonce for webhook signatures
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate timestamp for webhook signatures
   */
  generateTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Create HMAC-SHA256 signature for outgoing webhooks
   */
  createSignature(payload, timestamp, nonce) {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${nonce}.${payloadString}`;
    
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signaturePayload)
      .digest('hex');
  }
}

// Global webhook security instance
let webhookSecurity = null;

/**
 * Get or create webhook security instance
 */
function getWebhookSecurity() {
  if (!webhookSecurity) {
    webhookSecurity = new WebhookSecurity();
  }
  return webhookSecurity;
}

/**
 * Enhanced webhook signature validation with HMAC-SHA256, timestamp, and nonce
 * Backward compatible wrapper for the WebhookSecurity class
 */
async function validateWebhookSignature(payload, signature, timestamp, nonce, sourceIP) {
  const security = getWebhookSecurity();
  
  // Handle legacy calls without timestamp/nonce (fallback to basic validation)
  if (!timestamp && !nonce) {
    logger.warn('Legacy webhook signature validation - upgrade to enhanced security', { sourceIP });
    
    // Basic MD5 validation for backward compatibility
    const webhookSecret = process.env.WEBHOOK_SECRET || 'webhook_secret_2024_change_in_prod';
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHash('md5')
      .update(payloadString + webhookSecret)
      .digest('hex');
    
    const isValid = signature === expectedSignature;
    return { valid: isValid, reason: isValid ? 'valid_legacy' : 'invalid_legacy' };
  }
  
  return await security.validateSignature(payload, signature, timestamp, nonce, sourceIP);
}

/**
 * Generate secure random string
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for logging/storage
 */
function hashSensitiveData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Validate request rate limiting using WebhookSecurity
 */
async function validateRateLimit(sourceIP, maxRequests = 100, windowMs = 60000) {
  const security = getWebhookSecurity();
  security.rateLimitMax = maxRequests;
  security.rateLimitWindow = windowMs;
  
  const result = await security.checkRateLimit(sourceIP);
  return result.allowed;
}

/**
 * Check rate limit and return detailed information
 */
async function checkRateLimit(sourceIP) {
  const security = getWebhookSecurity();
  return await security.checkRateLimit(sourceIP);
}

module.exports = {
  WebhookSecurity,
  validateWebhookSignature,
  generateSecureToken,
  hashSensitiveData,
  validateRateLimit,
  checkRateLimit,
  getWebhookSecurity
};