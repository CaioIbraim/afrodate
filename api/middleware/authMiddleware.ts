import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401).json({ message: 'Authentication token required' }); // if there isn't any token
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return res.sendStatus(403).json({ message: 'Invalid token' }); // if token is not valid
    }
    req.user = user;
    next(); // pass the execution off to the next middleware function
  });
};