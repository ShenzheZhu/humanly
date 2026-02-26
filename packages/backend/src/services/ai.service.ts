import { AIModel } from '../models/ai.model';
import { DocumentModel } from '../models/document.model';
import {
  AIChatSession,
  AIChatMessage,
  AIChatRequest,
  AIChatResponse,
  AIInteractionLog,
  AILogQueryFilters,
  AIQueryType,
  AISuggestion,
  AIContentModification,
} from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * AI Provider interface for different AI backends
 */
interface AIProvider {
  chat(messages: { role: string; content: string }[], options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<{
    content: string;
    tokensUsed?: { input: number; output: number };
  }>;

  streamChat(
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{
    content: string;
    tokensUsed?: { input: number; output: number };
  }>;
}

/**
 * OpenAI Provider implementation
 */
class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.aiApiKey || '';
    this.model = env.aiModel || 'gpt-4-turbo-preview';
    this.baseUrl = env.aiBaseUrl || 'https://api.openai.com/v1';
  }

  async chat(messages: { role: string; content: string }[], options?: {
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ content: string; tokensUsed?: { input: number; output: number } }> {
    if (!this.apiKey) {
      throw new AppError(500, 'AI service not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('OpenAI API error', { status: response.status, error });
      throw new AppError(500, 'AI service error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage ? {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens,
    } : undefined;

    return { content, tokensUsed };
  }

  async streamChat(
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; tokensUsed?: { input: number; output: number } }> {
    if (!this.apiKey) {
      throw new AppError(500, 'AI service not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('OpenAI API error', { status: response.status, error });
      throw new AppError(500, 'AI service error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AppError(500, 'Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Ignore parsing errors for partial chunks
          }
        }
      }
    }

    return { content: fullContent };
  }
}

/**
 * Mock provider for development/testing
 */
class MockAIProvider implements AIProvider {
  async chat(messages: { role: string; content: string }[]): Promise<{
    content: string;
    tokensUsed?: { input: number; output: number };
  }> {
    const lastMessage = messages[messages.length - 1];
    const mockResponse = this.generateMockResponse(lastMessage?.content || '');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      content: mockResponse,
      tokensUsed: { input: 100, output: 50 },
    };
  }

  async streamChat(
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void
  ): Promise<{ content: string; tokensUsed?: { input: number; output: number } }> {
    const lastMessage = messages[messages.length - 1];
    const mockResponse = this.generateMockResponse(lastMessage?.content || '');

    // Stream word by word
    const words = mockResponse.split(' ');
    let fullContent = '';

    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const chunk = (fullContent ? ' ' : '') + word;
      fullContent += chunk;
      onChunk(chunk);
    }

    return {
      content: fullContent,
      tokensUsed: { input: 100, output: words.length },
    };
  }

  private generateMockResponse(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('grammar') || lowerQuery.includes('check')) {
      return 'I\'ve reviewed your text and found a few suggestions:\n\n1. Consider using active voice in paragraph 2\n2. The comma after "However" should be added\n3. "Their" should be "there" in line 5\n\nWould you like me to apply these corrections?';
    }

    if (lowerQuery.includes('summarize') || lowerQuery.includes('summary')) {
      return 'Here\'s a summary of your document:\n\nThis document discusses the main points of your topic, covering key aspects and providing detailed analysis. The main themes include the introduction, methodology, and conclusions drawn from the research.';
    }

    if (lowerQuery.includes('rewrite') || lowerQuery.includes('improve')) {
      return 'I can help improve this text. Here\'s a suggested revision that maintains your meaning while enhancing clarity and flow:\n\n[The revised text would appear here based on your selection]\n\nShall I apply this change?';
    }

    return 'I\'m your AI writing assistant. I can help you with:\n\n- Grammar and spelling checks\n- Content summarization\n- Text rewriting and improvement\n- Answering questions about your document\n\nWhat would you like me to help you with?';
  }
}

/**
 * Get the appropriate AI provider based on configuration
 */
