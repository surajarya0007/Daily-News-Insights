import React from 'react';

/**
 * Parses the image URL to determine its licensing source.
 */
export function getImageSource(url?: string): string {
  if (!url) return '';
  try {
    const lowerUrl = url.toLowerCase();
    
    // Explicit mappings for our core image search integrations
    if (lowerUrl.includes('unsplash.com')) return 'Unsplash';
    if (lowerUrl.includes('wikimedia.org') || lowerUrl.includes('upload.wikimedia.org') || lowerUrl.includes('wikipedia.org')) return 'Wikimedia';
    if (lowerUrl.includes('flickr.com') || lowerUrl.includes('staticflickr.com')) return 'Openverse';
    if (lowerUrl.includes('openverse')) return 'Openverse';
    if (lowerUrl.includes('pixabay.com')) return 'Pixabay';
    if (lowerUrl.includes('wordpress.org')) return 'WordPress';

    // Parse host for other third party domains
    const match = url.match(/^https?:\/\/(?:www\.)?([^/?#]+)/i);
    if (match && match[1]) {
      const parts = match[1].split('.');
      const domain = parts[parts.length - 2];
      if (domain && domain.length > 2) {
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    }
    return '';
  } catch (e) {
    return '';
  }
}

interface ImageSourceBadgeProps {
  imageUrl?: string;
  style?: React.CSSProperties;
}

/**
 * Premium overlay badge showing the image source in the bottom-right corner.
 */
export default function ImageSourceBadge({ imageUrl, style = {} }: ImageSourceBadgeProps) {
  const source = getImageSource(imageUrl);
  if (!source) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        background: 'rgba(15, 23, 42, 0.45)', // Sleek modern semi-transparent slate
        color: '#ffffff',
        padding: '3px 8px',
        borderRadius: '5px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        zIndex: 10,
        pointerEvents: 'none', // clicks pass through to parent containers
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        ...style,
      }}
    >
      {source}
    </div>
  );
}
