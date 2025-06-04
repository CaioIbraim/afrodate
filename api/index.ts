import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { discoverRouter } from './routes/discover';
import { profileRouter } from './routes/profile';
import { quizRouter } from './routes/quiz';
import { authMiddleware } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001; // Use a different port than your Next.js app

app.use(express.json());

app.use('/auth', authRouter);
app.use('/discover', authMiddleware, discoverRouter);
app.use('/profile', authMiddleware, profileRouter);
app.use('/quiz', authMiddleware, quizRouter);
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running successfully!' });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});