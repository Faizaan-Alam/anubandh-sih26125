import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { onChainRole, type RoleName } from "./chain";

export interface SessionClaims {
  did: string;
  address: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionClaims;
      currentRole?: RoleName | "None";
    }
  }
}

export function signSession(did: string, address: string): string {
  return jwt.sign({ did, address }, env.jwtSecret, { expiresIn: env.jwtTtlSeconds });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing session token" });
    return;
  }
  try {
    const claims = jwt.verify(header.slice(7), env.jwtSecret) as SessionClaims;
    req.session = claims;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session token" });
  }
}

export function requireRoles(allowed: RoleName[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    try {
      const role = await onChainRole(req.session.address);
      req.currentRole = role;
      if (role === "None" || !allowed.includes(role)) {
        res.status(403).json({
          error: "Authorization failed at the policy enforcement point",
          detail: `On-chain role is ${role}; required one of: ${allowed.join(", ")}`
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
