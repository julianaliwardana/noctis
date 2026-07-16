import { db } from "@noctis/db";
import type { Expense } from "@noctis/db";
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
