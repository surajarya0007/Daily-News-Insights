import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getAdminStats,
  createArticle,
  updateArticle,
  deleteArticle,
  clearCache,
  getRagStatus,
  startRagBackfill,
} from '../controllers/adminController';

const router = Router();

// Apply requireAdmin middleware to all endpoints in this router
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.post('/news', createArticle);
router.put('/news/:id', updateArticle);
router.delete('/news/:id', deleteArticle);
router.post('/clear-cache', clearCache);
router.get('/rag/status', getRagStatus);
router.post('/rag/backfill', startRagBackfill);

export default router;
