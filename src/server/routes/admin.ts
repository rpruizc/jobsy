import { Router } from "express";
import { verifyAdminToken } from "../config.js";
import { createInvite } from "../invites.js";

export const adminRouter = Router();

// Mint a single-use invite code. Protected by the admin token (a Fly secret).
//   curl -X POST https://<app>/api/admin/invites \
//     -H "x-admin-token: $ADMIN_TOKEN" -H "content-type: application/json" \
//     -d '{"note":"for my son"}'
adminRouter.post("/invites", (req, res) => {
  if (!verifyAdminToken(req.get("x-admin-token"))) {
    res.status(403).json({ error: "Invalid admin token." });
    return;
  }
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 120) : null;
  const code = createInvite(note || null);
  res.json({ code, note });
});
