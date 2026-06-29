import { inArray } from "drizzle-orm";
import { db } from "./index";
import "./migrate";
import { articles, users } from "./schema";

const defaultArticleSlugs = [
  "designing-calm-digital-spaces",
  "why-small-notes-become-big-ideas",
  "a-better-morning-workflow",
  "building-trust-through-better-defaults",
];

await db
  .insert(users)
  .values({
    name: "Site Editor",
    email: "editor@example.com",
    role: "admin",
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: "Site Editor",
      role: "admin",
    },
  });

await db.delete(articles).where(inArray(articles.slug, defaultArticleSlugs));

console.log("Database ready: default demo articles removed from db/blog.db");
