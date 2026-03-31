import React from "react";

/**
 * RefractionFilter
 * A specialized SVG filter component that provides a "Liquid Lens" effect.
 * It can be applied to text or elements using the CSS `filter: url(#liquid-lens)`.
 */
export default function RefractionFilter() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none -z-50">
      <defs>
        {/* Subtle Liquid Lens Refraction */}
        <filter id="liquid-lens" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015"
            numOctaves="3"
            result="noise"
            seed="2"
          >
            <animate
              attributeName="baseFrequency"
              values="0.015;0.02;0.015"
              dur="12s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="20"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* More intense Liquid Glass Refraction */}
        <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence 
                type="turbulence" 
                baseFrequency="0.01 0.01" 
                numOctaves="2" 
                seed="3" 
                result="turbulence"
            >
                <animate 
                    attributeName="baseFrequency" 
                    dur="30s" 
                    values="0.01 0.01;0.02 0.05;0.01 0.01" 
                    repeatCount="indefinite" 
                />
            </feTurbulence>
            <feDisplacementMap 
                in="SourceGraphic" 
                in2="turbulence" 
                scale="35" 
                xChannelSelector="R" 
                yChannelSelector="G" 
                result="displacement" 
            />
        </filter>
      </defs>
    </svg>
  );
}
