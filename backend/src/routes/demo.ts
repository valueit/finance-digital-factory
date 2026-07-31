import { Router } from 'express';
import { resetDemoData } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/reset', (req, res, next) => {
  try {
    const token =
      (req.headers['x-demo-reset-token'] as string | undefined) ||
      (req.body?.token as string | undefined) ||
      (req.query.token as string | undefined);

    const expected = process.env.DEMO_RESET_TOKEN || 'demo-reset-token';

    if (!token || token !== expected) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid demo reset token');
    }

    resetDemoData();
    res.json({ status: 'OK', message: 'Demo data reset successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
