
import React from 'react';

interface MathRendererProps {
  text?: string;
  svg?: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, svg, className = "" }) => {
  // SVG Handling: Replace common word-based symbols with Unicode
  if (svg) {
    const replacements: Record<string, string> = {
      'theta': '\u03B8',
      'alpha': '\u03B1',
      'beta': '\u03B2',
      'gamma': '\u03B3',
      'delta': '\u03B4',
      'pi': '\u03C0',
      'omega': '\u03C9',
      'lambda': '\u03BB',
      'mu': '\u03BC',
      'sigma': '\u03C3',
      'rho': '\u03C1',
      'phi': '\u03C6',
      'epsilon': '\u03B5',
      'degree': '\u00B0',
      'sqrt': '\u221A',
      'infinity': '\u221E',
      'ohm': '\u03A9',
      'Ohm': '\u03A9',
      'micro': '\u00B5'
    };

    let processedSvg = svg;
    
    // Replace whole words that are likely placeholders (case-insensitive)
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processedSvg = processedSvg.replace(regex, value);
    });

    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    );
  }

  // Text Handling (KaTeX)
  if (!text) return null;

  // Split by $ delimiters to find math content
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            // @ts-ignore - KaTeX is loaded via CDN in index.html
            const html = window.katex ? window.katex.renderToString(math, {
              throwOnError: false,
              displayMode: false
            }) : math;
            return (
              <span 
                key={index} 
                dangerouslySetInnerHTML={{ __html: html }} 
              />
            );
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
