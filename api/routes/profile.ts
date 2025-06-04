import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protected route to get a specific profile by ID
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const profileId = req.params.id;

  // TODO: Implement logic to fetch profile data for the given ID from your database (e.g., Supabase)
  // Use req.user to access authenticated user information if needed for authorization checks

  res.status(200).json({ message: `Fetching profile with ID: ${profileId}`, userId: (req as any).user.id });
});

export default router;