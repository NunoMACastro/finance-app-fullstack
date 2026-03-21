import { describe, expect, test } from "vitest";
import request from "supertest";
import { AccountMembershipModel } from "../../models/account-membership.model.js";
import { AccountModel } from "../../models/account.model.js";
import { getIntegrationApp } from "./harness.js";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("accounts flow integration", () => {
  test("joining with an old invite code fails after rotation and the new code works", async () => {
    const ownerRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Invite Owner",
      email: "invite-owner@example.com",
      password: "StrongPass1!",
    });
    expect(ownerRegister.status).toBe(201);

    const memberRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Invite Member",
      email: "invite-member@example.com",
      password: "StrongPass1!",
    });
    expect(memberRegister.status).toBe(201);

    const ownerToken = ownerRegister.body.accessToken as string;
    const memberToken = memberRegister.body.accessToken as string;
    const memberUserId = memberRegister.body.user.id as string;

    const sharedAccountRes = await request(getIntegrationApp())
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Invite Race Test" });
    expect(sharedAccountRes.status).toBe(201);
    const sharedAccountId = sharedAccountRes.body.id as string;

    const firstInviteRes = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(firstInviteRes.status).toBe(200);
    const firstInviteCode = firstInviteRes.body.code as string;

    const rotatedInviteRes = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(rotatedInviteRes.status).toBe(200);
    const rotatedInviteCode = rotatedInviteRes.body.code as string;

    const staleJoinRes = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: firstInviteCode });
    expect(staleJoinRes.status).toBe(422);
    expect(staleJoinRes.body.code).toBe("INVITE_CODE_INVALID_OR_EXPIRED");

    const staleMembership = await AccountMembershipModel.findOne({
      accountId: sharedAccountId,
      userId: memberUserId,
    }).lean();
    expect(staleMembership).toBeNull();

    const freshJoinRes = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: rotatedInviteCode });
    expect(freshJoinRes.status).toBe(200);
    expect(freshJoinRes.body.role).toBe("viewer");
  });

  test("rejoining an inactive owner membership reconciles activeOwnerCount", async () => {
    const ownerRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner-rejoin@example.com",
      password: "StrongPass1!",
    });
    expect(ownerRegister.status).toBe(201);

    const memberRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Member",
      email: "member-rejoin@example.com",
      password: "StrongPass1!",
    });
    expect(memberRegister.status).toBe(201);

    const ownerToken = ownerRegister.body.accessToken as string;
    const memberToken = memberRegister.body.accessToken as string;
    const ownerUserId = ownerRegister.body.user.id as string;
    const memberUserId = memberRegister.body.user.id as string;

    const createShared = await request(getIntegrationApp())
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Rejoin Test" });

    expect(createShared.status).toBe(201);
    const sharedAccountId = createShared.body.id as string;

    const inviteRes = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(inviteRes.status).toBe(200);
    const inviteCode = inviteRes.body.code as string;

    const memberJoin = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: inviteCode });

    expect(memberJoin.status).toBe(200);
    expect(memberJoin.body.role).toBe("viewer");

    const promoteMember = await request(getIntegrationApp())
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberUserId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "owner" });

    expect(promoteMember.status).toBe(200);
    expect(promoteMember.body.role).toBe("owner");

    const ownerLeave = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(ownerLeave.status).toBe(204);

    const accountAfterLeave = await AccountModel.findById(sharedAccountId).lean();
    expect(accountAfterLeave?.activeOwnerCount).toBe(1);

    const ownerRejoin = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ code: inviteCode });

    expect(ownerRejoin.status).toBe(200);
    expect(ownerRejoin.body.role).toBe("owner");

    const ownerMembershipAfterRejoin = await AccountMembershipModel.findOne({
      accountId: sharedAccountId,
      userId: ownerUserId,
    }).lean();
    expect(ownerMembershipAfterRejoin?.status).toBe("active");
    expect(ownerMembershipAfterRejoin?.leftAt).toBeNull();
    expect(ownerMembershipAfterRejoin?.role).toBe("owner");

    const accountAfterRejoin = await AccountModel.findById(sharedAccountId).lean();
    expect(accountAfterRejoin?.activeOwnerCount).toBe(2);

    const memberLeave = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({});

    expect(memberLeave.status).toBe(204);

    const accountAfterMemberLeave = await AccountModel.findById(sharedAccountId).lean();
    expect(accountAfterMemberLeave?.activeOwnerCount).toBe(1);

    const lastOwnerLeaveBlocked = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(lastOwnerLeaveBlocked.status).toBe(422);
    expect(lastOwnerLeaveBlocked.body.code).toBe("LAST_OWNER_CANNOT_LEAVE");
  });

  test("shared account supports invite/join, role permissions and dataset isolation", async () => {
    const month = monthKeyFromNow();

    const ownerRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner@example.com",
      password: "StrongPass1!",
    });
    expect(ownerRegister.status).toBe(201);

    const memberRegister = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Member",
      email: "member@example.com",
      password: "StrongPass1!",
    });
    expect(memberRegister.status).toBe(201);

    const ownerToken = ownerRegister.body.accessToken as string;
    const memberToken = memberRegister.body.accessToken as string;
    const memberPersonalAccountId = memberRegister.body.user.personalAccountId as string;

    const createShared = await request(getIntegrationApp())
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Família Silva" });

    expect(createShared.status).toBe(201);
    const sharedAccountId = createShared.body.id as string;

    const inviteRes = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.code).toBeTypeOf("string");

    const joinRes = await request(getIntegrationApp())
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: inviteRes.body.code });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.role).toBe("viewer");

    const viewerWriteBlocked = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        totalBudget: 999,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 5 },
          { id: "cat_invest", name: "Investimento", percent: 15 },
          { id: "cat_poup", name: "Poupanca", percent: 20 },
        ],
      });

    expect(viewerWriteBlocked.status).toBe(403);
    expect(viewerWriteBlocked.body.code).toBe("ACCOUNT_ROLE_FORBIDDEN");

    const promoteEditor = await request(getIntegrationApp())
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberRegister.body.user.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "editor" });

    expect(promoteEditor.status).toBe(200);
    expect(promoteEditor.body.role).toBe("editor");

    const budgetRes = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        totalBudget: 999,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 5 },
          { id: "cat_invest", name: "Investimento", percent: 15 },
          { id: "cat_poup", name: "Poupanca", percent: 20 },
        ],
      });

    expect(budgetRes.status).toBe(200);
    expect(budgetRes.body.isReady).toBe(true);

    const incomeCategoriesRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId);

    expect(incomeCategoriesRes.status).toBe(200);
    const defaultIncomeCategoryId = incomeCategoriesRes.body[0]?.id as string | undefined;
    expect(defaultIncomeCategoryId).toMatch(/^[a-fA-F0-9]{24}$/);

    const incomeRes = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        month,
        date: `${month}-10`,
        type: "income",
        description: "Ordenado",
        amount: 1500,
        categoryId: defaultIncomeCategoryId,
      });

    expect(incomeRes.status).toBe(201);

    const sharedBudget = await request(getIntegrationApp())
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId);

    expect(sharedBudget.status).toBe(200);
    expect(sharedBudget.body.totalBudget).toBe(1500);
    expect(sharedBudget.body.categories.length).toBe(4);

    const personalBudget = await request(getIntegrationApp())
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", memberPersonalAccountId);

    expect(personalBudget.status).toBe(200);
    expect(personalBudget.body.totalBudget).toBe(0);
    expect(personalBudget.body.categories).toEqual([]);

    const ownerLeaveBlocked = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(ownerLeaveBlocked.status).toBe(422);
    expect(ownerLeaveBlocked.body.code).toBe("LAST_OWNER_CANNOT_LEAVE");

    const promoteOwner = await request(getIntegrationApp())
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberRegister.body.user.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "owner" });

    expect(promoteOwner.status).toBe(200);

    const ownerLeave = await request(getIntegrationApp())
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(ownerLeave.status).toBe(204);
  });
});
