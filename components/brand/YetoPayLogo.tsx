import React from 'react';

interface YetoPayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  white?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export default function YetoPayLogo({ size = 'md', white, className = '' }: YetoPayLogoProps) {
  return (
    <span
      className={`font-extrabold tracking-tight select-none ${white ? 'text-white' : 'yp-gradient-text'} ${sizeMap[size]} ${className}`}
    >
      YetoPay
    </span>
  );
}
