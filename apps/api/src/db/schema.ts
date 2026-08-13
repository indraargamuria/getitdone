import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const lists = sqliteTable(
  "lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#5B6EE8"),
    icon: text("icon"),
    parentId: text("parent_id").references((): AnySQLiteColumn => lists.id, {
      onDelete: "set null",
    }),
    sortOrder: real("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("lists_user_idx").on(t.userId)],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#5B6EE8"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("tags_user_idx").on(t.userId)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    listId: text("list_id").references(() => lists.id, { onDelete: "set null" }),
    priority: integer("priority").notNull().default(4),
    dueDate: text("due_date"),
    dueTime: text("due_time"),
    completedAt: text("completed_at"),
    assignee: text("assignee"),
    recurrence: text("recurrence"),
    sortOrder: real("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("tasks_user_idx").on(t.userId),
    index("tasks_due_idx").on(t.dueDate),
    index("tasks_list_idx").on(t.listId),
    index("tasks_completed_idx").on(t.completedAt),
  ],
);

export const subtasks = sqliteTable(
  "subtasks",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completedAt: text("completed_at"),
    sortOrder: real("sort_order").notNull().default(0),
  },
  (t) => [index("subtasks_task_idx").on(t.taskId)],
);

export const taskTags = sqliteTable(
  "task_tags",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] }), index("task_tags_tag_idx").on(t.tagId)],
);

export type UserRow = typeof users.$inferSelect;
export type ListRow = typeof lists.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type SubtaskRow = typeof subtasks.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
