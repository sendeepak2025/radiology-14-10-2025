/**
 * Audit Event Models
 * Defines the structure and validation for different types of audit events
 */

/**
 * Base audit event structure
 */
class BaseAuditEvent {
  constructor(eventType, correlationId, details = {}) {
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId;
    this.eventType = eventType;
    this.service = 'dicom-bridge';
    this.version = '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
    this.details = details;
  }

  /**
   * Validate required fields
   */
  validate() {
    const required = ['timestamp', 'correlationId', 'eventType', 'service'];
    const missing = required.filter(field => !this[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required audit event fields: ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    this.validate();
    return {
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      eventType: this.eventType,
      service: this.service,
      version: this.version,
      environment: this.environment,
      details: this.details
    };
  }
}

/**
 * DICOM Processing Audit Event
 */
class DicomProcessingAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, instanceData, processingDetails = {}) {
    super(`dicom.processing.${eventType}`, correlationId, {
      instanceId: instanceData.instanceId,
      studyInstanceUID: instanceData.studyInstanceUID,
      seriesInstanceUID: instanceData.seriesInstanceUID,
      sopInstanceUID: instanceData.sopInstanceUID,
      modality: instanceData.modality,
      aeTitle: instanceData.aeTitle,
      sourceIP: instanceData.sourceIP,
      processingStartTime: processingDetails.processingStartTime,
      processingEndTime: processingDetails.processingEndTime,
      processingDuration: processingDetails.processingDuration,
      success: processingDetails.success,
      errorMessage: processingDetails.errorMessage,
      bytesProcessed: processingDetails.bytesProcessed,
      frameCount: processingDetails.frameCount
    });
  }

