/**
 * Metrics calculation engines for GitHub PR analysis
 * Implements Requirements 2.1, 2.2, 2.3, 2.7, 5.3
 */

import { IMetricsCalculator } from './types/interfaces';
import { PullRequest, Comment, MetricsSummary, DetailedMetrics, Reaction, PRDetails } from './types/core';

/**
 * Comment classification types
 */
export type CommentType = 'suggestion' | 'issue' | 'question' | 'praise' | 'unknown';

/**
 * Comment analytics utilities
 */
export class CommentAnalytics {
  /**
   * Simple comment classification based on keywords
   */
  static classifyComment(comment: Comment): CommentType {
    const body = comment.body.toLowerCase();
    
    // Check for suggestions
    if (body.includes('suggest') || body.includes('recommend') || body.includes('consider') || body.includes('should')) {
      return 'suggestion';
    }
    
    // Check for issues
    if (body.includes('issue') || body.includes('problem') || body.includes('error') || body.includes('bug') || body.includes('fix')) {
      return 'issue';
    }
    
    // Check for questions
    if (body.includes('?') || body.includes('why') || body.includes('how') || body.includes('what')) {
      return 'question';
    }
    
    // Check for praise
    if (body.includes('good') || body.includes('great') || body.includes('excellent') || body.includes('nice')) {
      return 'praise';
    }
    
    return 'unknown';
  }

  /**
   * Get classification statistics
   */
  static getClassificationStats(comments: Comment[]): Record<CommentType, number> {
    const stats: Record<CommentType, number> = {
      suggestion: 0,
      issue: 0,
      question: 0,
      praise: 0,
      unknown: 0,
    };
    
    for (const comment of comments) {
      const type = CommentAnalytics.classifyComment(comment);
      stats[type]++;
    }
    
    return stats;
  }

  /**
   * Calculate sentiment score for a comment
   */
  static calculateSentiment(comment: Comment): number {
    const body = comment.body.toLowerCase();
    let score = 0;

    // Positive indicators
    const positiveWords = ['good', 'great', 'excellent', 'nice', 'perfect', 'awesome', 'thanks', 'helpful'];
    for (const word of positiveWords) {
      if (body.includes(word)) score += 1;
    }

    // Negative indicators
    const negativeWords = ['bad', 'wrong', 'error', 'issue', 'problem', 'fix', 'broken', 'incorrect'];
    for (const word of negativeWords) {
      if (body.includes(word)) score -= 1;
    }

    return score;
  }

  /**
   * Get sentiment statistics
   */
  static getSentimentStats(comments: Comment[]): { positive: number; negative: number; neutral: number } {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const comment of comments) {
      const sentiment = CommentAnalytics.calculateSentiment(comment);
      if (sentiment > 0) positive++;
      else if (sentiment < 0) negative++;
      else neutral++;
    }

    return { positive, negative, neutral };
  }
}

/**
 * Core metrics calculator implementation
 * Handles counting, statistical calculations, and edge cases
 */
export class MetricsCalculator implements IMetricsCalculator {
  
  /**
   * Calculate summary metrics from PR and comment data
   * Implements Requirements 2.1, 2.2, 2.3, 2.7
   */
  calculateSummary(prs: PullRequest[], comments: Comment[]): MetricsSummary {
    // Handle empty datasets gracefully (Requirement 5.3)
    if (!prs || prs.length === 0) {
      return this.createEmptyMetricsSummary();
    }

    // Count total PRs (Requirement 2.1)
    const totalPRs = this.countPullRequests(prs);
    
    // Count total AI reviewer comments (Requirement 2.2)
    const totalComments = this.countComments(comments);
    
    // Calculate average comments per PR (Requirement 2.3)
    const averageCommentsPerPR = this.calculateAverageCommentsPerPR(totalComments, totalPRs);
    
    // Count positive and negative reactions (Requirements 2.4, 2.5)
    const { positiveReactions, negativeReactions } = this.countReactionsByType(comments);
    
    // Count comments with human replies (Requirement 2.6)
    const repliedComments = this.countRepliedComments(comments);
    
    // Count resolved comments (Requirement 2.7)
    const resolvedComments = this.countResolvedComments(comments);

    return {
      totalPRs,
      totalComments,
      averageCommentsPerPR,
      positiveReactions,
      negativeReactions,
      repliedComments,
      resolvedComments
    };
  }

