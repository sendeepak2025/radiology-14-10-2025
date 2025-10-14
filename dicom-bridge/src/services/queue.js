const Bull = require('bull');
const Redis = require('redis');
const logger = require('../utils/logger');
const { processInstance } = require('./dicom-processor');

let instanceQueue;
let redisClient;

/**
 * Initialize job queue and Redis connection
 */
async function initializeQueue() {
  try {
    // Initialize Redis client
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();

    // Initialize Bull queue
    instanceQueue = new Bull('dicom-instance-processing', {
      redis: {
        port: 6379,
        host: process.env.REDIS_HOST || 'redis'
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    // Process jobs
    instanceQueue.process('process-instance', 5, async (job) => {
      return await processInstance(job.data);
    });

    // Job event handlers
    instanceQueue.on('completed', (job, result) => {
      logger.info('Job completed', {
        jobId: job.id,
        instanceId: job.data.instanceId,
        processingTime: Date.now() - job.timestamp,
        result
      });
    });

    instanceQueue.on('failed', (job, err) => {
      logger.error('Job failed', {
        jobId: job.id,
        instanceId: job.data.instanceId,
        error: err.message,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts
      });
    });

    instanceQueue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        instanceId: job.data.instanceId
      });
    });

    logger.info('Job queue initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize queue', { error: error.message });
    throw error;
  }
}

/**
 * Enqueue instance processing job
 */
async function enqueueInstanceProcessing(jobData) {
  try {
    // Check for duplicate jobs using SOPInstanceUID as unique key
    const existingJobs = await instanceQueue.getJobs(['waiting', 'active', 'delayed']);
    const duplicate = existingJobs.find(job => 
      job.data.sopInstanceUID === jobData.sopInstanceUID
    );

    if (duplicate) {
      logger.info('Duplicate job detected, skipping', {
        sopInstanceUID: jobData.sopInstanceUID,
        existingJobId: duplicate.id,
        newRequestId: jobData.requestId
      });
      return duplicate;
    }

    // Enqueue new job
    const job = await instanceQueue.add('process-instance', jobData, {
      priority: getPriority(jobData.modality),
      delay: 0, // Process immediately
      jobId: `${jobData.sopInstanceUID}-${Date.now()}` // Unique job ID
    });

    logger.info('Instance processing job enqueued', {
      jobId: job.id,
      instanceId: jobData.instanceId,
      sopInstanceUID: jobData.sopInstanceUID,
      priority: getPriority(jobData.modality)
    });

    return job;

  } catch (error) {
    logger.error('Failed to enqueue instance processing', {
      error: error.message,
      jobData
    });
    throw error;
  }
}

/**
 * Get processing priority based on modality
 */
function getPriority(modality) {
  const priorities = {
    'XA': 1,  // Angiography - highest priority
    'CT': 2,  // CT scans
    'MR': 3,  // MRI
    'US': 4,  // Ultrasound
    'CR': 5,  // Computed Radiography
    'DX': 5,  // Digital Radiography
    'OT': 10  // Other - lowest priority
  };
  
  return priorities[modality] || 10;
}

/**
 * Get queue health information
 */
async function getQueueHealth() {
  try {
    if (!instanceQueue) {
      throw new Error('Queue not initialized');
    }

    const waiting = await instanceQueue.getWaiting();
    const active = await instanceQueue.getActive();
    const completed = await instanceQueue.getCompleted();
    const failed = await instanceQueue.getFailed();

    return {
      status: 'healthy',
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      redis: {
        status: redisClient?.isReady ? 'connected' : 'disconnected'
      }
    };

  } catch (error) {
    throw new Error(`Queue health check failed: ${error.message}`);
  }
}

/**
 * Graceful shutdown
 */
async function closeQueue() {
  try {
    if (instanceQueue) {
      await instanceQueue.close();
      logger.info('Queue closed');
    }
    
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client closed');
    }
  } catch (error) {
    logger.error('Error closing queue', { error: error.message });
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', closeQueue);
process.on('SIGINT', closeQueue);

module.exports = {
  initializeQueue,
  enqueueInstanceProcessing,
  getQueueHealth,
  closeQueue
};