/**
 * Configuration validation tests
 */

import { ConfigurationManager, ConfigurationError } from '../../src/config';

// Mock dotenv to prevent loading .env file during tests
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('ConfigurationManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear relevant environment variables
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_REPOSITORY_OWNER;
    delete process.env.GITHUB_REPOSITORY_NAME;
    delete process.env.GITHUB_TOKEN;
    delete process.env.REVIEWER_USERNAME;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should parse repository from GITHUB_REPOSITORY environment variable', async () => {
      // Arrange
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.REVIEWER_USERNAME = 'test-reviewer';

      // Act
      const configManager = new ConfigurationManager();
      const config = await configManager.loadConfig();

      // Assert
      expect(config.repository.owner).toBe('owner');
      expect(config.repository.repo).toBe('repo');
      expect(config.auth.token).toBe('test-token');
      expect(config.analysis.reviewerUserName).toBe('test-reviewer');
    });

    it('should use separate GITHUB_REPOSITORY_OWNER and GITHUB_REPOSITORY_NAME if available', async () => {
      // Arrange
      process.env.GITHUB_REPOSITORY_OWNER = 'separate-owner';
      process.env.GITHUB_REPOSITORY_NAME = 'separate-repo';
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.REVIEWER_USERNAME = 'test-reviewer';

      // Act
      const configManager = new ConfigurationManager();
      const config = await configManager.loadConfig();

      // Assert
      expect(config.repository.owner).toBe('separate-owner');
      expect(config.repository.repo).toBe('separate-repo');
    });

    it('should throw ConfigurationError when repository information is missing', async () => {
      // Arrange
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.REVIEWER_USERNAME = 'test-reviewer';
      // No repository info

      // Act & Assert
      const configManager = new ConfigurationManager();
      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when GitHub token is missing', async () => {
      // Arrange
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.REVIEWER_USERNAME = 'test-reviewer';
      // No GitHub token

      // Act & Assert
      const configManager = new ConfigurationManager();
      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
    });

    it('should use default reviewer username when not provided', async () => {
      // Arrange
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_TOKEN = 'test-token';
      // No reviewer username - should use default

      // Act
      const configManager = new ConfigurationManager();
      const config = await configManager.loadConfig();

      // Assert
      expect(config.analysis.reviewerUserName).toBe('coderabbitai[bot]');
    });
  });
});