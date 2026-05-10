import jwt from 'jsonwebtoken';

export function makeToken(payload: {
  id: string;
  schoolId: string;
  role: string;
  email?: string;
}) {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'test-secret', { expiresIn: '1h' });
}

export function authHeader(payload: Parameters<typeof makeToken>[0]) {
  return { Authorization: `Bearer ${makeToken(payload)}` };
}
