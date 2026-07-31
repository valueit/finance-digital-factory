import { Router } from 'express';
import { login } from '../services/authService.js';

const router = Router();

router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    const result = login(username ?? '', password ?? '');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
