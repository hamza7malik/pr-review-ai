import { Router } from 'express';
import { passport, users } from '../config/passport';
import { generateToken, verifyToken } from '../utils/jwt';
import type { User } from '../types/user.types';
import { env } from '../config/env';

const router = Router();

router.get('/github', passport.authenticate('github', { session: false }));

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    const user = req.user as User;

    if (!user) {
      console.error('[AUTH] No user found after GitHub callback');
      return res.redirect(`${env.FRONTEND_URL}/login?error=no_user`);
    }

    console.log('[AUTH] User authenticated:', user.username);
    const token = generateToken(user);
    console.log('[AUTH] Token generated, setting cookie...');

    // Set cookie with production-safe settings
    const cookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };

    console.log('[AUTH] Cookie options:', cookieOptions);
    res.cookie('token', token, cookieOptions);

    console.log('[AUTH] Redirecting to:', `${env.FRONTEND_URL}?auth=success`);
    res.redirect(`${env.FRONTEND_URL}?auth=success`);
  }
);

router.get('/me', (req, res) => {
  const token = req.cookies?.token;

  console.log('[AUTH /me] Cookies received:', req.cookies);
  console.log('[AUTH /me] Token found:', !!token);

  if (!token) {
    res.json({ user: null, authenticated: false });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    console.log('[AUTH /me] Token verification failed');
    res.json({ user: null, authenticated: false });
    return;
  }

  const user = users.get(payload.userId);

  if (!user) {
    console.log('[AUTH /me] User not found in store');
    res.json({ user: null, authenticated: false });
    return;
  }

  console.log('[AUTH /me] User authenticated:', user.username);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessToken, ...userWithoutToken } = user;

  res.json({
    user: userWithoutToken,
    authenticated: true,
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
