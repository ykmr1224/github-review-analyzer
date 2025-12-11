// Jest setup file for global test configuration
import 'dotenv/config';

// Configure fast-check for property-based testing
import * as fc from 'fast-check';

// Set default number of runs for property-based tests to 100+ as specified in design
fc.configureGlobal({
  numRuns: 100,
  verbose: false,
  seed: 42, // For reproducible tests
});

// Global test timeout
jest.setTimeout(30000);