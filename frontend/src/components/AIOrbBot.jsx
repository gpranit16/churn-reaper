import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';

function removeSplineBranding(container) {
  if (!container) return;

  const directSelectors = [
    'a[href*="spline.design"]',
    '[class*="spline-watermark"]',
    '[class*="watermark"]',
    '[data-spline-watermark]',
  ];

  directSelectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((el) => el.remove());
  });

  container.querySelectorAll('a').forEach((anchor) => {
    const text = (anchor.textContent || '').toLowerCase();
    const href = (anchor.getAttribute('href') || '').toLowerCase();
    if (text.includes('built with spline') || href.includes('spline.design')) {
      anchor.remove();
    }
  });
}

export default function AIOrbBot({ className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const cleanupBranding = () => removeSplineBranding(container);
    cleanupBranding();

    const observer = new MutationObserver(() => {
      cleanupBranding();
    });

    observer.observe(container, { childList: true, subtree: true });
    const intervalId = window.setInterval(cleanupBranding, 1200);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-3xl border border-primary/20 bg-[#000000] min-h-[400px] md:min-h-[500px] ${className}`.trim()}
    >
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <Spline scene="https://prod.spline.design/TlAsWVdINcipxdM0/scene.splinecode" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 z-20 h-11 w-44 rounded-2xl bg-black/95"
      />
    </div>
  );
}
