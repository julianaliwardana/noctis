// Model interfaces — mirror packages/db/prisma/schema.prisma

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  dueAt: Date | null;
  completed: boolean;
  completedAt: Date | null;
  recurrence: string | null;
  createdAt: Date;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  note: string | null;
  daysOfWeek: number[];
  endDate: Date | null;
  color: string;
  streak: number;
  longestStreak: number;
  createdAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: Date;
  note: string | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: Date;
  source?: string | null;
  /** How it was paid when not straight from the bank account, e.g. "gopay". */
  paymentMethod?: string | null;
  /** The category is a guess until the user confirms it. */
  needsReview?: boolean;
}

/** Server-side shape of a vault entry: an opaque blob and its timestamps. */
export interface VaultItem {
  id: string;
  userId: string;
  ciphertext: string;
  iv: string;
  createdAt: Date;
  updatedAt: Date;
}

/** What the client needs to turn a master password back into the vault key. */
export interface VaultKeyMaterial {
  salt: string;
  iterations: number;
  wrappedKey: string;
  wrapIv: string;
}

/** The decrypted contents of a VaultItem's ciphertext. */
export interface VaultSecret {
  name: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}

export interface Nudge {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "task" | "habit" | "finance" | "focus";
  read: boolean;
  sentAt: Date;
}

export interface PushSubscription {
  id: string;
  userId: string;
  subscription: string;
}

// AI layer interfaces

export interface NudgeDecision {
  shouldNudge: boolean;
  title: string;
  message: string;
  type: "task" | "habit" | "finance" | "focus";
}

export interface LLMProvider {
  complete(system: string, user: string): Promise<string>;
}

export type NudgeSlot = "morning" | "midday" | "evening";

export interface AgentInput {
  userId: string;
  slot: NudgeSlot;
}
