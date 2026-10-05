import React from 'react';

interface BrandIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandIcon: React.FC<BrandIconProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 rounded-md',
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
    lg: 'w-10 h-10 rounded-xl',
    xl: 'w-14 h-14 rounded-2xl'
  };

  const containerClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`${containerClass} bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150 overflow-hidden ${className}`}
      title="LatchUp"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[66%] h-[66%]"
        aria-hidden="true"
      >
        {/* Latch base: bold geometric L */}
        <path
          d="M 8.5 9.5 V 26.5 H 20"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Up arrow stem */}
        <path
          d="M 15 20 L 27.5 7.5"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Up arrow head */}
        <path
          d="M 18.5 7.5 H 27.5 V 16.5"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  tag?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  tag,
  subtitle = 'Placement & Communication Suite',
  className = '',
  onClick
}) => {
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl'
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <BrandIcon size={size} />
      <div className="flex flex-col text-left">
        <div className="flex items-center space-x-1.5">
          <span className={`${textSizes[size]} font-extrabold tracking-tight text-neutral-900 font-sans leading-none`}>
            Latch<span className="text-neutral-500 font-semibold">Up</span>
          </span>
          {tag && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono leading-none">
              {tag}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[11px] text-neutral-500 hidden sm:inline leading-tight mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
