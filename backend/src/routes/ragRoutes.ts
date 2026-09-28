import { Router } from 'express';
import { chatWithArticles, searchRagArticles } from '../controllers/ragController';

const router = Router();

router.get('/search', searchRagArticles);
router.post('/chat', chatWithArticles);

export default router;