function getAIProvider(): AIProvider {
  const provider = env.aiProvider || 'mock';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

/**
 * Classify the query type based on content
 */
function classifyQueryType(query: string): AIQueryType {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('grammar') || lowerQuery.includes('proofread')) {
    return 'grammar_check';
  }
  if (lowerQuery.includes('spell') || lowerQuery.includes('typo')) {
    return 'spelling_check';
  }
  if (lowerQuery.includes('rewrite') || lowerQuery.includes('rephrase') || lowerQuery.includes('improve')) {
    return 'rewrite';
  }
  if (lowerQuery.includes('summarize') || lowerQuery.includes('summary') || lowerQuery.includes('tldr')) {
    return 'summarize';
  }
  if (lowerQuery.includes('expand') || lowerQuery.includes('elaborate') || lowerQuery.includes('more detail')) {
    return 'expand';
  }
  if (lowerQuery.includes('translate') || lowerQuery.includes('translation')) {
    return 'translate';
  }
  if (lowerQuery.includes('format') || lowerQuery.includes('heading') || lowerQuery.includes('list')) {
    return 'format';
  }
  if (lowerQuery.includes('reference') || lowerQuery.includes('cite') || lowerQuery.includes('source')) {
    return 'reference';
  }
  if (lowerQuery.includes('?') || lowerQuery.includes('what') || lowerQuery.includes('how') || lowerQuery.includes('why')) {
    return 'question';
  }

  return 'other';
}

/**
 * Question Category Types
 */
export type AIQuestionCategory = 'understanding' | 'generation' | 'other';

/**
 * Classify the question category based on content
 * - 'understanding': Questions about understanding/clarifying content (e.g., "What does this mean?", "Explain...")
 * - 'generation': Requests to create/modify content (e.g., "Write...", "Generate...", "Rewrite...")
 */
export function classifyQuestionCategory(query: string, queryType: AIQueryType): AIQuestionCategory {
  const lowerQuery = query.toLowerCase();

  // Generation indicators - requests to create or modify content
  const generationKeywords = [
    'write', 'generate', 'create', 'compose', 'draft', 'produce',
    'rewrite', 'rephrase', 'improve', 'fix', 'correct', 'edit',
    'expand', 'elaborate', 'extend', 'add', 'include',
    'summarize', 'shorten', 'condense', 'simplify',
    'translate', 'convert', 'format', 'restructure',
    'make it', 'change to', 'turn this', 'help me write',
    'can you write', 'please write', 'could you write',
  ];

  // Understanding indicators - questions about content
  const understandingKeywords = [
    'what does', 'what is', 'what are', 'what was', 'what were',
    'explain', 'clarify', 'describe', 'define', 'meaning of',
    'why does', 'why is', 'why are', 'why did',
    'how does', 'how is', 'how are', 'how did',
    'tell me about', 'help me understand', 'i don\'t understand',
    'what do you think', 'what\'s the', 'who is', 'who are',
    'when did', 'when was', 'where is', 'where are',
    'is this', 'are these', 'does this', 'do these',
    'can you explain', 'could you explain', 'please explain',
  ];

  // Query types that are typically generation
  const generationQueryTypes: AIQueryType[] = [
    'grammar_check', 'spelling_check', 'rewrite', 'summarize',
    'expand', 'translate', 'format',
  ];

  // Query types that are typically understanding
  const understandingQueryTypes: AIQueryType[] = [
    'question', 'reference',
  ];

  // Check explicit keywords first
  for (const keyword of generationKeywords) {
    if (lowerQuery.includes(keyword)) {
      return 'generation';
    }
  }

  for (const keyword of understandingKeywords) {
    if (lowerQuery.includes(keyword)) {
      return 'understanding';
    }
  }

  // Fall back to query type classification
  if (generationQueryTypes.includes(queryType)) {
    return 'generation';
  }

  if (understandingQueryTypes.includes(queryType)) {
    return 'understanding';
  }

  // If it's a question (contains '?'), lean towards understanding
  if (lowerQuery.includes('?')) {
    return 'understanding';
  }

  return 'other';
}

/**
 * Build system prompt for the AI assistant
 */
