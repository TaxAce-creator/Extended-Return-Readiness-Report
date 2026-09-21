import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router } from "./_core/trpc";
import { canopyRouter } from "./routers/canopy";
import { settingsRouter } from "./routers/settings";
import { briefingRouter } from "./routers/briefing";
import { clientActionsRouter } from "./routers/clientActions";
import { localAuthRouter } from "./routers/localAuth";
import { securityRouter } from "./routers/security";
import { mfaRouter } from "./routers/mfa";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  canopy: canopyRouter,
  settings: settingsRouter,
  briefing: briefingRouter,
  clientActions: clientActionsRouter,
  localAuth: localAuthRouter,
  security: securityRouter,
  mfa: mfaRouter,
});

export type AppRouter = typeof appRouter;
