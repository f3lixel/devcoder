import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2, Play, Pause } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProgressType = 'linear' | 'circular' | 'steps' | 'status';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  description?: string;
  progress?: number; // 0-100
  estimatedTime?: number; // in seconds
}

export interface ProgressData {
  type: ProgressType;
  title?: string;
  description?: string;
  progress?: number; // 0-100 for linear/circular
  steps?: ProgressStep[];
  status?: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  startTime?: number;
  estimatedTotalTime?: number;
  currentStep?: string;
}

interface ProgressVisualizationProps {
  data: ProgressData;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ProgressVisualization({
  data,
  className,
  showDetails = true,
  compact = false
}: ProgressVisualizationProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time for elapsed time calculations
  useEffect(() => {
    if (data.status === 'running') {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [data.status]);

  const getElapsedTime = () => {
    if (!data.startTime) return 0;
    return Math.floor((currentTime - data.startTime) / 1000);
  };

  const getEstimatedTimeRemaining = () => {
    if (!data.estimatedTotalTime || !data.startTime) return null;
    const elapsed = getElapsedTime();
    const remaining = Math.max(0, data.estimatedTotalTime - elapsed);
    return remaining;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'running': return 'text-blue-500';
      case 'paused': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {getStatusIcon(data.status || 'idle')}
        <span className="text-sm font-medium">{data.title || 'Progress'}</span>
        {data.progress !== undefined && (
          <span className="text-xs text-muted-foreground">
            {Math.round(data.progress)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(data.status || 'idle')}
            <div>
              <h3 className="font-semibold text-sm">
                {data.title || 'AI Processing'}
              </h3>
              {data.description && (
                <p className="text-xs text-muted-foreground">{data.description}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(data.status || 'idle')}>
            {data.status || 'idle'}
          </Badge>
        </div>

        {/* Linear Progress */}
        {data.type === 'linear' && data.progress !== undefined && (
          <div className="space-y-2">
            <Progress value={data.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(data.progress)}% complete</span>
              {getEstimatedTimeRemaining() && (
                <span>~{formatTime(getEstimatedTimeRemaining()!)} remaining</span>
              )}
            </div>
          </div>
        )}

        {/* Circular Progress */}
        {data.type === 'circular' && data.progress !== undefined && (
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-muted">
                <div
                  className="w-16 h-16 rounded-full border-4 border-primary transition-all duration-300"
                  style={{
                    background: `conic-gradient(from 0deg, hsl(var(--primary)) ${data.progress * 3.6}deg, transparent ${data.progress * 3.6}deg)`
                  }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {Math.round(data.progress)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Steps Progress */}
        {data.type === 'steps' && data.steps && (
          <div className="space-y-3">
            {data.steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : step.status === 'running' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : step.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : step.status === 'paused' ? (
                    <Pause className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{step.label}</p>
                    {step.progress !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(step.progress)}%
                      </span>
                    )}
                  </div>
                  {showDetails && step.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                  {step.progress !== undefined && step.progress > 0 && step.progress < 100 && (
                    <Progress value={step.progress} className="h-1 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Progress */}
        {data.type === 'status' && (
          <div className="flex items-center justify-between text-sm">
            <span>Current: {data.currentStep || 'Initializing...'}</span>
            <div className="flex items-center gap-2">
              {data.startTime && (
                <span className="text-xs text-muted-foreground">
                  {formatTime(getElapsedTime())}
                </span>
              )}
              {getEstimatedTimeRemaining() && (
                <span className="text-xs text-muted-foreground">
                  ETA: {formatTime(getEstimatedTimeRemaining()!)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer with controls */}
        {showDetails && data.status === 'running' && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm">
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing progress data
export function useProgressVisualization(initialData?: Partial<ProgressData>) {
  const [data, setData] = useState<ProgressData>({
    type: 'steps',
    status: 'idle',
    steps: [],
    ...initialData
  });

  const updateProgress = (updates: Partial<ProgressData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const startProgress = (startData?: Partial<ProgressData>) => {
    setData(prev => ({
      ...prev,
      ...startData,
      status: 'running',
      startTime: Date.now()
    }));
  };

  const pauseProgress = () => {
    setData(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeProgress = () => {
    setData(prev => ({ ...prev, status: 'running' }));
  };

  const completeProgress = () => {
    setData(prev => ({ ...prev, status: 'completed' }));
  };

  const errorProgress = () => {
    setData(prev => ({ ...prev, status: 'error' }));
  };

  const addStep = (step: ProgressStep) => {
    setData(prev => ({
      ...prev,
      steps: [...(prev.steps || []), step]
    }));
  };

  const updateStep = (stepId: string, updates: Partial<ProgressStep>) => {
    setData(prev => ({
      ...prev,
      steps: prev.steps?.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ) || []
    }));
  };

  return {
    data,
    updateProgress,
    startProgress,
    pauseProgress,
    resumeProgress,
    completeProgress,
    errorProgress,
    addStep,
    updateStep
  };
}
