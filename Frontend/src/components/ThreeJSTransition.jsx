import React, { useEffect } from 'react';

/**
 * Clean Transition Component
 * Replaced heavy 358-line WebGL particle vortex with immediate, clean transition
 */
export default function ThreeJSTransition({ onComplete }) {
  useEffect(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return null;
}
