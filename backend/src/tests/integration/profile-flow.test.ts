import { describe, expect, test } from "vitest";
import request from "supertest";
import { UserModel } from "../../models/user.model.js";
import { getIntegrationApp } from "./harness.js";

describe("profile flow integration", () => {
  test("profile update, security endpoints and export", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Profile User",
      email: "profile@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.tokens.accessToken as string;

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
        locale: "en-US",
        timezone: "America/New_York",
        preferences: {
          themePalette: "ambar",
          hideAmountsByDefault: true,
        },
      });

    expect(updateProfileRes.status).toBe(200);
    expect(updateProfileRes.body.name).toBe("Profile User Updated");
    expect(updateProfileRes.body.currency).toBe("USD");
    expect(updateProfileRes.body.locale).toBeUndefined();
    expect(updateProfileRes.body.timezone).toBeUndefined();
    expect(updateProfileRes.body.preferences.themePalette).toBe("amber");
    expect(updateProfileRes.body.preferences.hideAmountsByDefault).toBe(true);

    const persistedUser = await UserModel.findOne({ email: "profile@example.com" }).lean();
    expect(persistedUser?.profile?.currency).toBe("USD");
    expect((persistedUser?.profile as Record<string, unknown> | undefined)?.locale).toBeUndefined();
    expect((persistedUser?.profile as Record<string, unknown> | undefined)?.timezone).toBeUndefined();
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
      .send({ currentPassword: "123456", newEmail: "profile-new@example.com" });
    expect(updateEmailRes.status).toBe(200);
    expect(updateEmailRes.body.email).toBe("profile-new@example.com");

    const wrongPasswordRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "wrong", newPassword: "abcdef" });
    expect(wrongPasswordRes.status).toBe(401);

    const updatePasswordRes = await request(getIntegrationApp())
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "123456", newPassword: "abcdef" });
    expect(updatePasswordRes.status).toBe(204);

    const loginRes = await request(getIntegrationApp()).post("/api/v1/auth/login").send({
      email: "profile-new@example.com",
      password: "abcdef",
    });
    expect(loginRes.status).toBe(200);

    const secondToken = loginRes.body.tokens.accessToken as string;

    const sessionsRes = await request(getIntegrationApp())
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(sessionsRes.status).toBe(200);
    expect(Array.isArray(sessionsRes.body)).toBe(true);
    expect(sessionsRes.body.length).toBeGreaterThanOrEqual(2);

    const jti = sessionsRes.body[0]?.jti as string;
    const revokeOneRes = await request(getIntegrationApp())
      .delete(`/api/v1/auth/sessions/${jti}`)
      .set("Authorization", `Bearer ${secondToken}`);
    expect(revokeOneRes.status).toBe(204);

    const deleteRevokedRes = await request(getIntegrationApp())
      .delete(`/api/v1/auth/sessions/${jti}`)
      .set("Authorization", `Bearer ${secondToken}`);
    expect(deleteRevokedRes.status).toBe(204);

    const revokeAllRes = await request(getIntegrationApp())
      .post("/api/v1/auth/sessions/revoke-all")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({});
    expect(revokeAllRes.status).toBe(204);

    const removeRevokedRes = await request(getIntegrationApp())
      .delete("/api/v1/auth/sessions/revoked")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(removeRevokedRes.status).toBe(204);

    const sessionsAfterCleanupRes = await request(getIntegrationApp())
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${secondToken}`);
    expect(sessionsAfterCleanupRes.status).toBe(200);
    expect(sessionsAfterCleanupRes.body).toEqual([]);

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
  });

  test("delete account blocks last owner and deactivates user", async () => {
    const ownerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Owner User",
      email: "owner-delete@example.com",
      password: "123456",
    });
    const memberRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Member User",
      email: "member-delete@example.com",
      password: "123456",
    });

    const ownerToken = ownerRes.body.tokens.accessToken as string;
    const memberToken = memberRes.body.tokens.accessToken as string;

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
      .send({ currentPassword: "123456" });
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
      .send({ currentPassword: "123456" });
    expect(deleteOkRes.status).toBe(204);

    const meAfterDeleteRes = await request(getIntegrationApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(meAfterDeleteRes.status).toBe(401);
    expect(meAfterDeleteRes.body.code).toBe("ACCOUNT_DELETED");
  });
});
