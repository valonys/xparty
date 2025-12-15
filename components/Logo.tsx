import React from 'react';

// Using a CSS/SVG recreation of the provided logo description.
// In production, you would replace this with: <img src="/path/to/logo.png" />

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-base',
    xl: 'w-40 h-40 text-xl'
  };

  return (
    <div className={`relative flex items-center justify-center font-bold italic select-none ${sizeClasses[size]}`}>
      {/* The Red X */}
      <div 
        className="absolute inset-0 text-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
        style={{ 
          background: 'linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)',
          clipPath: 'polygon(20% 0%, 0% 0%, 30% 50%, 0% 100%, 20% 100%, 50% 60%, 80% 100%, 100% 100%, 70% 50%, 100% 0%, 80% 0%, 50% 40%)'
        }}
      ></div>
      
      {/* The "Nivel" text overlay */}
      <span 
        className="relative z-10 text-gray-200 font-serif tracking-tighter drop-shadow-md"
        style={{ 
            textShadow: '2px 2px 0px #000',
            transform: 'rotate(-5deg) scale(1.5)'
        }}
      >
        Nivel
      </span>
    </div>
  );
};