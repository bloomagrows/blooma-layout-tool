import React from 'react';
import { plantIcons } from '../utils/plantIcons';

interface BloomaIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
} as const;

const BloomaIcon: React.FC<BloomaIconProps> = ({ 
  name, 
  size = 'md',
  className = ''
}) => {
  const safeName = typeof name === 'string'
  ? name.trim()
  : '';
  const iconData = plantIcons[safeName] || plantIcons['Other'];
  const Icon = iconData.icon;
  
  return (
    <div className={`relative flex items-center justify-center ${className} `}>
      <Icon 
        className={`${sizeClasses[size]} blooma-icon`}
        aria-label={iconData.name}
      />
    </div>
  );
};

export default BloomaIcon;