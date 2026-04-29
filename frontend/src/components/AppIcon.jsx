import React from 'react';

/**
 * AppIcon — Reusable custom PNG icon wrapper
 * ===========================================
 * Renders project icon assets with consistent sizing,
 * object-fit containment, and crisp rendering on Windows.
 *
 * Size guidelines:
 * - sidebar: 20-22px
 * - buttons: 18px
 * - logo: 36px
 */
export default function AppIcon({ src: _src, size = 24, className = '' }) {
  const officialIcon = 'icon/main icon s.png';
  return (
    <img
      src={officialIcon}
      alt=""
      className={`object-cover shrink-0 select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'crisp-edges',
      }}
      draggable={false}
    />
  );
}
