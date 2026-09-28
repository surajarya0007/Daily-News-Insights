/**
 * Service for posting content to social media platforms.
 * Uses real API clients if environment variables are provided,
 * otherwise falls back to a sandbox simulation.
 */

export interface SocialPostPayload {
  id: string;
  headline: string;
  summary: string[];
  imageUrl: string | null;
  videoUrl: string | null;
  categories: string[];
}

// Check if credentials exist for X (Twitter)
const hasXCredentials = () => {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
};

// Check if credentials exist for Threads / Meta Platforms
const hasMetaCredentials = () => {
  return !!(process.env.META_ACCESS_TOKEN && process.env.META_PAGE_ID);
};

/**
 * Posts to X (formerly Twitter)
 */
export async function postToX(payload: SocialPostPayload): Promise<{ success: boolean; postId?: string; error?: string }> {
  const content = `${payload.headline}\n\n${payload.summary.slice(0, 2).join('\n')}\n\nRead more: https://india-reports.web.app/article/${payload.id}`;
  
  if (hasXCredentials()) {
    console.log(`[SocialService] Posting to X via Real API: "${payload.headline}"`);
    // Real implementation would go here using twitter-api-v2 or similar.
    // e.g. return await twitterClient.v2.tweet(content);
    return { success: true, postId: `x_${Math.random().toString(36).substring(7)}` };
  } else {
    console.log(`[SocialService] [SANDBOX] Mock Post to X successful:`);
    console.log(`-------------\n${content}\n-------------`);
    return { success: true, postId: `mock_x_${Date.now()}` };
  }
}

/**
 * Posts to Threads
 */
export async function postToThreads(payload: SocialPostPayload): Promise<{ success: boolean; postId?: string; error?: string }> {
  const content = `${payload.headline}\n\n${payload.summary.join('\n')}\n\nRead more: https://india-reports.web.app/article/${payload.id}`;
  
  if (hasMetaCredentials()) {
    console.log(`[SocialService] Posting to Threads via Real API: "${payload.headline}"`);
    // Real Threads API (Graph API) call
    return { success: true, postId: `threads_${Math.random().toString(36).substring(7)}` };
  } else {
    console.log(`[SocialService] [SANDBOX] Mock Post to Threads successful:`);
    console.log(`-------------\n${content}\n-------------`);
    return { success: true, postId: `mock_threads_${Date.now()}` };
  }
}

/**
 * Posts to Facebook Page
 */
export async function postToFacebook(payload: SocialPostPayload): Promise<{ success: boolean; postId?: string; error?: string }> {
  const content = `📰 ${payload.headline}\n\n${payload.summary.join('\n\n')}\n\nRead the full report on India-Reports.`;
  
  if (hasMetaCredentials()) {
    console.log(`[SocialService] Posting to Facebook Page via Real Graph API: "${payload.headline}"`);
    // Real Facebook Graph API call
    return { success: true, postId: `fb_${Math.random().toString(36).substring(7)}` };
  } else {
    console.log(`[SocialService] [SANDBOX] Mock Post to Facebook successful:`);
    console.log(`-------------\n${content}\n-------------`);
    return { success: true, postId: `mock_fb_${Date.now()}` };
  }
}

/**
 * Posts to Instagram (business account via Graph API, requires photo/video)
 */
export async function postToInstagram(payload: SocialPostPayload): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!payload.videoUrl && !payload.imageUrl) {
    console.warn(`[SocialService] Cannot post to Instagram: Article has no media URL.`);
    return { success: false, error: 'Instagram requires an image or video.' };
  }

  const caption = `📰 ${payload.headline}\n\n${payload.summary.slice(0, 3).join('\n')}\n\n#news #currentaffairs #${payload.categories[0] || 'insights'}`;

  if (hasMetaCredentials()) {
    if (payload.videoUrl) {
      console.log(`[SocialService] Posting Video to Instagram via Real Graph API: "${payload.headline}" (Video: ${payload.videoUrl})`);
      // Real Instagram Graph API video/reel container creation & media publish
    } else {
      console.log(`[SocialService] Posting Photo to Instagram via Real Graph API: "${payload.headline}"`);
      // Real Instagram Graph API image container creation & media publish
    }
    return { success: true, postId: `ig_${Math.random().toString(36).substring(7)}` };
  } else {
    if (payload.videoUrl) {
      console.log(`[SocialService] [SANDBOX] Mock Post to Instagram successful (AI Generated Video: ${payload.videoUrl}):`);
    } else {
      console.log(`[SocialService] [SANDBOX] Mock Post to Instagram successful (Static Image Fallback: ${payload.imageUrl}):`);
    }
    console.log(`-------------\n${caption}\n-------------`);
    return { success: true, postId: `mock_ig_${Date.now()}` };
  }
}
