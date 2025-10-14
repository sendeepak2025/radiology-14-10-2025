// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SECRET_PROVIDER = 'vault';
process.env.VAULT_URL = 'http://test-vault:8200';
process.env.VAULT_TOKEN = 'test-token';
process.env.ORTHANC_URL = 'http://test-orthanc:8042';
process.env.ORTHANC_USERNAME = 'test-user';
process.env.ORTHANC_PASSWORD = 'test-password';
process.env.BRIDGE_URL = 'http://test-bridge:3000';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.createMockSecrets = () => ({
  orthanc: {
    username: 'test-orthanc-user',
    password: 'test-orthanc-password',
    url: 'http://test-orthanc:8042'
  },
  webhook: {
    secret: 'test-webhook-secret'
  },
  database: {
    uri: 'mongodb://test-mongo:27017/test-dicom'
  },
  cloudinary: {
    cloudName: 'test-cloud',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret'
  }
});

// Mock timers for tests that need them
jest.useFakeTimers();

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});