  /**
   * Calculate detailed metrics breakdown
   */
  calculateDetailed(prs: PullRequest[], comments: Comment[], repository?: string): DetailedMetrics {
    return {
      prBreakdown: {
        byState: this.calculatePRsByState(prs),
        byAuthor: this.calculatePRsByAuthor(prs)
      },
      commentBreakdown: {
        byType: this.calculateCommentsByType(comments),
        byResolution: this.calculateCommentsByResolution(comments)
      },
      reactionBreakdown: {
        byType: this.calculateReactionsByType(comments),
        positiveVsNegative: this.calculatePositiveVsNegativeReactions(comments)
      },
      prDetails: this.calculatePRDetails(prs, repository || 'owner/repo')
    };
  }

  /**
   * Count total pull requests (Requirement 2.1)
   */
  private countPullRequests(prs: PullRequest[]): number {
    return prs ? prs.length : 0;
  }

  /**
   * Count total comments (Requirement 2.2)
   */
  private countComments(comments: Comment[]): number {
    return comments ? comments.length : 0;
  }

  /**
   * Calculate average comments per PR (Requirement 2.3)
   * Handles zero division edge case (Requirement 5.3)
   */
  private calculateAverageCommentsPerPR(totalComments: number, totalPRs: number): number {
    if (totalPRs === 0) {
      return 0; // Handle zero division gracefully
    }
    
    const average = totalComments / totalPRs;
    return this.roundToTwoDecimals(average);
  }

  /**
   * Count reactions by positive/negative classification
   * Implements Requirements 2.4, 2.5
   */
  private countReactionsByType(comments: Comment[]): { positiveReactions: number; negativeReactions: number } {
    if (!comments || comments.length === 0) {
      return { positiveReactions: 0, negativeReactions: 0 };
    }

    let positiveReactions = 0;
    let negativeReactions = 0;

    for (const comment of comments) {
      if (comment.reactions) {
        for (const reaction of comment.reactions) {
          if (this.isPositiveReaction(reaction.type)) {
            positiveReactions++;
          } else if (this.isNegativeReaction(reaction.type)) {
            negativeReactions++;
          }
        }
      }
    }

    return { positiveReactions, negativeReactions };
  }

  /**
   * Count comments that received human replies (Requirement 2.6)
   */
  private countRepliedComments(comments: Comment[]): number {
    if (!comments || comments.length === 0) {
      return 0;
    }

    return comments.filter(comment => 
      comment.replies && comment.replies.length > 0
    ).length;
  }

  /**
   * Count resolved comments (Requirement 2.7)
   */
  private countResolvedComments(comments: Comment[]): number {
    if (!comments || comments.length === 0) {
      return 0;
    }

    return comments.filter(comment => comment.isResolved).length;
  }

  /**
   * Calculate averages with edge case handling
   * Implements Requirement 5.3
   */
  calculateAverages(data: number[]): number {
    if (!data || data.length === 0) {
      return 0; // Handle empty array
    }

    const sum = data.reduce((acc, value) => acc + (isNaN(value) ? 0 : value), 0);
    const average = sum / data.length;
    
    return this.handleEdgeCases(average);
  }

  /**
   * Calculate percentages with zero division handling
   * Implements Requirement 5.3
   */
  calculatePercentages(numerator: number, denominator: number): number {
    if (denominator === 0) {
      return 0; // Handle zero division
    }

    if (numerator < 0 || denominator < 0) {
      return 0; // Handle negative values
    }

    const percentage = (numerator / denominator) * 100;
    return this.handleEdgeCases(percentage);
  }

  /**
   * Handle mathematical edge cases
   * Implements Requirement 5.3
   */
  handleEdgeCases(value: number): number {
    // Handle NaN
    if (isNaN(value)) {
      return 0;
    }

    // Handle Infinity
    if (!isFinite(value)) {
      return 0;
    }

    // Round to reasonable precision
    return this.roundToTwoDecimals(value);
  }

  /**
   * Helper method to round numbers to two decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Create empty metrics summary for edge cases
   */
  private createEmptyMetricsSummary(): MetricsSummary {
    return {
      totalPRs: 0,
      totalComments: 0,
      averageCommentsPerPR: 0,
      positiveReactions: 0,
      negativeReactions: 0,
      repliedComments: 0,
      resolvedComments: 0
    };
  }

