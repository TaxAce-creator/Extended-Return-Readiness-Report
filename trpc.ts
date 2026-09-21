import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/** adminProcedure — accessible by admin AND owner roles */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['admin', 'owner'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    if (!ctx.user.mfaEnabled || !ctx.sessionMfaVerified) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Two-factor authentication must be configured and verified before administrator access is granted." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** ownerProcedure — exclusively for the owner role */
export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'owner') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    if (!ctx.user.mfaEnabled || !ctx.sessionMfaVerified) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Two-factor authentication must be configured and verified before owner access is granted." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * preparerProcedure — accessible by admin AND preparer roles.
 * Use for routes that Amber (preparer) is permitted to call:
 * canopy uploads, pipeline data, client lookup, analytics, deadlines.
 */
export const preparerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const allowedRoles: string[] = ['owner', 'admin', 'preparer'];
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    if (['owner', 'admin'].includes(ctx.user.role) && (!ctx.user.mfaEnabled || !ctx.sessionMfaVerified)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Two-factor authentication must be configured and verified before administrator access is granted." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
