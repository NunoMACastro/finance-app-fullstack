import { Types, type ClientSession } from "mongoose";
import { conflict, notFound, unprocessable } from "../../lib/api-error.js";
import { IncomeCategoryModel } from "../../models/income-category.model.js";

export const DEFAULT_INCOME_CATEGORY_NAME = "Outras receitas";

interface IncomeCategoryDto {
  id: string;
  accountId: string;
  name: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function toDto(doc: {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): IncomeCategoryDto {
  return {
    id: doc._id.toString(),
    accountId: doc.accountId.toString(),
    name: doc.name,
    active: doc.active,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function ensureCategoryName(name: string): { name: string; nameNormalized: string } {
  const cleanName = name.trim();
  if (!cleanName) {
    unprocessable("Nome da categoria de receita e obrigatorio", "INCOME_CATEGORY_NAME_REQUIRED");
  }

  return {
    name: cleanName,
    nameNormalized: normalizeName(cleanName),
  };
}

async function findIncomeCategoryOrThrow(accountId: string, incomeCategoryId: string) {
  if (!Types.ObjectId.isValid(incomeCategoryId)) {
    notFound("Categoria de receita nao encontrada", "INCOME_CATEGORY_NOT_FOUND");
  }

  const category = await IncomeCategoryModel.findOne({
    _id: incomeCategoryId,
    accountId,
  });

  if (!category) {
    notFound("Categoria de receita nao encontrada", "INCOME_CATEGORY_NOT_FOUND");
  }

  return category;
}

export async function ensureDefaultIncomeCategoryForAccount(
  accountId: string,
  session?: ClientSession,
): Promise<IncomeCategoryDto> {
  const query = IncomeCategoryModel.findOneAndUpdate(
    {
      accountId,
      isDefault: true,
    },
    {
      $setOnInsert: {
        accountId,
        name: DEFAULT_INCOME_CATEGORY_NAME,
        nameNormalized: normalizeName(DEFAULT_INCOME_CATEGORY_NAME),
        isDefault: true,
      },
      $set: {
        active: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  if (session) {
    query.session(session);
  }

  const category = await query;
  return toDto(category);
}

export async function listIncomeCategories(accountId: string): Promise<IncomeCategoryDto[]> {
  await ensureDefaultIncomeCategoryForAccount(accountId);

  const categories = await IncomeCategoryModel.find({ accountId }).sort({ isDefault: -1, active: -1, name: 1 });
  return categories.map(toDto);
}

export async function createIncomeCategory(accountId: string, input: { name: string }): Promise<IncomeCategoryDto> {
  const { name, nameNormalized } = ensureCategoryName(input.name);

  try {
    const category = await IncomeCategoryModel.create({
      accountId,
      name,
      nameNormalized,
      active: true,
      isDefault: false,
    });

    return toDto(category);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      conflict("Ja existe uma categoria de receita ativa com esse nome", "INCOME_CATEGORY_NAME_ALREADY_USED");
    }
    throw error;
  }
}

export async function updateIncomeCategory(
  accountId: string,
  incomeCategoryId: string,
  input: { name?: string; active?: boolean },
): Promise<IncomeCategoryDto> {
  const category = await findIncomeCategoryOrThrow(accountId, incomeCategoryId);

  if (category.isDefault && input.active === false) {
    unprocessable(
      "A categoria de receita default nao pode ser desativada",
      "INCOME_CATEGORY_DEFAULT_PROTECTED",
    );
  }

  if (input.name !== undefined) {
    const normalized = ensureCategoryName(input.name);
    category.name = normalized.name;
    category.nameNormalized = normalized.nameNormalized;
  }

  if (input.active !== undefined) {
    category.active = input.active;
  }

  try {
    await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      conflict("Ja existe uma categoria de receita ativa com esse nome", "INCOME_CATEGORY_NAME_ALREADY_USED");
    }
    throw error;
  }

  return toDto(category);
}

export async function softDeleteIncomeCategory(accountId: string, incomeCategoryId: string): Promise<void> {
  const category = await findIncomeCategoryOrThrow(accountId, incomeCategoryId);

  if (category.isDefault) {
    unprocessable(
      "A categoria de receita default nao pode ser removida",
      "INCOME_CATEGORY_DEFAULT_PROTECTED",
    );
  }

  category.active = false;
  await category.save();
}

export async function assertIncomeCategoryActive(accountId: string, incomeCategoryId?: string): Promise<void> {
  const cleanId = incomeCategoryId?.trim();
  if (!cleanId) {
    unprocessable("Categoria de receita obrigatoria", "INCOME_CATEGORY_REQUIRED");
  }

  if (!Types.ObjectId.isValid(cleanId)) {
    unprocessable("Categoria de receita nao encontrada", "INCOME_CATEGORY_NOT_FOUND");
  }

  const category = await IncomeCategoryModel.findOne({
    _id: cleanId,
    accountId,
  }).lean();

  if (!category) {
    unprocessable("Categoria de receita nao encontrada", "INCOME_CATEGORY_NOT_FOUND");
  }

  if (!category.active) {
    unprocessable("Categoria de receita inativa", "INCOME_CATEGORY_INACTIVE");
  }
}
