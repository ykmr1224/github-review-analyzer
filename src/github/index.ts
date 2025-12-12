/**
 * GitHub API client implementation with rate limiting and pagination
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import { IGitHubClient, RateLimitInfo } from '../types/interfaces';
import { AuthConfig, RepositoryConfig } from '../config';
import { PullRequest, Comment, DateRange, User, Reaction } from '../types/core';

/**
 * GitHub API client with rate limiting, retry logic, and pagination
 */
export class GitHubClient implements IGitHubClient {
  private client: AxiosInstance;
  private authenticated = false;
  private rateLimitInfo: RateLimitInfo | null = null;
  private authConfig: AuthConfig | null = null;

  constructor() {
    this.setupSecureLogging();
    
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'github-pr-metrics/1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return response;
      },
      async (error) => {
        // Handle rate limiting with retry
        if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
          
          if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
            console.log(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await this.sleep(waitTime);
            return this.client.request(error.config);
          }
        }

        // Retry on network errors with exponential backoff
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          const retryCount = error.config.__retryCount || 0;
          if (retryCount < 3) {
            error.config.__retryCount = retryCount + 1;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            await this.sleep(delay);
            return this.client.request(error.config);
          }
        }

        // Sanitize error message before throwing
        if (error.message) {
          error.message = this.sanitizeErrorMessage(error.message);
        }

        throw error;
      }
    );
  }

  /**
   * Authenticate with GitHub using provided credentials
   */
  async authenticate(config: AuthConfig): Promise<void> {
    this.authConfig = config;

    try {
      if (config.type === 'token') {
        await this.authenticateWithToken(config);
      } else if (config.type === 'app') {
        await this.authenticateWithApp(config);
      } else {
        throw new Error('Unsupported authentication type');
      }

      this.authenticated = true;
    } catch (error: any) {
      this.authenticated = false;
      // Ensure no credentials are logged in error messages
      const sanitizedMessage = this.sanitizeErrorMessage(error.message);
      throw new Error(`Authentication failed: ${sanitizedMessage}`);
    }
  }

  /**
   * Authenticate using Personal Access Token
   */
  private async authenticateWithToken(config: AuthConfig): Promise<void> {
    if (!config.token) {
      throw new Error('GitHub token is required for token authentication');
    }

    // Set authorization header (never log the token)
    this.client.defaults.headers.common['Authorization'] = `token ${config.token}`;

    // Test authentication by getting user info
    const response = await this.client.get('/user');
    console.log(`Authenticated as: ${response.data.login} (token)`);
  }

  /**
   * Authenticate using GitHub App
   */
  private async authenticateWithApp(config: AuthConfig): Promise<void> {
    if (!config.app) {
      throw new Error('GitHub App configuration is required for app authentication');
    }

    const { appId, privateKey, installationId } = config.app;

    // Generate JWT for GitHub App
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued 60 seconds in the past to allow for clock drift
      exp: now + 600, // Expires in 10 minutes
      iss: appId
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Get installation access token
    const installationResponse = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'github-pr-metrics/1.0.0'
        }
      }
    );

    const installationToken = installationResponse.data.token;

    // Set authorization header with installation token
    this.client.defaults.headers.common['Authorization'] = `token ${installationToken}`;

    // Test authentication
    await this.client.get('/user');
    
  }

  /**
   * Get pull requests for a repository within a time period
   */
  async getPullRequests(repo: RepositoryConfig, period: DateRange): Promise<PullRequest[]> {
    if (!this.authenticated) {
      throw new Error('Client must be authenticated before making API calls');
    }

    const pullRequests: PullRequest[] = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API

    while (page <= 100) { // Limit to 100 pages to prevent infinite loops
      await this.checkRateLimit();

      const response = await this.client.get(`/repos/${repo.owner}/${repo.repo}/pulls`, {
        params: {
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page: page
        }
      });

      const prs = response.data;
      
      if (prs.length === 0) {
        break; // No more pages
      }

      // Filter PRs by time period and convert to our format
      for (const pr of prs) {
        const createdAt = new Date(pr.created_at);
        
        // If PR is older than our period, we can stop (since they're sorted by updated desc)
        if (createdAt < period.start) {
          return pullRequests;
        }

        // Include PR if it's within our time period
        if (createdAt >= period.start && createdAt <= period.end) {
          pullRequests.push(this.convertPullRequest(pr));
        }
      }

      page++;
    }

    return pullRequests;
  }

  /**
   * Get comments for a specific pull request
   */
  async getComments(repo: RepositoryConfig, prNumber: number): Promise<Comment[]> {
    if (!this.authenticated) {
      throw new Error('Client must be authenticated before making API calls');
    }

    const comments: Comment[] = [];
    
    // Get review comments (inline comments)
    const reviewComments = await this.getPaginatedData(
      `/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}/comments`
    );

    // Get issue comments (general PR comments)
    const issueComments = await this.getPaginatedData(
      `/repos/${repo.owner}/${repo.repo}/issues/${prNumber}/comments`
    );

    // Convert and combine all comments
    for (const comment of [...reviewComments, ...issueComments]) {
      const convertedComment = await this.convertComment(comment, repo);
      comments.push(convertedComment);
    }

    return comments;
  }

  /**
   * Get current rate limit information
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const response = await this.client.get('/rate_limit');
    const rateLimit = response.data.rate;
    
    return {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetTime: new Date(rateLimit.reset * 1000)
    };
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Generic method to handle paginated API responses
   */
  private async getPaginatedData(endpoint: string, params: any = {}): Promise<any[]> {
    const allData: any[] = [];
    let page = 1;
    const perPage = 100;

    while (page <= 100) { // Limit to 100 pages to prevent infinite loops
      await this.checkRateLimit();

      const response = await this.client.get(endpoint, {
        params: {
          ...params,
          per_page: perPage,
          page: page
        }
      });

      const data = response.data;
      
      if (data.length === 0) {
        break; // No more pages
      }

      allData.push(...data);
      page++;
    }

    return allData;
  }

  /**
   * Convert GitHub API pull request to our format
   */
  private convertPullRequest(pr: any): PullRequest {
    const pullRequest: PullRequest = {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      author: this.convertUser(pr.user),
      comments: [] // Comments will be loaded separately
    };

    // Only add mergedAt if it exists
    if (pr.merged_at) {
      pullRequest.mergedAt = new Date(pr.merged_at);
    }

    return pullRequest;
  }

  /**
   * Convert GitHub API comment to our format
   */
  private async convertComment(comment: any, repo: RepositoryConfig): Promise<Comment> {
    // Determine comment type and get reactions accordingly
    const isReviewComment = comment.pull_request_review_id !== undefined || comment.path !== undefined;
    const reactions = await this.getCommentReactions(comment.id, repo, isReviewComment);

    const convertedComment: Comment = {
      id: comment.id,
      body: comment.body,
      author: this.convertUser(comment.user),
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      position: comment.position,
      path: comment.path,
      isResolved: false, // Will be determined by data processor
      reactions: reactions,
      replies: [] // Will be populated by data processor
    };

    // Add reply relationship data if available (for review comments)
    if (comment.in_reply_to_id) {
      convertedComment.inReplyToId = comment.in_reply_to_id;
    }

    return convertedComment;
  }

  /**
   * Convert GitHub API user to our format
   */
  private convertUser(user: any): User {
    return {
      login: user.login,
      type: user.type === 'Bot' ? 'Bot' : 'User',
      id: user.id
    };
  }

  /**
   * Get reactions for a comment
   */
  private async getCommentReactions(commentId: number, repo: RepositoryConfig, isReviewComment: boolean = false): Promise<Reaction[]> {
    try {
      await this.checkRateLimit();
      
      // Use different endpoints for review comments vs issue comments
      const endpoint = isReviewComment 
        ? `/repos/${repo.owner}/${repo.repo}/pulls/comments/${commentId}/reactions`
        : `/repos/${repo.owner}/${repo.repo}/issues/comments/${commentId}/reactions`;
      
      const response = await this.client.get(endpoint, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return response.data.map((reaction: any) => ({
        type: this.mapReactionType(reaction.content),
        user: this.convertUser(reaction.user),
        createdAt: new Date(reaction.created_at)
      }));
    } catch (error) {
      // If reactions endpoint fails, return empty array
      
      return [];
    }
  }

  /**
   * Map GitHub reaction content to our reaction types
   */
  private mapReactionType(content: string): Reaction['type'] {
    const mapping: Record<string, Reaction['type']> = {
      '+1': 'thumbs_up',
      '-1': 'thumbs_down',
      'laugh': 'laugh',
      'hooray': 'hooray',
      'confused': 'confused',
      'heart': 'heart',
      'rocket': 'rocket',
      'eyes': 'eyes'
    };
    
    return mapping[content] || 'unknown';
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;
    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit']),
        remaining: parseInt(headers['x-ratelimit-remaining']),
        resetTime: new Date(parseInt(headers['x-ratelimit-reset']) * 1000)
      };
    }
  }

  /**
   * Check rate limit and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 10) {
      const waitTime = this.rateLimitInfo.resetTime.getTime() - Date.now() + 1000;
      if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
        
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize error messages to prevent credential leakage
   */
  private sanitizeErrorMessage(message: string): string {
    if (!this.authConfig) {
      return message;
    }

    let sanitized = message;

    // Remove any token values from error messages
    if (this.authConfig.type === 'token' && this.authConfig.token) {
      sanitized = sanitized.replace(new RegExp(this.authConfig.token, 'g'), '[REDACTED_TOKEN]');
    }

    // Remove any private key content from error messages
    if (this.authConfig.type === 'app' && this.authConfig.app?.privateKey) {
      // Remove the private key content but keep structure indicators
      sanitized = sanitized.replace(/-----BEGIN.*?-----[\s\S]*?-----END.*?-----/g, '[REDACTED_PRIVATE_KEY]');
    }

    // Remove any JWT tokens that might appear in error messages
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[REDACTED_JWT]');

    return sanitized;
  }

  /**
   * Override console methods to prevent credential logging
   */
  private setupSecureLogging(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? this.sanitizeErrorMessage(arg) : arg
      );
      originalLog.apply(console, sanitizedArgs);
    };

    console.error = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? this.sanitizeErrorMessage(arg) : arg
      );
      originalError.apply(console, sanitizedArgs);
    };

    console.warn = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? this.sanitizeErrorMessage(arg) : arg
      );
      originalWarn.apply(console, sanitizedArgs);
    };
  }
}