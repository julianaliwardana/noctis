import { db } from "@noctis/db";
import type { Category, Expense, Prisma } from "@noctis/db";
import type { CreateExpenseDto } from "./finance.dto";

export function findAllByUser(userId: string): Promise<Expense[]> {
  return db.expense.findMany({ where: { userId }, orderBy: { date: "desc" } });
}

export function findByUserInRange(userId: string, start: Date, end: Date): Promise<Expense[]> {
  return db.expense.findMany({ where: { userId, date: { gte: start, lt: end } } });
}

export function findById(id: string, userId: string): Promise<Expense | null> {
  return db.expense.findFirst({ where: { id, userId } });
}

export function create(userId: string, data: CreateExpenseDto): Promise<Expense> {
  return db.expense.create({ data: { ...data, userId } });
}

export function remove(id: string): Promise<Expense> {
  return db.expense.delete({ where: { id } });
}

export function findCategories(userId: string): Promise<Category[]> {
  return db.category.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export function findCategoryById(id: string, userId: string): Promise<Category | null> {
  return db.category.findFirst({ where: { id, userId } });
}

export function findCategoryByName(userId: string, name: string): Promise<Category | null> {
  return db.category.findFirst({ where: { userId, name } });
}

export function createCategory(userId: string, name: string, color: string): Promise<Category> {
  return db.category.create({ data: { userId, name, color } });
}

export function createCategories(userId: string, categories: { name: string; color: string }[]): Promise<unknown> {
  return db.category.createMany({
    data: categories.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}

export function updateCategory(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
  return db.category.update({ where: { id }, data });
}

export function renameCategory(id: string, userId: string, from: string, to: string): Promise<unknown> {
  return db.$transaction([
    db.category.update({ where: { id }, data: { name: to } }),
    db.expense.updateMany({ where: { userId, category: from }, data: { category: to } }),
  ]);
}

export function deleteCategory(id: string, userId: string, name: string, fallback: string): Promise<unknown> {
  return db.$transaction([
    db.expense.updateMany({ where: { userId, category: name }, data: { category: fallback } }),
    db.category.delete({ where: { id } }),
  ]);
}
