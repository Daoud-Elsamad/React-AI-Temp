import { useState, useCallback } from 'react';

interface MessageActions {
  ratings: Record<string, 'up' | 'down' | null>;
  rateMessage: (messageId: string, rating: 'up' | 'down') => void;
  regenerateMessage: (messageId: string, onRegenerate: (messageId: string) => Promise<void>) => Promise<void>;
  isRegenerating: string | null;
}

export function useMessageActions(): MessageActions {
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down' | null>>({});
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const rateMessage = useCallback((messageId: string, rating: 'up' | 'down') => {
    setRatings(prev => ({
      ...prev,
      [messageId]: prev[messageId] === rating ? null : rating
    }));
  }, []);

  const regenerateMessage = useCallback(async (
    messageId: string, 
    onRegenerate: (messageId: string) => Promise<void>
  ) => {
    if (isRegenerating) return;
    
    try {
      setIsRegenerating(messageId);
      await onRegenerate(messageId);
    } catch (error) {
      console.error('Failed to regenerate message:', error);
    } finally {
      setIsRegenerating(null);
    }
  }, [isRegenerating]);

  return {
    ratings,
    rateMessage,
    regenerateMessage,
    isRegenerating
  };
} 