import { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, Clock, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryProps {
  onLoadSession: (session: ChatSession) => void;
  onNewChat: () => void;
  currentSessionId?: string;
}

export function ChatHistory({ onLoadSession, onNewChat, currentSessionId }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage
  const saveSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('ai-chat-history', JSON.stringify(newSessions));
  };

  // Generate title from first user message
  const generateTitle = (messages: ChatSession['messages']): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'Neuer Chat';

    const content = firstUserMessage.content.slice(0, 50);
    return content.length < firstUserMessage.content.length ? `${content}...` : content;
  };

  // Filter sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(query)) return true;

      // Search in messages
      return session.messages.some(msg =>
        msg.content.toLowerCase().includes(query)
      );
    });
  }, [sessions, searchQuery]);

  // Delete a session
  const deleteSession = (sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
  };

  // Format relative time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Gerade eben';
    if (diff < 3600000) return `vor ${Math.floor(diff / 60000)} Min.`;
    if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)} Std.`;
    return `vor ${Math.floor(diff / 86400000)} Tagen`;
  };

  // Get message count for session
  const getMessageCount = (session: ChatSession) => {
    return session.messages.filter(m => m.role !== 'system').length;
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chat-Verlauf</h2>
          <Button onClick={onNewChat} size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Neuer Chat
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Chats durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Keine Chats gefunden' : 'Noch keine Chats vorhanden'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  session.id === currentSessionId ? 'ring-2 ring-primary bg-accent/20' : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => onLoadSession(session)}
                    >
                      <h3 className="font-medium text-sm truncate mb-1">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.updatedAt)}
                        <span>•</span>
                        <span>{getMessageCount(session)} Nachrichten</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {session.messages.slice(0, 3).map((msg, idx) => (
                          <Badge
                            key={idx}
                            variant={msg.role === 'user' ? 'default' : 'secondary'}
                            className="text-xs px-1.5 py-0.5"
                          >
                            {msg.role === 'user' ? 'User' : 'AI'}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Dialog open={isDialogOpen && selectedSession?.id === session.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) setSelectedSession(session);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{selectedSession?.title}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4">
                              {selectedSession?.messages.map((msg) => (
                                <div key={msg.id} className="flex gap-3">
                                  <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                                    {msg.role === 'user' ? 'User' : 'AI'}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(msg.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
