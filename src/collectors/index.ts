/**
 * Data collection services for GitHub PR metrics analysis
 */

import { IDataCollector, IGitHubClient } from '../types/interfaces';
import { PullRequest, Comment, Reaction } from '../types/core';
import { AnalysisConfig, RepositoryConfig } from '../config';

/**
 * Data collector implementation for GitHub PR metrics
 * Handles PR retrieval with time period filtering and reviewer comment collection
 */
export class DataCollector implements IDataCollector {
  constructor(protected githubClient: IGitHubClient) {}

  /**
   * Collect pull requests for the specified configuration
   * Implements time period filtering as per Requirements 1.1
   */
  async collectPullRequests(config: AnalysisConfig, repoConfig: RepositoryConfig): Promise<PullRequest[]> {
    if (!this.githubClient.isAuthenticated()) {
      throw new Error('GitHub client must be authenticated before collecting data');
    }

    // Get pull requests from GitHub API with time period filtering
    const pullRequests = await this.githubClient.getPullRequests(repoConfig, config.timePeriod);

    // Additional filtering to ensure strict time period compliance
    const filteredPRs = pullRequests.filter(pr => {
      return pr.createdAt >= config.timePeriod.start && pr.createdAt <= config.timePeriod.end;
    });

    return filteredPRs;
  }

  /**
   * Collect comments from pull requests for specified reviewer
   * Implements reviewer filtering as per Requirements 1.2
   */
  async collectComments(prs: PullRequest[], reviewerUserName: string, repoConfig: RepositoryConfig): Promise<Comment[]> {
    if (!this.githubClient.isAuthenticated()) {
      throw new Error('GitHub client must be authenticated before collecting data');
    }

    const allComments: Comment[] = [];

    for (const pr of prs) {
      try {
        // Get all comments for this PR
        const prComments = await this.githubClient.getComments(repoConfig, pr.number);
        
        // Parse and validate comment metadata
        const parsedComments = prComments.map(comment => this.parseCommentMetadata(comment));
        
        // Filter comments by reviewer username (case-insensitive)
        const reviewerComments = parsedComments.filter(comment => 
          comment.author.login.toLowerCase() === reviewerUserName.toLowerCase()
        );

        // Enhance metadata for reviewer comments
        const enhancedComments = await this.enhanceCommentMetadata(reviewerComments);

        // Add PR reference to comments and collect them
        enhancedComments.forEach(comment => {
          allComments.push(comment);
        });

        // Update the PR with its enhanced comments
        pr.comments = enhancedComments;

      } catch (error) {
        // Log error but continue processing other PRs
        
      }
    }

    return allComments;
  }



  /**
   * Enhance comment metadata including resolution status, reactions, and replies
   * Implements Requirements 1.3, 1.4, 5.2
   */
  async enhanceCommentMetadata(comments: Comment[]): Promise<Comment[]> {
    // Build reply relationships efficiently using hash map
    const replyMap = this.buildReplyMap(comments);
    
    const enhancedComments: Comment[] = [];

    for (const comment of comments) {
      try {
        // Create enhanced comment with metadata
        const enhancedComment: Comment = {
          ...comment,
          isResolved: this.detectResolutionStatus(comment),
          reactions: await this.enhanceReactionData(comment.reactions),
          replies: replyMap.get(comment.id) || []
        };

        enhancedComments.push(enhancedComment);
      } catch (error) {
        
        // Include original comment even if metadata enhancement fails
        enhancedComments.push(comment);
      }
    }

    return enhancedComments;
  }

  /**
   * Detect comment resolution status based on GitHub's resolution indicators
   * Implements Requirements 1.3
   */
  private detectResolutionStatus(comment: Comment): boolean {
    // Check for resolution indicators in comment body
    const resolutionKeywords = [
      'resolved',
      'fixed',
      'done',
      'completed',
      'addressed'
    ];

    const bodyLower = comment.body.toLowerCase();
    
    // Check for explicit resolution markers
    if (bodyLower.includes('[resolved]') || bodyLower.includes('✅')) {
      return true;
    }

    // Check for resolution keywords in subsequent edits (indicated by updatedAt > createdAt)
    if (comment.updatedAt > comment.createdAt) {
      return resolutionKeywords.some(keyword => bodyLower.includes(keyword));
    }

    // Check for positive reactions as resolution indicator
    const positiveReactions = comment.reactions.filter(reaction => 
      ['thumbs_up', 'heart', 'hooray', 'rocket'].includes(reaction.type)
    );

    // Consider resolved if it has multiple positive reactions
    return positiveReactions.length >= 2;
  }

