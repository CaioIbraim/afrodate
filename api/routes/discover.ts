import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, (req: Request, res: Response) => {
  // TODO: Implement logic to fetch discover data
  res.status(200).json({ message: 'Discover route (placeholder)' });
});

export default router;