import { describe, expect, test } from "vitest";
import request from "supertest";
import { UserModel } from "../../models/user.model.js";
import { getIntegrationApp } from "./harness.js";

describe("profile flow integration", () => {
  test("profile update, security endpoints and export", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Profile User",
      email: "profile@example.com",
      password: "StrongPass1!",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.accessToken as string;

    // Simulate a legacy user created before the status/deletedAt fields existed.
    await UserModel.updateOne(
      { email: "profile@example.com" },
      { $unset: { status: "", deletedAt: "" } },
    );

    const updateProfileRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Profile User Updated",
        currency: "usd",
        preferences: {
          themePalette: "ambar",
          hideAmountsByDefault: true,
        },
      });

    expect(updateProfileRes.status).toBe(200);
    expect(updateProfileRes.body.name).toBe("Profile User Updated");
    expect(updateProfileRes.body.currency).toBe("USD");
    expect(updateProfileRes.body.preferences.themePalette).toBe("amber");
    expect(updateProfileRes.body.preferences.hideAmountsByDefault).toBe(true);

    const persistedUser = await UserModel.findOne({ email: "profile@example.com" }).lean();
    expect(persistedUser?.profile?.currency).toBe("USD");
    expect(persistedUser?.preferences?.themePalette).toBe("amber");

    const wrongEmailRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "wrong", newEmail: "profile-new@example.com" });
    expect(wrongEmailRes.status).toBe(401);
    expect(wrongEmailRes.body.code).toBe("CURRENT_PASSWORD_INVALID");

    const updateEmailRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "StrongPass1!", newEmail: "profile-new@example.com" });
    expect(updateEmailRes.status).toBe(200);
    expect(updateEmailRes.body.email).toBe("profile-new@example.com");

    const wrongPasswordRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "wrong", newPassword: "StrongPass2!" });
    expect(wrongPasswordRes.status).toBe(401);

    const updatePasswordRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "StrongPass1!", newPassword: "StrongPass2!" });
    expect(updatePasswordRes.status).toBe(204);

    const loginRes = await request(getIntegrationApp()).post("/api/v1/auth/login").send({
      email: "profile-new@example.com",
      password: "StrongPass2!",
    });
    expect(loginRes.status).toBe(200);

    const secondToken = loginRes.body.accessToken as string;

    const sessionsRes = await request(getIntegrationApp())
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(sessionsRes.status).toBe(200);
    expect(Array.isArray(sessionsRes.body)).toBe(true);
    expect(sessionsRes.body.length).toBeGreaterThanOrEqual(2);

    const historicalSession = sessionsRes.body[1] ?? sessionsRes.body[0];
    const sid = historicalSession?.sid as string;
    expect(historicalSession?.jti).toBe(sid);
    const revokeOneRes = await request(getIntegrationApp())
      .delete(`/api/v1/auth/sessions/${sid}`)
      .set("Authorization", `Bearer ${secondToken}`);
    expect(revokeOneRes.status).toBe(204);

    const deleteRevokedRes = await request(getIntegrationApp())
      .delete(`/api/v1/auth/sessions/${sid}`)
      .set("Authorization", `Bearer ${secondToken}`);
    expect([204, 404]).toContain(deleteRevokedRes.status);

    const removeRevokedRes = await request(getIntegrationApp())
      .delete("/api/v1/auth/sessions/revoked")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(removeRevokedRes.status).toBe(204);

    const resetTutorialRes = await request(getIntegrationApp())
      .post("/api/v1/auth/tutorial/reset")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({});
    expect(resetTutorialRes.status).toBe(200);
    expect(resetTutorialRes.body.tutorialSeenAt).toBeNull();

    const exportRes = await request(getIntegrationApp())
      .get("/api/v1/auth/export")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.user).toBeDefined();
    expect(exportRes.body.personalAccount).toBeDefined();
    expect(Array.isArray(exportRes.body.sharedMemberships)).toBe(true);

    const revokeAllRes = await request(getIntegrationApp())
      .post("/api/v1/auth/sessions/revoke-all")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({});
    expect(revokeAllRes.status).toBe(204);
  });

  test("delete account blocks last owner and deactivates user", async () => {
    const ownerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Owner User",
      email: "owner-delete@example.com",
      password: "StrongPass1!",
    });
    const memberRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Member User",
      email: "member-delete@example.com",
      password: "StrongPass1!",
    });

    const ownerToken = ownerRes.body.accessToken as string;
    const memberToken = memberRes.body.accessToken as string;

    const sharedAccountRes = await request(getIntegrationApp())
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Shared Delete Test" });
    expect(sharedAccountRes.status).toBe(201);
    const sharedAccountId = sharedAccountRes.body.id as string;

    const inviteRes = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(inviteRes.status).toBe(200);

    const joinRes = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: inviteRes.body.code });
    expect(joinRes.status).toBe(200);

    const blockedDeleteRes = await request(getIntegrationApp())
      .delete("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ currentPassword: "StrongPass1!" });
    expect(blockedDeleteRes.status).toBe(422);
    expect(blockedDeleteRes.body.code).toBe("LAST_OWNER_CANNOT_DELETE_ACCOUNT");

    const promoteMemberRes = await request(getIntegrationApp())
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberRes.body.user.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "owner" });
    expect(promoteMemberRes.status).toBe(200);

    const deleteOkRes = await request(getIntegrationApp())
      .delete("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ currentPassword: "StrongPass1!" });
    expect(deleteOkRes.status).toBe(204);

    const meAfterDeleteRes = await request(getIntegrationApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(meAfterDeleteRes.status).toBe(401);
    expect(meAfterDeleteRes.body.code).toBe("SESSION_INVALID");
  });
});