  /**
   * Classify reaction as positive
   * Based on GitHub's standard positive reactions
   */
  private isPositiveReaction(type: Reaction['type']): boolean {
    const positiveTypes: Reaction['type'][] = ['thumbs_up', 'heart', 'hooray', 'rocket'];
    return positiveTypes.includes(type);
  }

  /**
   * Classify reaction as negative
   * Based on GitHub's standard negative reactions
   */
  private isNegativeReaction(type: Reaction['type']): boolean {
    const negativeTypes: Reaction['type'][] = ['thumbs_down', 'confused'];
    return negativeTypes.includes(type);
  }

  // Detailed metrics calculation methods

  private calculatePRsByState(prs: PullRequest[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const pr of prs) {
      breakdown[pr.state] = (breakdown[pr.state] || 0) + 1;
    }
    
    return breakdown;
  }

  private calculatePRsByAuthor(prs: PullRequest[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const pr of prs) {
      const author = pr.author.login;
      breakdown[author] = (breakdown[author] || 0) + 1;
    }
    
    return breakdown;
  }

  private calculateCommentsByType(comments: Comment[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      'with_reactions': 0,
      'with_replies': 0,
      'resolved': 0,
      'unresolved': 0
    };
    
    for (const comment of comments) {
      if (comment.reactions && comment.reactions.length > 0) {
        breakdown['with_reactions']++;
      }
      if (comment.replies && comment.replies.length > 0) {
        breakdown['with_replies']++;
      }
      if (comment.isResolved) {
        breakdown['resolved']++;
      } else {
        breakdown['unresolved']++;
      }
    }
    
    return breakdown;
  }

  private calculateCommentsByResolution(comments: Comment[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      'resolved': 0,
      'unresolved': 0
    };
    
    for (const comment of comments) {
      if (comment.isResolved) {
        breakdown['resolved']++;
      } else {
        breakdown['unresolved']++;
      }
    }
    
    return breakdown;
  }

  private calculateReactionsByType(comments: Comment[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const comment of comments) {
      if (comment.reactions) {
        for (const reaction of comment.reactions) {
          breakdown[reaction.type] = (breakdown[reaction.type] || 0) + 1;
        }
      }
    }
    
    return breakdown;
  }

  private calculatePositiveVsNegativeReactions(comments: Comment[]): { positive: number; negative: number } {
    const { positiveReactions, negativeReactions } = this.countReactionsByType(comments);
    return {
      positive: positiveReactions,
      negative: negativeReactions
    };
  }

  private calculatePRDetails(prs: PullRequest[], repository: string): PRDetails[] {
    return prs.map(pr => {
      // Get comments for this specific PR
      const prComments = pr.comments || [];
      
      // Count AI comments (assuming AI comments are those by the reviewer)
      const aiComments = prComments.length;
      
      // Count resolved AI comments
      const resolvedAiComments = prComments.filter(comment => comment.isResolved).length;
      
      // Count positive and negative reactions on AI comments
      let positiveReactions = 0;
      let negativeReactions = 0;
      
      for (const comment of prComments) {
        if (comment.reactions) {
          for (const reaction of comment.reactions) {
            if (this.isPositiveReaction(reaction.type)) {
              positiveReactions++;
            } else if (this.isNegativeReaction(reaction.type)) {
              negativeReactions++;
            }
          }
        }
      }
      
      // Generate GitHub URL for the PR
      const url = `https://github.com/${repository}/pull/${pr.number}`;
      
      return {
        number: pr.number,
        title: pr.title,
        url: url,
        totalComments: prComments.length,
        aiComments: aiComments,
        resolvedAiComments: resolvedAiComments,
        positiveReactions: positiveReactions,
        negativeReactions: negativeReactions
      };
    });
  }
}

/**
 * Factory function to create a metrics calculator
 */
export function createMetricsCalculator(): IMetricsCalculator {
  return new MetricsCalculator();
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { createMetricsCalculator } from './metrics';
 * 
 * const calculator = createMetricsCalculator();
 * const summary = calculator.calculateSummary(pullRequests, comments);
 * const detailed = calculator.calculateDetailed(pullRequests, comments);
 * ```
 */

export { MetricsCalculator as default };