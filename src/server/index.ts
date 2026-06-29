import "dotenv/config";
import cors from "cors";
import express from "express";
import { desc, eq } from "drizzle-orm";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../db";
import "../db/migrate";
import {
  articleCategories,
  articles,
  categories,
  users,
} from "../db/schema";
import type { Article } from "../types";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const distPath = resolve(process.cwd(), "dist");
const indexHtmlPath = resolve(distPath, "index.html");

app.use(cors());
app.use(express.json({ limit: "8mb" }));

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const formatDate = (value: string | null) => {
  if (!value) {
    return "Unpublished";
  }

  const normalizedValue = value.includes("T")
    ? value
    : `${value}T00:00:00.000Z`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const parseArticleBody = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.map(String) : [content];
  } catch {
    return [content];
  }
};

const normalizeBody = (content: string) =>
  content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const calculateReadTime = (paragraphs: string[]) => {
  const wordCount = paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));

  return `${minutes} min read`;
};

const getDefaultAuthor = async (name = "Site Editor") => {
  const email = "editor@example.com";
  const [author] = await db
    .insert(users)
    .values({
      name,
      email,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
        role: "admin",
      },
    })
    .returning();

  return author;
};

const buildUniqueSlug = async (title: string) => {
  const baseSlug = slugify(title) || `article-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await db.query.articles.findFirst({ where: eq(articles.slug, slug) })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const mapArticleRows = (rows: Array<{
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  readTime: string;
  publishedAt: string | null;
  authorName: string;
  categoryName: string | null;
}>) => {
  const byArticle = new Map<number, Article>();

  for (const row of rows) {
    const existing = byArticle.get(row.id);

    if (existing) {
      if (row.categoryName && !existing.categories.includes(row.categoryName)) {
        existing.categories.push(row.categoryName);
      }
      existing.category = existing.categories[0] ?? "Uncategorized";
      continue;
    }

    const categoryList = row.categoryName ? [row.categoryName] : [];
    byArticle.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: categoryList[0] ?? "Uncategorized",
      categories: categoryList,
      author: row.authorName,
      date: formatDate(row.publishedAt),
      publishedAt: row.publishedAt,
      readTime: row.readTime,
      excerpt: row.excerpt,
      body: parseArticleBody(row.content),
      imageUrl: row.imageUrl,
    });
  }

  return Array.from(byArticle.values());
};

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/articles", async (_request, response, next) => {
  try {
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        content: articles.content,
        imageUrl: articles.imageUrl,
        readTime: articles.readTime,
        publishedAt: articles.publishedAt,
        authorName: users.name,
        categoryName: categories.name,
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .leftJoin(articleCategories, eq(articleCategories.articleId, articles.id))
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt));

    response.json({ articles: mapArticleRows(rows) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/articles/:slug", async (request, response, next) => {
  try {
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        content: articles.content,
        imageUrl: articles.imageUrl,
        readTime: articles.readTime,
        publishedAt: articles.publishedAt,
        authorName: users.name,
        categoryName: categories.name,
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .leftJoin(articleCategories, eq(articleCategories.articleId, articles.id))
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(eq(articles.slug, request.params.slug));

    const [article] = mapArticleRows(rows);

    if (!article) {
      response.status(404).json({ error: "Article not found." });
      return;
    }

    response.json({ article });
  } catch (error) {
    next(error);
  }
});

app.post("/api/articles", async (request, response, next) => {
  try {
    const title = String(request.body.title ?? "").trim();
    const categoryName = String(request.body.category ?? "").trim();
    const excerpt = String(request.body.excerpt ?? "").trim();
    const content = String(request.body.content ?? "").trim();
    const authorName = String(request.body.author ?? "Site Editor").trim();
    const imageUrl = String(request.body.imageUrl ?? "").trim();
    const publishedAt = String(request.body.publishedAt ?? "").trim();

    if (!title || !categoryName || !excerpt || !content || !publishedAt) {
      response.status(400).json({
        error: "Title, category, excerpt, content, and timestamp are required.",
      });
      return;
    }

    const paragraphs = normalizeBody(content);
    const author = await getDefaultAuthor(authorName || "Site Editor");
    const slug = await buildUniqueSlug(title);
    const categorySlug = slugify(categoryName);

    const [category] = await db
      .insert(categories)
      .values({
        name: categoryName,
        slug: categorySlug,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: categoryName,
        },
      })
      .returning();

    const [article] = await db
      .insert(articles)
      .values({
        authorId: author.id,
        slug,
        title,
        excerpt,
        content: JSON.stringify(paragraphs),
        imageUrl: imageUrl || null,
        status: "published",
        readTime: calculateReadTime(paragraphs),
        publishedAt,
      })
      .returning();

    await db
      .insert(articleCategories)
      .values({
        articleId: article.id,
        categoryId: category.id,
      })
      .onConflictDoNothing();

    const [createdArticle] = mapArticleRows([
      {
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        imageUrl: article.imageUrl,
        readTime: article.readTime,
        publishedAt: article.publishedAt,
        authorName: author.name,
        categoryName: category.name,
      },
    ]);

    response.status(201).json({ article: createdArticle });
  } catch (error) {
    next(error);
  }
});

if (existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));

  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(indexHtmlPath);
  });
}

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    response.status(500).json({ error: "Something went wrong." });
  },
);

app.listen(port, () => {
  console.log(`Server listening on http://127.0.0.1:${port}`);
});
