import { Request, Response, NextFunction } from 'express';

type Plan = 'free' | 'core' | 'premium';

const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  core: 1,
  premium: 2,
};

/**
 * Middleware factory — gates a route behind a minimum plan tier.
 * Usage: router.post('/chat', requireAuth, requirePlan('core'), handler)
 */
export function requirePlan(minimumPlan: Plan) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPlan = (req.user?.plan ?? 'free') as Plan;
    const userLevel = PLAN_HIERARCHY[userPlan] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[minimumPlan];

    if (userLevel >= requiredLevel) {
      next();
    } else {
      res.status(403).json({
        error: `This feature requires the ${minimumPlan} plan or higher.`,
        code: 'PLAN_REQUIRED',
        requiredPlan: minimumPlan,
        currentPlan: userPlan,
      });
    }
  };
}
