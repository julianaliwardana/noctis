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
  frequency: string;
  streak: number;
  createdAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: Date;
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
}

export interface Password {
  id: string;
  userId: string;
  siteName: string;
  siteUrl: string | null;
  username: string;
  ciphertext: string;
  iv: string;
  createdAt: Date;
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
