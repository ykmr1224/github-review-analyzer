/**
 * Data storage and persistence utilities for GitHub PR metrics
 * Handles reading and writing collected data to/from JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { PullRequest, Comment, DateRange } from '../types/core';

/**
 * Structure for collected data storage
 */
export interface CollectedData {
  metadata: {
    repository: string;
    reviewer: string;
    period: {
      start: string;
      end: string;
    };
    collectedAt: string;
    totalPRs: number;
    totalComments: number;
  };
  pullRequests: PullRequest[];
  comments: Comment[];
}

/**
 * Data storage manager for handling persistence operations
 */
export class DataStorage {
  
  /**
   * Save collected data to JSON file
   */
  static async saveCollectedData(
    filePath: string,
    prs: PullRequest[],
    comments: Comment[],
    metadata: {
      repository: string;
      reviewer: string;
      period: DateRange;
    }
  ): Promise<void> {
    const collectedData: CollectedData = {
      metadata: {
        repository: metadata.repository,
        reviewer: metadata.reviewer,
        period: {
          start: metadata.period.start.toISOString(),
          end: metadata.period.end.toISOString()
        },
        collectedAt: new Date().toISOString(),
        totalPRs: prs.length,
        totalComments: comments.length
      },
      pullRequests: prs,
      comments: comments
    };

    // Create directory if it doesn't exist
    const outputDir = path.dirname(filePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write data to file with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(collectedData, null, 2));
  }

  /**
   * Load collected data from JSON file
   */
  static async loadCollectedData(filePath: string): Promise<{
    prs: PullRequest[];
    comments: Comment[];
    metadata: CollectedData['metadata'];
  }> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file not found: ${filePath}`);
    }
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data: CollectedData = JSON.parse(rawData);
    
    // Convert date strings back to Date objects for PRs
    const prs = data.pullRequests.map((pr: any) => ({
      ...pr,
      createdAt: new Date(pr.createdAt),
      updatedAt: new Date(pr.updatedAt),
      mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : undefined
    }));
    
    // Convert date strings back to Date objects for comments
    const comments = data.comments.map((comment: any) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      reactions: comment.reactions.map((reaction: any) => ({
        ...reaction,
        createdAt: new Date(reaction.createdAt)
      })),
      replies: comment.replies.map((reply: any) => ({
        ...reply,
        createdAt: new Date(reply.createdAt),
        updatedAt: new Date(reply.updatedAt)
      }))
    }));

    return {
      prs,
      comments,
      metadata: data.metadata
    };
  }

  /**
   * Check if a data file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }



  /**
   * Validate data file structure
   */
  static validateDataFile(filePath: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      if (!fs.existsSync(filePath)) {
        errors.push('File does not exist');
        return { isValid: false, errors };
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);

      // Check required top-level properties
      if (!data.metadata) {
        errors.push('Missing metadata section');
      }
      if (!data.pullRequests) {
        errors.push('Missing pullRequests section');
      }
      if (!data.comments) {
        errors.push('Missing comments section');
      }

      // Check metadata structure
      if (data.metadata) {
        const requiredMetadataFields = ['repository', 'reviewer', 'period', 'collectedAt', 'totalPRs', 'totalComments'];
        for (const field of requiredMetadataFields) {
          if (!(field in data.metadata)) {
            errors.push(`Missing metadata field: ${field}`);
          }
        }
      }

      // Check arrays are actually arrays
      if (data.pullRequests && !Array.isArray(data.pullRequests)) {
        errors.push('pullRequests must be an array');
      }
      if (data.comments && !Array.isArray(data.comments)) {
        errors.push('comments must be an array');
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        errors.push('Invalid JSON format');
      } else {
        errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }


}

/**
 * Factory function to create data storage utilities
 */
export function createDataStorage(): typeof DataStorage {
  return DataStorage;
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { DataStorage } from './storage';
 * 
 * // Save data
 * await DataStorage.saveCollectedData(
 *   './temp/pr-data.json',
 *   pullRequests,
 *   comments,
 *   { repository: 'owner/repo', reviewer: 'bot', period: { start, end } }
 * );
 * 
 * // Load data
 * const { prs, comments, metadata } = await DataStorage.loadCollectedData('./temp/pr-data.json');
 * 
 * // Validate file
 * const { isValid, errors } = DataStorage.validateDataFile('./temp/pr-data.json');
 * 
 * // Check if file exists
 * if (DataStorage.fileExists('./temp/pr-data.json')) {
 *   // Process file
 * }
 * ```
 */

export default DataStorage;