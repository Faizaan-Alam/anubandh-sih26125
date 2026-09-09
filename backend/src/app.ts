import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { identityRouter } from "./routes/identity";
import { rolesRouter } from "./routes/roles";
import { assetsRouter } from "./routes/assets";
import { attestationsRouter } from "./routes/attestations";
import { divergenceRouter } from "./routes/divergence";
import { credentialsRouter } from "./routes/credentials";
import { offlineRouter } from "./routes/offline";
import { auditRouter } from "./routes/audit";
import { getChain } from "./chain";
import { requireAuth } from "./auth";
import { onChainRole } from "./chain";

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: [env.corsOrigin, env.verifierOrigin, "http://localhost:3000", "http://localhost:3001"],
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "anubandh-pep" });
  });

  app.get("/ready", async (_req, res, next) => {
    try {
      const chain = getChain();
      const block = await chain.provider.getBlockNumber();
      res.json({
        ok: true,
        block,
        contracts: {
          RoleManager: chain.deployment.RoleManager,
          DIDRegistry: chain.deployment.DIDRegistry,
          AssetNFT: chain.deployment.AssetNFT,
          AttestationRegistry: chain.deployment.AttestationRegistry,
          DivergenceRegistry: chain.deployment.DivergenceRegistry
        }
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/session", requireAuth, async (req, res, next) => {
    try {
      const role = await onChainRole(req.session!.address);
      res.json({
        did: req.session!.did,
        address: req.session!.address,
        role,
        roleSource: "RoleManager.hasActiveRole (fresh on-chain check)"
      });
    } catch (err) {
      next(err);
    }
  });

  app.use("/auth", authRouter);
  app.use("/identity", identityRouter);
  app.use("/roles", rolesRouter);
  app.use("/assets", assetsRouter);
  app.use("/attestations", attestationsRouter);
  app.use("/divergence", divergenceRouter);
  app.use("/credentials", credentialsRouter);
  app.use("/offline", offlineRouter);
  app.use("/audit", auditRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Invalid request", details: err.flatten() });
      return;
    }
    const anyErr = err as { status?: number; shortMessage?: string; reason?: string; message?: string };
    const status = anyErr.status ?? 500;
    const message = anyErr.shortMessage ?? anyErr.reason ?? anyErr.message ?? "Internal error";
    res.status(status).json({ error: message });
  });

  return app;
}
