import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';
import {
  createRequest,
  decideRequest,
  getAgentStats,
  getManagerKpis,
  getRequest,
  listRequests,
  startReview,
  submitRequest,
  updateRequest,
} from '../services/financingService.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateFinancingRequestBody, DecisionBody } from '../types/index.js';

const router = Router();

router.use(authenticate);

router.get('/stats/agent', requireRole('AGENT'), (req: AuthRequest, res, next) => {
  try {
    res.json(getAgentStats(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.get('/stats/manager', requireRole('MANAGER'), (_req, res, next) => {
  try {
    res.json(getManagerKpis());
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('AGENT'), (req: AuthRequest, res, next) => {
  try {
    const body = req.body as CreateFinancingRequestBody;
    const created = createRequest(req.user!, body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.get('/', (req: AuthRequest, res, next) => {
  try {
    res.json(listRequests(req.user!));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid request id');
    }
    res.json(getRequest(req.user!, id));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('AGENT'), (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid request id');
    }
    const body = req.body as CreateFinancingRequestBody;
    res.json(updateRequest(req.user!, id, body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', requireRole('AGENT'), (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid request id');
    }
    res.json(submitRequest(req.user!, id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start-review', requireRole('ANALYST'), (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid request id');
    }
    res.json(startReview(req.user!, id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decision', requireRole('ANALYST'), (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError(400, 'INVALID_ID', 'Invalid request id');
    }
    const body = req.body as DecisionBody;
    if (!body.decision) {
      throw new AppError(400, 'DECISION_REQUIRED', 'Decision is required');
    }
    res.json(decideRequest(req.user!, id, body.decision, body.reason ?? ''));
  } catch (err) {
    next(err);
  }
});

export default router;
