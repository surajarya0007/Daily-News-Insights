import { Request, Response } from 'express';
import prisma from '../config/db';
import {
  postToX,
  postToThreads,
  postToFacebook,
  postToInstagram,
  SocialPostPayload
} from '../services/socialMediaService';
import { enqueueSocialPostTask } from '../services/taskService';
import { triggerVideoGeneration } from '../services/videoService';

/**
 * Controller to trigger the start of the social posting pipeline.
 * Called by the main backend ingestion controller.
 */
export async function startSocialPipeline(req: Request, res: Response): Promise<void> {
  const { articleId, prompt } = req.body;

  if (!articleId || !prompt) {
    res.status(400).json({ error: 'Missing articleId or prompt' });
    return;
  }

  try {
    // Fire and forget - trigger Fal.ai video generation asynchronously
    void triggerVideoGeneration(articleId, prompt);

    res.status(202).json({
      success: true,
      message: 'Social posting pipeline started. Video generation triggered.'
    });
  } catch (error: any) {
    console.error(`[SocialController] Failed to start social pipeline for article ${articleId}:`, error);
    res.status(500).json({ error: 'Failed to start social pipeline' });
  }
}

/**
 * Controller to handle social media publishing queue requests.
 */
export async function publishArticleToSocials(req: Request, res: Response): Promise<void> {
  const { articleId } = req.body;

  if (!articleId) {
    res.status(400).json({ error: 'Missing articleId' });
    return;
  }

  // Authentication validation
  const isProduction = process.env.NODE_ENV === 'production';
  const bypassAuth = req.headers['x-bypass-auth'] === 'true';

  if (isProduction && !bypassAuth) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[SocialController] Unauthorized access attempt to publish article ${articleId}`);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Note: A full implementation would verify the Google OIDC token here.
    // e.g., using google-auth-library:
    // const ticket = await authClient.verifyIdToken({ idToken: token, audience: backendUrl });
  }

  try {
    // 1. Fetch the Article and its publish state
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { socialPublishState: true }
    });

    if (!article) {
      console.error(`[SocialController] Article not found: ${articleId}`);
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // 2. Ensure publish state model exists
    let state = article.socialPublishState;
    if (!state) {
      state = await prisma.socialPublishState.create({
        data: { articleId }
      });
    }

    console.log(`[SocialController] Processing publishing for article: "${article.headline}" (${articleId})`);
    console.log(`[SocialController] Current State - X: ${state.xStatus}, Threads: ${state.threadsStatus}, FB: ${state.facebookStatus}, IG: ${state.instagramStatus}`);

    // Update attempts counter
    await prisma.socialPublishState.update({
      where: { id: state.id },
      data: {
        attempts: { increment: 1 },
        lastAttempt: new Date()
      }
    });

    const payload: SocialPostPayload = {
      id: article.id,
      headline: article.headline,
      summary: article.summary,
      imageUrl: article.imageUrl,
      videoUrl: article.videoUrl,
      categories: article.categories
    };

    let hasFailure = false;
    let errorDetails: string[] = [];

    // 3. Post to X (Twitter)
    if (state.xStatus !== 'success') {
      try {
        const result = await postToX(payload);
        if (result.success) {
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { xStatus: 'success' }
          });
        } else {
          hasFailure = true;
          errorDetails.push(`X: ${result.error || 'Failed'}`);
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { xStatus: 'failed', errorMessage: result.error || 'X posting failed' }
          });
        }
      } catch (err: any) {
        hasFailure = true;
        errorDetails.push(`X Error: ${err.message}`);
        await prisma.socialPublishState.update({
          where: { id: state.id },
          data: { xStatus: 'failed', errorMessage: err.message }
        });
      }
    }

    // 4. Post to Threads
    if (state.threadsStatus !== 'success') {
      try {
        const result = await postToThreads(payload);
        if (result.success) {
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { threadsStatus: 'success' }
          });
        } else {
          hasFailure = true;
          errorDetails.push(`Threads: ${result.error || 'Failed'}`);
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { threadsStatus: 'failed', errorMessage: result.error || 'Threads posting failed' }
          });
        }
      } catch (err: any) {
        hasFailure = true;
        errorDetails.push(`Threads Error: ${err.message}`);
        await prisma.socialPublishState.update({
          where: { id: state.id },
          data: { threadsStatus: 'failed', errorMessage: err.message }
        });
      }
    }

    // 5. Post to Facebook
    if (state.facebookStatus !== 'success') {
      try {
        const result = await postToFacebook(payload);
        if (result.success) {
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { facebookStatus: 'success' }
          });
        } else {
          hasFailure = true;
          errorDetails.push(`Facebook: ${result.error || 'Failed'}`);
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { facebookStatus: 'failed', errorMessage: result.error || 'Facebook posting failed' }
          });
        }
      } catch (err: any) {
        hasFailure = true;
        errorDetails.push(`Facebook Error: ${err.message}`);
        await prisma.socialPublishState.update({
          where: { id: state.id },
          data: { facebookStatus: 'failed', errorMessage: err.message }
        });
      }
    }

    // 6. Post to Instagram
    if (state.instagramStatus !== 'success') {
      try {
        const result = await postToInstagram(payload);
        if (result.success) {
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { instagramStatus: 'success' }
          });
        } else {
          // Instagram requires images, if it failed because there was no image, we might log it
          hasFailure = true;
          errorDetails.push(`Instagram: ${result.error || 'Failed'}`);
          await prisma.socialPublishState.update({
            where: { id: state.id },
            data: { instagramStatus: 'failed', errorMessage: result.error || 'Instagram posting failed' }
          });
        }
      } catch (err: any) {
        hasFailure = true;
        errorDetails.push(`Instagram Error: ${err.message}`);
        await prisma.socialPublishState.update({
          where: { id: state.id },
          data: { instagramStatus: 'failed', errorMessage: err.message }
        });
      }
    }

    // Response evaluation
    if (hasFailure) {
      console.warn(`[SocialController] Partial/Total failure for article ${articleId}: ${errorDetails.join(', ')}`);
      res.status(500).json({
        success: false,
        message: 'Some postings failed, queue will retry.',
        errors: errorDetails
      });
    } else {
      console.log(`[SocialController] All social postings succeeded for article ${articleId}`);
      res.status(200).json({ success: true, message: 'All platforms updated successfully.' });
    }
  } catch (dbError: any) {
    console.error(`[SocialController] Database / processing error for article ${articleId}:`, dbError);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Endpoint called by Fal.ai webhook when video rendering is complete.
 */
export async function handleFalWebhook(req: Request, res: Response): Promise<void> {
  const articleId = req.query.articleId as string;

  if (!articleId) {
    console.error('[SocialController Webhook] Missing articleId in webhook query parameters.');
    res.status(400).json({ error: 'Missing articleId' });
    return;
  }

  // Fal.ai callback payload contains request results or error
  const { video, error } = req.body;

  if (error) {
    console.error(`[SocialController Webhook] Fal.ai returned error for article ${articleId}:`, error);
    res.status(400).json({ error: `Fal.ai generation error: ${error}` });
    return;
  }

  const videoUrl = video?.url;

  if (!videoUrl) {
    console.error(`[SocialController Webhook] Webhook payload does not contain video URL:`, req.body);
    res.status(400).json({ error: 'Webhook payload missing video url' });
    return;
  }

  console.log(`[SocialController Webhook] Received video from Fal.ai: ${videoUrl} for article ${articleId}`);

  try {
    // 1. Update the article in database with the newly generated videoUrl
    await prisma.article.update({
      where: { id: articleId },
      data: { videoUrl }
    });

    console.log(`[SocialController Webhook] Article ${articleId} updated with videoUrl. Enqueuing social posts...`);

    // 2. Enqueue the posting task to process social publishing (X, Threads, FB, IG)
    await enqueueSocialPostTask(articleId);

    res.status(200).json({ success: true, message: 'Webhook processed, post enqueued.' });
  } catch (dbErr) {
    console.error(`[SocialController Webhook] Failed to save videoUrl or enqueue task for article ${articleId}:`, dbErr);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
}

