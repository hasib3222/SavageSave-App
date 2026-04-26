import React from 'react';

/**
 * AppIcon — Reusable custom PNG icon wrapper
 * ===========================================
 * Renders project icon assets with consistent sizing,
 * object-fit containment, and smooth hover transitions.
 */
export default function AppIcon({ src, size = 24, className = '' }) {
  return (
    <img
      src={src}
      alt=""
      className={`object-contain shrink-0 select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
