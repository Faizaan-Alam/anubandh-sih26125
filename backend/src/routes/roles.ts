import { Router } from "express";
import { grantRoleSchema, revokeRoleSchema } from "@anubandh/shared";
import { requireAuth, requireRoles } from "../auth";
import { connected, getChain, onChainRole, ROLE_IDS, signerFor } from "../chain";

export const rolesRouter = Router();

rolesRouter.get("/:address", async (req, res, next) => {
  try {
    const address = req.params.address;
    const role = await onChainRole(address);
    const { roleManager } = getChain();
    const expiry = {
      Admin: Number(await roleManager.roleExpiry(address, ROLE_IDS.Admin)),
      Manager: Number(await roleManager.roleExpiry(address, ROLE_IDS.Manager)),
      Auditor: Number(await roleManager.roleExpiry(address, ROLE_IDS.Auditor)),
      User: Number(await roleManager.roleExpiry(address, ROLE_IDS.User))
    };
    res.json({
      address,
      role,
      roleSource: "RoleManager.hasActiveRole (fresh on-chain check)",
      expiry
    });
  } catch (err) {
    next(err);
  }
});

rolesRouter.post("/grant", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = grantRoleSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { roleManager } = getChain();
    const roleId = ROLE_IDS[body.role];
    const tx =
      body.expiry && body.expiry > 0
        ? await connected(roleManager, wallet).grantRoleWithExpiry(roleId, body.account, body.expiry)
        : await connected(roleManager, wallet).grantRole(roleId, body.account);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, account: body.account, role: body.role });
  } catch (err) {
    next(err);
  }
});

rolesRouter.post("/revoke", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = revokeRoleSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { roleManager } = getChain();
    const tx = await connected(roleManager, wallet).revokeRole(ROLE_IDS[body.role], body.account);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, account: body.account, role: body.role, revoked: true });
  } catch (err) {
    next(err);
  }
});