function buildSystemPrompt(context?: {
  fullContent?: string;
  selection?: { text: string; startOffset: number; endOffset: number };
  pdfContext?: string;
  selectedText?: string;
}): string {
  let prompt = `You are an AI writing assistant integrated into a document editor. Your role is to help users improve their writing through:

1. Grammar and spelling corrections
2. Content rewriting and improvement
3. Summarization
4. Text expansion
5. Answering questions about the document
6. Formatting suggestions

Guidelines:
- Be concise and helpful
- When suggesting changes, clearly explain what you're changing and why
- If asked to make corrections, list them clearly with line references when possible
- Maintain the user's voice and style when rewriting
- For formatting, use markdown syntax

`;

  if (context?.pdfContext) {
    prompt += `\nThe user has a PDF research paper open in their workspace. Here is the content from the PDF:\n\n---\n${context.pdfContext}\n---\n\nYou can reference this paper when answering the user's questions.\n\n`;
  }

  if (context?.fullContent) {
    prompt += `\nThe user is working on a document with the following content:\n\n---\n${context.fullContent.slice(0, 4000)}\n---\n`;
  }

  if (context?.selectedText) {
    prompt += `\nThe user has selected/quoted this text from the editor:\n\n---\n${context.selectedText}\n---\n`;
  }

  if (context?.selection?.text) {
    prompt += `\nThe user has selected the following text:\n\n---\n${context.selection.text}\n---\n`;
  }

  return prompt;
}

export class AIService {
  private static provider: AIProvider = getAIProvider();

