import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatRole = 'system' | 'user' | 'assistant' | 'function';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  status?: 'pending' | 'streaming' | 'completed' | 'error';
  metadata?: Record<string, unknown>;
}

type ProcessStep = {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message: string;
  progress?: number;
  data?: unknown;
};

type UseStreamedChatOptions = {
  apiPath?: string;
  typewriterMsPerChar?: number; // ~2–5ms per char
  initialMessages?: ChatMessage[];
  onMessage?: (message: ChatMessage) => void;
  onStatusChange?: (isStreaming: boolean) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
};

export function useStreamedChat(options: UseStreamedChatOptions = {}) {
  const {
    apiPath = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-gateway`,
    initialMessages = [],
    onMessage,
    onStatusChange,
    onError,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [chunks, setChunks] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    initialMessages.map(msg => ({
      ...msg,
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: msg.timestamp || Date.now(),
      status: msg.status || 'completed',
    }))
  );
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const controllerRef = useRef<AbortController | null>(null);
  const bufferRef = useRef<string>('');
  const messageQueueRef = useRef<ChatMessage[]>([]);
  const processingQueueRef = useRef<boolean>(false);

  // Add a new message to the chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'> & Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: message.timestamp || Date.now(),
      status: message.status || 'completed',
    };
    
    setMessages(prev => [...prev, newMessage]);
    onMessage?.(newMessage);
    return newMessage;
  }, [onMessage]);

  // Add a new process step
  const addProcessStep = useCallback((step: Omit<ProcessStep, 'id' | 'status'> & Partial<ProcessStep>) => {
    const newStep: ProcessStep = {
      ...step,
      id: step.id || `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: step.status || 'pending',
    };
    
    setProcessSteps(prev => [...prev, newStep]);
    return newStep;
  }, []);

  // Update a process step
  const updateProcessStep = useCallback((id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps(prev => 
      prev.map(step => 
        step.id === id ? { ...step, ...updates } : step
      )
    );
  }, []);

  // Handle sending a new message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    addMessage({
      role: 'user',
      content,
      status: 'completed'
    });
    
    // Add assistant message placeholder
    const assistantMessage = addMessage({
      role: 'assistant',
      content: '',
      status: 'streaming'
    });
    
    setIsStreaming(true);
    onStatusChange?.(true);
    
    // Create new AbortController for this request
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    
    let retryCount = 0;
    
    const executeRequest = async (): Promise<void> => {
      try {
        const response = await fetch(apiPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content }],
            stream: true
          }),
          signal: controller.signal
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to process message');
        }
        
        if (!response.body) {
          throw new Error('No response body');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        
        while (!done && !controller.signal.aborted) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const chunk = decoder.decode(value, { stream: !streamDone });
            bufferRef.current += chunk;
            
            // Process complete messages from buffer
            const currentMessages = bufferRef.current.split('\n\n');
            bufferRef.current = currentMessages.pop() || '';
            
            for (const message of currentMessages) {
              if (message.startsWith('data: ')) {
                const data = message.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    setChunks(prev => prev + parsed.choices[0].delta.content);
                  }
                } catch (e) {
                  console.error('Error parsing message:', e);
                }
              }
            }
          }
        }
        
        if (!controller.signal.aborted) {
          // Update message with final content
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: chunks, status: 'completed' }
                : msg
            )
          );
          setChunks('');
        }
        
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return; // Request was aborted, do nothing
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return executeRequest();
        }
        
        // Update message with error status
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { 
                  ...msg, 
                  content: chunks || 'Error: Failed to process message',
                  status: 'error' 
                } 
              : msg
          )
        );
        
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (!controller.signal.aborted) {
          setIsStreaming(false);
          onStatusChange?.(false);
        }
      }
    };
    
    return executeRequest();
  }, [
    addMessage, 
    apiPath, 
    chunks, 
    maxRetries, 
    messages, 
    onError, 
    onStatusChange, 
    retryDelay
  ]);
  
  // Process the message queue
  const processMessageQueue = useCallback(async () => {
    if (processingQueueRef.current || messageQueueRef.current.length === 0) return;
    
    processingQueueRef.current = true;
    const message = messageQueueRef.current.shift();
    
    if (message) {
      try {
        await handleSendMessage(message.content);
      } catch (error) {
        console.error('Error processing message:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    processingQueueRef.current = false;
    
    // Process next message if available
    if (messageQueueRef.current.length > 0) {
      setTimeout(processMessageQueue, 100);
    }
  }, [handleSendMessage, onError]);

  // Queue a message for processing
  const sendMessage = useCallback((content: string) => {
    messageQueueRef.current.push({
      role: 'user', 
      content,
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    if (!processingQueueRef.current) {
      processMessageQueue();
    }
  }, [processMessageQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  // Stop the current streaming
  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
    onStatusChange?.(false);
    
    // Update any streaming messages to completed status
    setMessages(prev => 
      prev.map(msg => 
        msg.status === 'streaming' 
          ? { ...msg, status: 'completed' } 
          : msg
      )
    );
  }, [onStatusChange]);

  // Return the hook's API
  return {
    // State
    messages,
    chunks,
    isStreaming,
    error,
    processSteps,
    
    // Actions
    sendMessage,
    stop,
    addMessage,
    addProcessStep,
    updateProcessStep,
    
    // Status
    isLoading: isStreaming,
    hasError: !!error,
    clearError: () => setError(null),
  };
}

export default useStreamedChat;