import React from 'react';

/**
 * MobileSparkline
 * A lightweight, pure SVG sparkline component optimized for mobile.
 * Generates a smooth cubic-bezier curve from an array of numbers.
 * 
 * @param {Array<number>} data - Array of numeric values
 * @param {string} color - Stroke color
 * @param {number} width - SVG width (or 100% if undefined)
 * @param {number} height - SVG height
 * @param {number} strokeWidth - Stroke thickness
 */
export default function MobileSparkline({
  data = [],
  color = '#007AFF',
  width = '100%',
  height = 40,
  strokeWidth = 2.5
}) {
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

  // Normalize data to fit within height bounds
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Prevent division by zero
  
  const paddingY = strokeWidth;
  const drawHeight = height - paddingY * 2;
  
  // Calculate X spacing (100% based, viewBox will handle aspect)
  const viewBoxWidth = 100;
  const xStep = viewBoxWidth / (data.length - 1);

  // Generate path commands
  let pathD = '';
  
  data.forEach((val, i) => {
    const x = i * xStep;
    // Invert Y because SVG coordinates go top-down
    const normalizedY = ((val - min) / range);
    const y = paddingY + drawHeight - (normalizedY * drawHeight);

    if (i === 0) {
      pathD += `M ${x},${y}`;
    } else {
      // Create a smooth curve using bezier
      const prevX = (i - 1) * xStep;
      const prevY = paddingY + drawHeight - (((data[i - 1] - min) / range) * drawHeight);
      
      const cp1X = prevX + xStep * 0.4;
      const cp1Y = prevY;
      const cp2X = x - xStep * 0.4;
      const cp2Y = y;
      
      pathD += ` C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${x},${y}`;
    }
  });

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible pointer-events-none"
    >
      {/* Optional: Add a subtle gradient fill underneath the line */}
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path 
        d={`${pathD} L ${viewBoxWidth},${height} L 0,${height} Z`}
        fill={`url(#spark-grad-${color.replace('#', '')})`}
      />
      
      {/* Line stroke */}
      <path 
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      
      {/* Current/Latest point dot */}
      {data.length > 0 && (
        <circle 
          cx={viewBoxWidth} 
          cy={paddingY + drawHeight - (((data[data.length - 1] - min) / range) * drawHeight)} 
          r={strokeWidth * 1.5} 
          fill="#fff" 
          stroke={color} 
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  );
}