  /**
   * Silent chat - get AI response without creating session/logs
   * Used for quick inline actions like grammar correction
   */
  static async silentChat(
    userId: string,
    request: AIChatRequest
  ): Promise<{ message: { id: string; role: string; content: string } }> {
    // Verify document ownership
    const isOwner = await DocumentModel.isOwner(request.documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found');
    }

    // Build simple messages without conversation history
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: 'You are a helpful writing assistant. Follow the user instructions precisely and only return the requested text without any explanation.' },
      { role: 'user', content: request.message },
    ];

    // Get AI response
    const response = await this.provider.chat(messages, {
      temperature: 0.3, // Lower temperature for more consistent results
    });

    logger.info('AI silent chat completed', {
      userId,
      documentId: request.documentId,
    });

    return {
      message: {
        id: `silent-${Date.now()}`,
        role: 'assistant',
        content: response.content,
      },
    };
  }

  /**
   * Process a chat message
   */
  static async chat(
    userId: string,
    request: AIChatRequest
  ): Promise<AIChatResponse> {
    const startTime = Date.now();

    // Verify document ownership
    const isOwner = await DocumentModel.isOwner(request.documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found');
    }

    // Get or create session
    const session = request.sessionId
      ? await AIModel.findSessionById(request.sessionId)
      : await AIModel.getOrCreateSession(request.documentId, userId);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    // Classify query type and category
    const queryType = classifyQueryType(request.message);
    const questionCategory = classifyQuestionCategory(request.message, queryType);

    // Create log entry
    const log = await AIModel.createLog({
      documentId: request.documentId,
      userId,
      sessionId: session.id,
      query: request.message,
      queryType,
      questionCategory,
      contextSnapshot: request.context,
    });

    try {
      // Add user message to session
      await AIModel.addMessage(session.id, 'user', request.message);

      // Build conversation history
      const messages: { role: string; content: string }[] = [
        { role: 'system', content: buildSystemPrompt(request.context) },
      ];

      // Add previous messages (last 10 for context)
      const recentMessages = session.messages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({ role: msg.role, content: msg.content });
      }

      // Add current message
      messages.push({ role: 'user', content: request.message });

      // Get AI response
      const response = await this.provider.chat(messages);

      const responseTimeMs = Date.now() - startTime;

      // Add assistant message to session
      const assistantMessage = await AIModel.addMessage(
        session.id,
        'assistant',
        response.content
      );

      // Update log with response
      await AIModel.updateLogWithResponse(log.id, {
        response: response.content,
        responseTimeMs,
        tokensUsed: response.tokensUsed,
        modelVersion: env.aiModel || 'mock',
        status: 'success',
      });

      logger.info('AI chat completed', {
        userId,
        documentId: request.documentId,
        sessionId: session.id,
        queryType,
        responseTimeMs,
      });

      return {
        sessionId: session.id,
        message: assistantMessage,
        logId: log.id,
      };
    } catch (error) {
      // Update log with error
      await AIModel.updateLogWithResponse(log.id, {
        response: '',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error('AI chat failed', {
        userId,
        documentId: request.documentId,
        error,
      });

      throw error;
    }
  }

  /**
   * Stream a chat response
   */
  static async streamChat(
    userId: string,
    request: AIChatRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: AIChatResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Verify document ownership
      const isOwner = await DocumentModel.isOwner(request.documentId, userId);
      if (!isOwner) {
        throw new AppError(404, 'Document not found');
      }

      // Get or create session
      const session = request.sessionId
        ? await AIModel.findSessionById(request.sessionId)
        : await AIModel.getOrCreateSession(request.documentId, userId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      // Classify query type and category
      const queryType = classifyQueryType(request.message);
      const questionCategory = classifyQuestionCategory(request.message, queryType);

      // Create log entry
      const log = await AIModel.createLog({
        documentId: request.documentId,
        userId,
        sessionId: session.id,
        query: request.message,
        queryType,
        questionCategory,
        contextSnapshot: request.context,
      });

      // Add user message to session
      await AIModel.addMessage(session.id, 'user', request.message);

      // Build conversation history
      const messages: { role: string; content: string }[] = [
        { role: 'system', content: buildSystemPrompt(request.context) },
      ];

      // Add previous messages (last 10 for context)
      const recentMessages = session.messages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({ role: msg.role, content: msg.content });
      }

      // Add current message
      messages.push({ role: 'user', content: request.message });

      // Stream AI response
      const response = await this.provider.streamChat(messages, onChunk);

      const responseTimeMs = Date.now() - startTime;

      // Add assistant message to session
      const assistantMessage = await AIModel.addMessage(
        session.id,
        'assistant',
        response.content
      );

      // Update log with response
      await AIModel.updateLogWithResponse(log.id, {
        response: response.content,
        responseTimeMs,
        tokensUsed: response.tokensUsed,
        modelVersion: env.aiModel || 'mock',
        status: 'success',
      });

      logger.info('AI stream chat completed', {
        userId,
        documentId: request.documentId,
        sessionId: session.id,
        queryType,
        responseTimeMs,
      });

      onComplete({
        sessionId: session.id,
        message: assistantMessage,
        logId: log.id,
      });
    } catch (error) {
      logger.error('AI stream chat failed', {
        userId,
        documentId: request.documentId,
        error,
      });

      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Apply a suggestion and log the modification
   */
  static async applySuggestion(
    userId: string,
    logId: string,
    suggestionId: string,
    modification: AIContentModification
  ): Promise<AIInteractionLog> {
    const log = await AIModel.findLogById(logId);
    if (!log) {
      throw new AppError(404, 'Log not found');
    }

    if (log.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    // Update log with modification
    const updatedLog = await AIModel.updateLogWithModifications(logId, [modification]);
    if (!updatedLog) {
      throw new AppError(500, 'Failed to update log');
    }

    logger.info('AI suggestion applied', {
      userId,
      logId,
      suggestionId,
    });

    return updatedLog;
  }

  /**
   * Get AI interaction logs for a document
   */
  static async getLogs(
    userId: string,
    documentId: string,
    filters: Omit<AILogQueryFilters, 'documentId' | 'userId'> = {}
  ): Promise<{ logs: AIInteractionLog[]; total: number }> {
    // Verify document ownership
    const isOwner = await DocumentModel.isOwner(documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found');
    }

    return AIModel.getLogsByDocument(documentId, userId, filters.limit, filters.offset);
  }

  /**
   * Get a specific log entry
   */
  static async getLog(userId: string, logId: string): Promise<AIInteractionLog> {
    const log = await AIModel.findLogById(logId);
    if (!log) {
      throw new AppError(404, 'Log not found');
    }

    if (log.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    return log;
  }

  /**
   * Get chat sessions for a document
   */
  static async getSessions(
    userId: string,
    documentId: string,
    limit = 10
  ): Promise<AIChatSession[]> {
    // Verify document ownership
    const isOwner = await DocumentModel.isOwner(documentId, userId);
    if (!isOwner) {
      throw new AppError(404, 'Document not found');
    }

    return AIModel.getSessionsByDocument(documentId, userId, limit);
  }

  /**
   * Get a specific session with messages
   */
  static async getSession(
    userId: string,
    sessionId: string
  ): Promise<AIChatSession> {
    const session = await AIModel.findSessionById(sessionId);
    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    return session;
  }

  /**
   * Close a session
   */
  static async closeSession(userId: string, sessionId: string): Promise<void> {
    const session = await AIModel.findSessionById(sessionId);
    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    await AIModel.closeSession(sessionId);

    logger.info('AI session closed', { userId, sessionId });
  }

  /**
   * Delete a session completely (including messages and logs)
   */
  static async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await AIModel.findSessionById(sessionId);
    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    await AIModel.deleteSession(sessionId);

    logger.info('AI session deleted', { userId, sessionId });
  }
}
