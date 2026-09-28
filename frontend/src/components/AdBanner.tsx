'use client';

import React, { useEffect, useState } from 'react';

interface AdBannerProps {
  adSlot?: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdBanner({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
  className = '',
}: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-7269654171240753';
  
  // Default fallback slot IDs if not provided in props or env
  const slotId = adSlot || process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT;

  // Temporarily disable manual ad slots to avoid showing empty layout blocks
  return null;

  useEffect(() => {
    // Only push if we are on client side and adsbygoogle is available
    if (typeof window !== 'undefined') {
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
        setAdLoaded(true);
      } catch (err) {
        console.warn('AdSense ad push failed (likely due to ad blocker or script not loaded yet):', err);
      }
    }
  }, [adSlot]);

  if (!clientId) {
    return null;
  }

  return (
    <div 
      className={`adsense-container my-6 mx-auto flex flex-col items-center justify-center overflow-hidden min-h-[90px] w-full text-center ${className}`}
      style={{ margin: '24px 0' }}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1 block select-none">
        Advertisement
      </span>
      <div className="w-full bg-muted/20 border border-muted/10 rounded-md p-1 flex justify-center items-center">
        <ins
          className="adsbygoogle"
          style={style || { display: 'block', width: '100%', minWidth: '250px' }}
          data-ad-client={clientId}
          {...(slotId ? { 'data-ad-slot': slotId } : {})}
          data-ad-format={adFormat}
          data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
}
