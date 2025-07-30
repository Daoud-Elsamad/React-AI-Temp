import {
  StreamEvent,
  StreamChunk,
  StreamResponse,
  StreamingOptions,
} from './types';
import { AIServiceError } from './errors';

export class StreamingService {
  private activeStreams = new Map<string, StreamResponse>();

  /**
   * Create a Server-Sent Event stream for real-time AI responses
   */
  async createSSEStream(
    url: string,
    options: StreamingOptions = {}
  ): Promise<StreamResponse> {
    const streamId = this.generateStreamId();
    const controller = new AbortController();

    try {
      // Create EventSource for SSE connection
      const eventSource = new EventSource(url);

      const streamResponse: StreamResponse = {
        id: streamId,
        stream: this.createReadableStream(eventSource, options, controller),
        controller,
        status: 'connecting',
      };

      this.activeStreams.set(streamId, streamResponse);

      // Handle connection events
      eventSource.onopen = () => {
        streamResponse.status = 'streaming';
        if (options.onStart) {
          options.onStart();
        }
      };

      eventSource.onerror = () => {
        streamResponse.status = 'error';
        const errorMsg = 'SSE connection error';
        if (options.onError) {
          options.onError(errorMsg);
        }
        this.cleanupStream(streamId);
      };

      return streamResponse;
    } catch (error) {
      this.cleanupStream(streamId);
      throw new AIServiceError(
        `Failed to create SSE stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_CREATE_ERROR'
      );
    }
  }

  /**
   * Create a streaming connection using fetch with ReadableStream
   */
  async createFetchStream(
    url: string,
    requestInit: RequestInit,
    options: StreamingOptions = {}
  ): Promise<StreamResponse> {
    const streamId = this.generateStreamId();
    const controller = new AbortController();

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        headers: {
          ...requestInit.headers,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new AIServiceError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status }
        );
      }

      if (!response.body) {
        throw new AIServiceError(
          'No response body received',
          'NO_RESPONSE_BODY'
        );
      }

      const streamResponse: StreamResponse = {
        id: streamId,
        stream: this.createReadableStreamFromResponse(
          response,
          options,
          controller
        ),
        controller,
        status: 'streaming',
      };

      this.activeStreams.set(streamId, streamResponse);

      if (options.onStart) {
        options.onStart();
      }

      return streamResponse;
    } catch (error) {
      this.cleanupStream(streamId);
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to create fetch stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_CREATE_ERROR'
      );
    }
  }

  /**
   * Cancel a specific stream
   */
  cancelStream(streamId: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.controller.abort();
      stream.status = 'cancelled';
      this.cleanupStream(streamId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active streams
   */
  cancelAllStreams(): void {
    for (const [, stream] of this.activeStreams) {
      stream.controller.abort();
      stream.status = 'cancelled';
    }
    this.activeStreams.clear();
  }

  /**
   * Get status of all active streams
   */
  getActiveStreams(): Map<string, StreamResponse> {
    return new Map(this.activeStreams);
  }

  /**
   * Check if there are any active streams
   */
  hasActiveStreams(): boolean {
    return this.activeStreams.size > 0;
  }

  /**
   * Create ReadableStream from EventSource
   */
  private createReadableStream(
    eventSource: EventSource,
    options: StreamingOptions,
    controller: AbortController
  ): ReadableStream<StreamEvent> {
    return new ReadableStream<StreamEvent>({
      start(streamController) {
        // Handle different SSE event types
        eventSource.addEventListener('chunk', event => {
          try {
            const data = JSON.parse(event.data) as StreamChunk;
            const streamEvent: StreamEvent = {
              type: 'chunk',
              data,
              id: event.lastEventId || undefined,
            };

            streamController.enqueue(streamEvent);

            if (options.onChunk) {
              options.onChunk(data);
            }
          } catch {
            const errorEvent: StreamEvent = {
              type: 'error',
              error: 'Failed to parse chunk data',
            };
            streamController.enqueue(errorEvent);
          }
        });

        eventSource.addEventListener('complete', () => {
          const completeEvent: StreamEvent = { type: 'complete' };
          streamController.enqueue(completeEvent);
          streamController.close();
          eventSource.close();

          if (options.onComplete) {
            options.onComplete();
          }
        });

        eventSource.addEventListener('error', () => {
          const errorEvent: StreamEvent = {
            type: 'error',
            error: 'SSE connection error',
          };
          streamController.enqueue(errorEvent);
          streamController.error(new Error('SSE connection error'));
          eventSource.close();

          if (options.onError) {
            options.onError('SSE connection error');
          }
        });

        // Handle abort signal
        controller.signal.addEventListener('abort', () => {
          streamController.close();
          eventSource.close();
        });
      },
    });
  }

  /**
   * Create ReadableStream from fetch Response
   */
  private createReadableStreamFromResponse(
    response: Response,
    options: StreamingOptions,
    controller: AbortController
  ): ReadableStream<StreamEvent> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream<StreamEvent>({
      async start(streamController) {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              const completeEvent: StreamEvent = { type: 'complete' };
              streamController.enqueue(completeEvent);

              if (options.onComplete) {
                options.onComplete();
              }
              break;
            }

            if (controller.signal.aborted) {
              break;
            }

            // Process the chunk
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  // Parse SSE format
                  if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6)) as StreamChunk;
                    const streamEvent: StreamEvent = {
                      type: 'chunk',
                      data,
                    };

                    streamController.enqueue(streamEvent);

                    if (options.onChunk) {
                      options.onChunk(data);
                    }
                  }
                } catch {
                  const errorEvent: StreamEvent = {
                    type: 'error',
                    error: 'Failed to parse streaming data',
                  };
                  streamController.enqueue(errorEvent);
                }
              }
            }
          }
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: 'error',
            error:
              error instanceof Error ? error.message : 'Stream reading error',
          };
          streamController.enqueue(errorEvent);
          streamController.error(error);

          if (options.onError) {
            options.onError(
              error instanceof Error ? error.message : 'Stream reading error'
            );
          }
        } finally {
          reader.releaseLock();
          streamController.close();
        }
      },

      cancel() {
        reader.cancel();
        controller.abort();
      },
    });
  }

  /**
   * Generate unique stream ID
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up stream resources
   */
  private cleanupStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      try {
        stream.controller.abort();
      } catch {
        // Ignore abort errors during cleanup
      }
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Parse Server-Sent Events data
   */
  static parseSSEData(raw: string): StreamEvent[] {
    const events: StreamEvent[] = [];
    const lines = raw.split('\n');
    let currentEvent: Partial<StreamEvent> = {};

    for (const line of lines) {
      if (line.trim() === '') {
        // Empty line indicates end of event
        if (currentEvent.type) {
          events.push(currentEvent as StreamEvent);
          currentEvent = {};
        }
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const field = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (field) {
        case 'event':
          currentEvent.type = value as StreamEvent['type'];
          break;
        case 'data':
          try {
            currentEvent.data = JSON.parse(value);
          } catch {
            currentEvent.error = value;
          }
          break;
        case 'id':
          currentEvent.id = value;
          break;
        case 'retry':
          currentEvent.retry = parseInt(value, 10);
          break;
      }
    }

    // Handle final event if no trailing newline
    if (currentEvent.type) {
      events.push(currentEvent as StreamEvent);
    }

    return events;
  }
}

// Singleton instance
export const streamingService = new StreamingService();
