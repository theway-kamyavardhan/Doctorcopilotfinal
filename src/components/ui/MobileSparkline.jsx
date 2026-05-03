import React, { useEffect, useState } from 'react';

/**
 * MobileSparkline
 * Premium SVG sparkline optimized for mobile.
 */
export default function MobileSparkline({
  data = [],
  color = '#007AFF',
  width = '100%',
  height = 40,
  strokeWidth = 2.5
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Slight delay to ensure paint
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length < 2) {
    return (
      <div 
        style={{ width, height }} 
        className="flex items-center justify-center opacity-30"
      >
        <div className="h-0.5 w-full bg-current rounded-full" />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const paddingY = strokeWidth + 4; // Extra padding for glow
  const drawHeight = height - paddingY * 2;
  const viewBoxWidth = 100;
  const xStep = viewBoxWidth / (data.length - 1);

  let pathD = '';
  data.forEach((val, i) => {
    const x = i * xStep;
    const normalizedY = ((val - min) / range);
    const y = paddingY + drawHeight - (normalizedY * drawHeight);

    if (i === 0) {
      pathD += `M ${x},${y}`;
    } else {
      const prevX = (i - 1) * xStep;
      const prevY = paddingY + drawHeight - (((data[i - 1] - min) / range) * drawHeight);
      const cp1X = prevX + xStep * 0.4;
      const cp1Y = prevY;
      const cp2X = x - xStep * 0.4;
      const cp2Y = y;
      pathD += ` C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${x},${y}`;
    }
  });

  const lastPointX = viewBoxWidth;
  const lastPointY = paddingY + drawHeight - (((data[data.length - 1] - min) / range) * drawHeight);
  const idPrefix = color.replace('#', '');

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible pointer-events-none"
    >
      <defs>
        <linearGradient id={`spark-grad-${idPrefix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id={`stroke-grad-${idPrefix}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Area fill */}
      <path 
        d={`${pathD} L ${viewBoxWidth},${height} L 0,${height} Z`}
        fill={`url(#spark-grad-${idPrefix})`}
        className={`transition-opacity duration-700 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Line stroke */}
      <path 
        d={pathD}
        fill="none"
        stroke={`url(#stroke-grad-${idPrefix})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength="1"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: mounted ? 0 : 1,
          transition: 'stroke-dashoffset 800ms ease-out'
        }}
      />
      
      {/* Glow / Pulse Dot */}
      <g 
        className={`transition-opacity duration-500 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        transform={`translate(${lastPointX}, ${lastPointY})`}
      >
        <circle 
          cx="0" cy="0" 
          r={strokeWidth * 2.5} 
          fill={color} 
          opacity="0.3"
          filter="url(#glow)"
        >
          <animate 
            attributeName="r" 
            values={`${strokeWidth * 1.5};${strokeWidth * 3.5};${strokeWidth * 1.5}`} 
            dur="2s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="opacity" 
            values="0.4;0.1;0.4" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
        <circle 
          cx="0" cy="0" 
          r={strokeWidth * 1.5} 
          fill="#ffffff" 
          stroke={color} 
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
