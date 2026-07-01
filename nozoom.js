(() => {
  'use strict';

  const lockedViewport = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  const viewport = document.querySelector('meta[name="viewport"]');

  function lockViewport() {
    if (viewport && viewport.getAttribute('content') !== lockedViewport) {
      viewport.setAttribute('content', lockedViewport);
    }
  }

  lockViewport();

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 360) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false, capture: true });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('dblclick', (event) => {
    event.preventDefault();
  }, { passive: false, capture: true });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
      lockViewport();
    }, { passive: false, capture: true });
  });

  window.addEventListener('pageshow', lockViewport);
  window.addEventListener('orientationchange', () => {
    lockViewport();
    window.scrollTo(0, 0);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (window.visualViewport.scale > 1.01) lockViewport();
    });
  }
})();
