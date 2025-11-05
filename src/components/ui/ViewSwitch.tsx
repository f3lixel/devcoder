import * as React from 'react';
import { Eye, Code } from 'lucide-react';
import { motion } from 'framer-motion';

interface ViewSwitchProps {
  className?: string;
  defaultView?: 'preview' | 'code';
  onChange?: (view: 'preview' | 'code') => void;
}

export function ViewSwitch({
  className = '',
  defaultView = 'preview',
  onChange,
}: ViewSwitchProps) {
  const [activeView, setActiveView] = React.useState<'preview' | 'code'>(defaultView);

  const handleToggle = React.useCallback(() => {
    const newView = activeView === 'preview' ? 'code' : 'preview';
    setActiveView(newView);
    onChange?.(newView);
  }, [activeView, onChange]);

  return (
    <div className={`inline-flex items-center gap-2 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 shadow-lg ${className}`}>
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          activeView === 'preview'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Toggle view"
      >
        {activeView === 'preview' && (
          <motion.div
            layoutId="activeBackground"
            className="absolute inset-0 bg-gradient-to-br from-background to-background/80 border border-border rounded-lg shadow-md"
            initial={false}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 1,
            }}
          />
        )}
        <motion.div
          animate={{
            scale: activeView === 'preview' ? 1 : 0.95,
            rotate: activeView === 'preview' ? 0 : -4,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 25,
          }}
        >
          <Eye className="relative z-10 h-4 w-4 flex-shrink-0" />
        </motion.div>
        {activeView === 'preview' && (
          <motion.span
            className="relative z-10 overflow-hidden whitespace-nowrap"
            initial={{ width: 0, opacity: 0, x: -10 }}
            animate={{ width: 'auto', opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -10 }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            Preview
          </motion.span>
        )}
  </motion.button>

      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          activeView === 'code'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {activeView === 'code' && (
          <motion.div
            layoutId="activeBackground"
            className="absolute inset-0 bg-gradient-to-br from-background to-background/80 border border-border rounded-lg shadow-md"
            initial={false}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 1,
            }}
          />
        )}
        <motion.div
          animate={{
            scale: activeView === 'code' ? 1 : 0.95,
            rotate: activeView === 'code' ? 0 : 4,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 25,
          }}
        >
          <Code className="relative z-10 h-4 w-4 flex-shrink-0" />
        </motion.div>
        {activeView === 'code' && (
          <motion.span
            className="relative z-10 overflow-hidden whitespace-nowrap"
            initial={{ width: 0, opacity: 0, x: -10 }}
            animate={{ width: 'auto', opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -10 }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            Code
          </motion.span>
        )}
  </motion.button>
    </div>
  );
}

export default ViewSwitch;
