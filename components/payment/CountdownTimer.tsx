'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  /** Initial seconds to count down from */
  seconds: number;
  /** Callback when countdown reaches 0 */
  onComplete?: () => void;
  /** Show warning when time is low (default: last 20 seconds) */
  warningThreshold?: number;
  /** Custom styling */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show progress ring */
  showProgress?: boolean;
}

export function CountdownTimer({
  seconds: initialSeconds,
  onComplete,
  warningThreshold = 20,
  className = '',
  size = 'md',
  showProgress = true,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete?.();
      return;
    }

    setIsWarning(secondsLeft <= warningThreshold);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onComplete, warningThreshold]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const progress = (secondsLeft / initialSeconds) * 100;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-20 h-20',
      text: 'text-lg',
      icon: 'w-4 h-4',
      stroke: 4,
      radius: 32,
    },
    md: {
      container: 'w-28 h-28',
      text: 'text-2xl',
      icon: 'w-5 h-5',
      stroke: 6,
      radius: 42,
    },
    lg: {
      container: 'w-40 h-40',
      text: 'text-5xl',
      icon: 'w-6 h-6',
      stroke: 6,
      radius: 52,
    },
  };

  const config = sizeConfig[size];
  const radius = config.radius;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Circular Progress */}
      {showProgress && (
        <div className="relative">
          <svg
            className={`${config.container} transform -rotate-90`}
            viewBox="0 0 120 120"
          >
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth={config.stroke}
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth={config.stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-linear ${
                isWarning
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`${config.text} font-bold tabular-nums ${
                isWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {secondsLeft}
            </span>
            <span className={`text-xs font-medium ${
              isWarning
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              seconds
            </span>
          </div>
        </div>
      )}

      {/* Text-only fallback */}
      {!showProgress && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isWarning
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400'
          }`}
        >
          <Clock className={config.icon} />
          <span className={`${config.text} font-bold`}>
            {formatTime(secondsLeft)}
          </span>
        </div>
      )}

      {/* Warning message */}
      {isWarning && secondsLeft > 0 && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 animate-pulse">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Time running out!</span>
        </div>
      )}

      {/* Expired message */}
      {secondsLeft === 0 && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">Time expired</span>
        </div>
      )}
    </div>
  );
}

// Compact inline variant for tight spaces
export function InlineCountdown({
  seconds: initialSeconds,
  onComplete,
  warningThreshold = 20,
  className = '',
}: Omit<CountdownTimerProps, 'size' | 'showProgress'>) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete?.();
      return;
    }

    setIsWarning(secondsLeft <= warningThreshold);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onComplete, warningThreshold]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
        isWarning
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
      } ${className}`}
    >
      <Clock className="w-4 h-4" />
      <span>{formatTime(secondsLeft)}</span>
      {isWarning && <AlertCircle className="w-4 h-4 animate-pulse" />}
    </div>
  );
}