  validate() {
    super.validate();
    
    const required = ['instanceId', 'studyInstanceUID', 'sopInstanceUID'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required DICOM processing fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Anonymization Audit Event
 */
class AnonymizationAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, anonymizationData, validationDetails = {}) {
    super(`anonymization.${eventType}`, correlationId, {
      studyInstanceUID: anonymizationData.studyInstanceUID,
      seriesInstanceUID: anonymizationData.seriesInstanceUID,
      sopInstanceUID: anonymizationData.sopInstanceUID,
      originalPatientID: '[REDACTED]', // Always redacted for security
      anonymizedPatientID: anonymizationData.anonymizedPatientID,
      policyVersion: anonymizationData.policyVersion,
      policyName: anonymizationData.policyName,
      tagsRemoved: anonymizationData.tagsRemoved || [],
      tagsPseudonymized: anonymizationData.tagsPseudonymized || [],
      tagsRetained: anonymizationData.tagsRetained || [],
      validationResult: validationDetails.validationResult,
      validationErrors: validationDetails.validationErrors || [],
      approvedBy: anonymizationData.approvedBy,
      approvalDate: anonymizationData.approvalDate
    });
  }

  validate() {
    super.validate();
    
    const required = ['studyInstanceUID', 'policyVersion', 'anonymizedPatientID'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required anonymization fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Webhook Security Audit Event
 */
class WebhookSecurityAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, webhookData, securityDetails = {}) {
    super(`webhook.security.${eventType}`, correlationId, {
      sourceIP: webhookData.sourceIP,
      userAgent: webhookData.userAgent,
      requestMethod: webhookData.requestMethod,
      requestPath: webhookData.requestPath,
      timestamp: webhookData.timestamp,
      nonce: webhookData.nonce,
      signatureProvided: !!webhookData.signature,
      signatureValid: securityDetails.signatureValid,
      timestampValid: securityDetails.timestampValid,
      nonceValid: securityDetails.nonceValid,
      rateLimitStatus: securityDetails.rateLimitStatus,
      requestCount: securityDetails.requestCount,
      windowStart: securityDetails.windowStart,
      maxRequests: securityDetails.maxRequests,
      blockReason: securityDetails.blockReason
    });
  }

  validate() {
    super.validate();
    
    const required = ['sourceIP', 'requestMethod', 'requestPath'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required webhook security fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * User Access Audit Event
 */
class UserAccessAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, userContext, accessDetails = {}) {
    super(`access.${eventType}`, correlationId, {
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role,
      sourceIP: userContext.sourceIP,
      userAgent: userContext.userAgent,
      sessionId: userContext.sessionId,
      resource: accessDetails.resource,
      action: accessDetails.action,
      method: accessDetails.method,
      path: accessDetails.path,
      success: accessDetails.success,
      statusCode: accessDetails.statusCode,
      errorMessage: accessDetails.errorMessage,
      duration: accessDetails.duration,
      dataAccessed: accessDetails.dataAccessed,
      permissions: accessDetails.permissions
    });
  }

  validate() {
    super.validate();
    
    const required = ['userId', 'sourceIP', 'action'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required user access fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * System Audit Event
 */
class SystemAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, systemData, operationDetails = {}) {
    super(`system.${eventType}`, correlationId, {
      component: systemData.component,
      operation: systemData.operation,
      result: systemData.result,
      duration: operationDetails.duration,
      resourceUsage: operationDetails.resourceUsage,
      configChanges: operationDetails.configChanges,
      affectedServices: operationDetails.affectedServices,
      rollbackAvailable: operationDetails.rollbackAvailable,
      healthStatus: operationDetails.healthStatus,
      errorCode: operationDetails.errorCode,
      errorMessage: operationDetails.errorMessage
    });
  }

  validate() {
    super.validate();
    
    const required = ['component', 'operation'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required system audit fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Compliance Audit Event
 */
class ComplianceAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, complianceData, auditDetails = {}) {
    super(`compliance.${eventType}`, correlationId, {
      regulatoryFramework: complianceData.regulatoryFramework, // HIPAA, GDPR, etc.
      requirement: complianceData.requirement,
      control: complianceData.control,
      status: complianceData.status, // compliant, non-compliant, pending
      evidence: complianceData.evidence,
      reviewer: complianceData.reviewer,
      reviewDate: complianceData.reviewDate,
      nextReviewDate: complianceData.nextReviewDate,
      findings: auditDetails.findings || [],
      recommendations: auditDetails.recommendations || [],
      riskLevel: auditDetails.riskLevel,
      remediationRequired: auditDetails.remediationRequired,
      remediationDeadline: auditDetails.remediationDeadline
    });
  }

  validate() {
    super.validate();
    
    const required = ['regulatoryFramework', 'requirement', 'status'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required compliance audit fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Data Retention Audit Event
 */
class DataRetentionAuditEvent extends BaseAuditEvent {
  constructor(eventType, correlationId, retentionData, policyDetails = {}) {
    super(`retention.${eventType}`, correlationId, {
      dataType: retentionData.dataType,
      retentionPeriod: retentionData.retentionPeriod,
      createdDate: retentionData.createdDate,
      expiryDate: retentionData.expiryDate,
      action: retentionData.action, // archive, delete, extend
      recordCount: retentionData.recordCount,
      dataSize: retentionData.dataSize,
      policyVersion: policyDetails.policyVersion,
      legalHold: policyDetails.legalHold,
      approvedBy: policyDetails.approvedBy,
      approvalDate: policyDetails.approvalDate
    });
  }

  validate() {
    super.validate();
    
    const required = ['dataType', 'retentionPeriod', 'action'];
    const missing = required.filter(field => !this.details[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required data retention fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Audit Event Factory
 */
class AuditEventFactory {
  static createDicomProcessingEvent(eventType, correlationId, instanceData, processingDetails) {
    return new DicomProcessingAuditEvent(eventType, correlationId, instanceData, processingDetails);
  }

  static createAnonymizationEvent(eventType, correlationId, anonymizationData, validationDetails) {
    return new AnonymizationAuditEvent(eventType, correlationId, anonymizationData, validationDetails);
  }

  static createWebhookSecurityEvent(eventType, correlationId, webhookData, securityDetails) {
    return new WebhookSecurityAuditEvent(eventType, correlationId, webhookData, securityDetails);
  }

  static createUserAccessEvent(eventType, correlationId, userContext, accessDetails) {
    return new UserAccessAuditEvent(eventType, correlationId, userContext, accessDetails);
  }

  static createSystemEvent(eventType, correlationId, systemData, operationDetails) {
    return new SystemAuditEvent(eventType, correlationId, systemData, operationDetails);
  }

  static createComplianceEvent(eventType, correlationId, complianceData, auditDetails) {
    return new ComplianceAuditEvent(eventType, correlationId, complianceData, auditDetails);
  }

  static createDataRetentionEvent(eventType, correlationId, retentionData, policyDetails) {
    return new DataRetentionAuditEvent(eventType, correlationId, retentionData, policyDetails);
  }
}

module.exports = {
  BaseAuditEvent,
  DicomProcessingAuditEvent,
  AnonymizationAuditEvent,
  WebhookSecurityAuditEvent,
  UserAccessAuditEvent,
  SystemAuditEvent,
  ComplianceAuditEvent,
  DataRetentionAuditEvent,
  AuditEventFactory
};