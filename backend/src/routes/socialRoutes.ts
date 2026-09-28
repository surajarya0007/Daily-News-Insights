import { Router } from 'express';
import {
  startSocialPipeline,
  publishArticleToSocials,
  handleFalWebhook
} from '../controllers/socialController';

const router = Router();

// Endpoint called by main backend to start social pipeline (video generation etc.)
router.post('/start', startSocialPipeline);

// Webhook endpoint called by Fal.ai when video rendering is complete
router.post('/fal-webhook', handleFalWebhook);

// Endpoint triggered by Google Cloud Tasks to execute final postings (X, FB, IG, Threads)
router.post('/publish-article', publishArticleToSocials);

export default router;
