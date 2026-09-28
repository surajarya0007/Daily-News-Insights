import { PrismaClient } from '@prisma/client';
import { sanitizeImageUrl } from '../utils/imageUtils';

const prisma = new PrismaClient();

/** Enforce imageUrl sanitization on every Article write — cannot be bypassed by callers */
function sanitizeArticleWriteData(data: Record<string, unknown> | undefined) {
  if (!data || !('imageUrl' in data)) return;
  data.imageUrl = sanitizeImageUrl(data.imageUrl as string | null | undefined);
}

prisma.$use(async (params, next) => {
  if (params.model === 'Article') {
    if (params.action === 'create' || params.action === 'update') {
      sanitizeArticleWriteData(params.args.data);
    } else if (params.action === 'upsert') {
      sanitizeArticleWriteData(params.args.create);
      sanitizeArticleWriteData(params.args.update);
    } else if (params.action === 'updateMany') {
      sanitizeArticleWriteData(params.args.data);
    }
  }
  return next(params);
});

export default prisma;