  /**
   * Enhance reaction data with additional metadata
   * Implements Requirements 1.4
   */
  private async enhanceReactionData(reactions: Reaction[]): Promise<Reaction[]> {
    return reactions.map(reaction => ({
      ...reaction,
      // Ensure all reaction data is properly typed and validated
      type: this.validateReactionType(reaction.type),
      user: {
        ...reaction.user,
        // Ensure user type is properly set
        type: reaction.user.type || (reaction.user.login.includes('bot') ? 'Bot' : 'User')
      },
      createdAt: new Date(reaction.createdAt) // Ensure proper Date object
    }));
  }

  /**
   * Validate and normalize reaction types
   */
  private validateReactionType(type: string): Reaction['type'] {
    const validTypes: Reaction['type'][] = [
      'thumbs_up', 'thumbs_down', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes'
    ];
    
    if (validTypes.includes(type as Reaction['type'])) {
      return type as Reaction['type'];
    }
    
    // Mark invalid types as 'unknown' to avoid polluting metrics data
    return 'unknown';
  }

  /**
   * Build reply relationships efficiently using hash map
   * Implements Requirements 1.4, 5.2
   * 
   * Performance: O(n) complexity instead of O(n²) by building relationships once
   * instead of searching for each comment individually.
   * 
   * Note: GitHub provides inReplyToId for review comments (inline code comments).
   * Issue comments (general PR comments) don't have explicit reply relationships in the API.
   */
  private buildReplyMap(comments: Comment[]): Map<number, Comment[]> {
    const replyMap = new Map<number, Comment[]>();

    // Group replies by their parent comment ID
    for (const comment of comments) {
      if (comment.inReplyToId) {
        const parentId = comment.inReplyToId;
        
        if (!replyMap.has(parentId)) {
          replyMap.set(parentId, []);
        }
        
        replyMap.get(parentId)!.push(comment);
      }
    }

    // Sort replies by creation date for each parent comment
    for (const replies of replyMap.values()) {
      replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return replyMap;
  }



  /**
   * Parse comment timestamps and user data with validation
   * Implements Requirements 5.2
   */
  parseCommentMetadata(comment: Comment): Comment {
    const parsed: Comment = {
      ...comment,
      // Ensure dates are proper Date objects
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      
      // Validate and enhance user data
      author: {
        ...comment.author,
        login: comment.author.login.trim(),
        type: comment.author.type || (comment.author.login.includes('bot') ? 'Bot' : 'User'),
        id: Number(comment.author.id)
      },

      // Ensure arrays are initialized
      reactions: comment.reactions || [],
      replies: comment.replies || []
    };

    // Handle optional position and path properties
    if (comment.position !== undefined) {
      parsed.position = Number(comment.position);
    }
    
    if (comment.path !== undefined) {
      parsed.path = comment.path.trim();
    }

    // Handle optional reply relationship
    if (comment.inReplyToId !== undefined) {
      parsed.inReplyToId = Number(comment.inReplyToId);
    }

    return parsed;
  }


}



/**
 * Factory function to create a data collector
 * This is the recommended way to create collectors in production code
 */
export function createDataCollector(githubClient: IGitHubClient): IDataCollector {
  return new DataCollector(githubClient);
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { createDataCollector } from './collectors';
 * import { GitHubClient } from './github';
 * import { ConfigurationManager } from './config';
 * 
 * // Setup
 * const configManager = new ConfigurationManager();
 * const config = await configManager.loadConfig();
 * const githubClient = new GitHubClient();
 * await githubClient.authenticate(config.auth);
 * 
 * // Create collector
 * const collector = createDataCollector(githubClient);
 * 
 * // Use collector - pass repository config as needed
 * const prs = await collector.collectPullRequests(config.analysis, config.repository);
 * const comments = await collector.collectComments(prs, config.analysis.reviewerUserName, config.repository);
 * // Reactions are automatically collected with comments - no separate method needed
 * ```
 */

export { DataCollector as default };