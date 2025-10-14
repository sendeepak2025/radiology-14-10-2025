# Secret Management Unit Tests

This directory contains comprehensive unit tests for the secret management functionality of the DICOM Bridge service.

## Test Coverage

### 1. Secret Manager Client Tests (`services/secret-manager.test.js`)
- **Vault Provider Tests**:
  - Secret retrieval with valid and invalid credentials
  - Secret caching and cache expiration
  - Secret storage and cache invalidation
  - Connection testing and error handling
  
- **AWS Secrets Manager Tests**:
  - JSON and string secret retrieval
  - Binary secret handling
  - Secret creation and updates
  - AWS-specific error handling

- **Error Handling and Fallback**:
  - Network timeout handling
  - Service unavailability scenarios
  - Unsupported provider errors

- **Cache Management**:
  - Cache clearing and statistics
  - Cache timeout behavior

### 2. Orthanc Configuration Generator Tests (`services/orthanc-config-generator.test.js`)
- **Configuration Generation**:
  - Template loading and population with secrets
  - Default template fallback
  - Configuration validation
  - Port range validation

- **Configuration Management**:
  - File writing with backup
  - Backup and restore procedures
  - Configuration update workflows

- **Service Restart Handling**:
  - Docker container restart
  - System service restart
  - Orthanc readiness checking
  - Restart failure handling

- **Credential Rotation**:
  - Complete rotation workflow
  - Backup restoration on failure
  - Template variable replacement

### 3. Secrets Route Tests (`routes/secrets.test.js`)
- **Rotation Webhook Handling**:
  - Valid webhook processing
  - HMAC signature validation
  - Missing field validation
  - Unknown action handling
  - Orthanc-specific rotation handling

- **Manual Secret Refresh**:
  - Successful refresh operations
  - Refresh failure handling

- **Status Endpoints**:
  - Secret manager status reporting
  - Error handling for status retrieval

- **Security Features**:
  - HMAC signature validation
  - Signature validation error handling
  - Environment variable updates

### 4. Integration Tests (`integration/secret-rotation.test.js`)
- **End-to-End Rotation Workflows**:
  - Complete Orthanc credential rotation
  - Non-Orthanc credential rotation
  - Rotation failure with fallback

- **Webhook Security**:
  - HMAC signature validation
  - Invalid signature rejection

- **Environment Management**:
  - Process environment updates from secrets
  - Secret refresh workflows

## Test Requirements Coverage

The tests cover all requirements specified in task 1.4:

### ✅ Test secret retrieval with valid and invalid credentials
- Vault and AWS provider credential validation
- Authentication failure handling
- Network timeout scenarios
- Service unavailability handling

### ✅ Test rotation webhook handling and service restart
- Webhook signature validation
- Rotation action processing (rotated, scheduled, failed)
- Orthanc service restart procedures
- Docker and system service restart handling
- Orthanc readiness verification
- Configuration update and backup procedures

### ✅ Test fallback behavior when secrets are unavailable
- Secret manager connection failures
- Partial secret retrieval failures
- Backup configuration restoration
- Fallback validation procedures
- Cache behavior during failures

## Running the Tests

```bash
# Run all secret management tests
npm test

# Run specific test suites
npm test -- --testPathPattern="secret-manager"
npm test -- --testPathPattern="orthanc-config"
npm test -- --testPathPattern="secrets"
npm test -- --testPathPattern="secret-rotation"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Configuration

- **Test Environment**: Node.js with Jest
- **Mocking**: Comprehensive mocking of external dependencies (axios, AWS SDK, file system)
- **Timeout Handling**: Appropriate timeouts for async operations
- **Environment Isolation**: Tests run in isolated environment with mock data

## Key Test Features

1. **Comprehensive Mocking**: All external dependencies are properly mocked
2. **Error Scenario Testing**: Extensive testing of failure conditions
3. **Security Testing**: HMAC signature validation and security controls
4. **Integration Testing**: End-to-end workflow validation
5. **Environment Safety**: Tests don't affect real systems or credentials
6. **Performance Testing**: Cache behavior and timeout handling

The test suite ensures that the secret management system is robust, secure, and handles all failure scenarios gracefully while maintaining the non-destructive guarantees of the bridge system.