import {
  CalendarClock,
  Image,
  Loader2,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import ArticlePage from "./Article/Article";
import ArticleCard from "./Article/ArticleCard";
import type { Article } from "./types";

type ArticleFormState = {
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  excerpt: string;
  content: string;
  imageUrl: string;
};

const getInitialTimestamp = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return now.toISOString().slice(0, 16);
};

const getArticleSlugFromPath = () => {
  const match = window.location.pathname.match(/^\/articles\/([^/]+)\/?$/);

  return match ? decodeURIComponent(match[1]) : "";
};

const emptyForm = (): ArticleFormState => ({
  title: "",
  category: "",
  author: "Site Editor",
  publishedAt: getInitialTimestamp(),
  excerpt: "",
  content: "",
  imageUrl: "",
});

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeSlug, setActiveSlug] = useState(getArticleSlugFromPath);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [form, setForm] = useState<ArticleFormState>(() => emptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isArticleLoading, setIsArticleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/articles")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load articles.");
        }

        return response.json() as Promise<{ articles: Article[] }>;
      })
      .then((data) => {
        if (isMounted) {
          setArticles(data.articles);
        }
      })
      .catch((error: Error) => {
        if (isMounted) {
          setMessage(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveSlug(getArticleSlugFromPath());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setActiveArticle(null);
      return;
    }

    const cachedArticle = articles.find((article) => article.slug === activeSlug);

    if (cachedArticle) {
      setActiveArticle(cachedArticle);
    }

    let isMounted = true;
    setIsArticleLoading(true);

    fetch(`/api/articles/${activeSlug}`)
      .then((response) => {
        if (response.status === 404) {
          throw new Error("Article not found.");
        }

        if (!response.ok) {
          throw new Error("Unable to load this article.");
        }

        return response.json() as Promise<{ article: Article }>;
      })
      .then((data) => {
        if (isMounted) {
          setActiveArticle(data.article);
        }
      })
      .catch((error: Error) => {
        if (isMounted) {
          setMessage(error.message);
          setActiveArticle(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsArticleLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSlug, articles]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(articles.flatMap((article) => article.categories.length > 0 ? article.categories : [article.category])),
      ),
    ],
    [articles],
  );

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "All" || article.categories.includes(selectedCategory);
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.excerpt.toLowerCase().includes(normalizedQuery) ||
      article.body.join(" ").toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  const navigateHome = () => {
    window.history.pushState({}, "", "/");
    setActiveSlug("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToArticle = (slug: string) => {
    window.history.pushState({}, "", `/articles/${encodeURIComponent(slug)}`);
    setActiveSlug(slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateForm = (field: keyof ArticleFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateForm("imageUrl", String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        article?: Article;
        error?: string;
      };

      if (!response.ok || !data.article) {
        throw new Error(data.error ?? "Unable to save this article.");
      }

      setArticles((current) => [data.article!, ...current]);
      setForm(emptyForm());
      setMessage("Article saved to the database.");
      navigateToArticle(data.article.slug);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this article.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeSlug) {
    return (
      <ArticlePage
        article={activeArticle}
        isLoading={isArticleLoading}
        message={message}
        onBack={navigateHome}
      />
    );
  }

  return (
    <main className="page-shell">
      <section className="intro">
        <div className="intro__copy">
          <div className="intro__eyebrow">
            <Sparkles size={18} aria-hidden="true" />
            Independent essays and useful notes
          </div>
          <h1>Field Notes Blog</h1>
          <p>
            Publish custom articles with timestamps and images. Each saved post is stored
            in SQLite and gets its own page.
          </p>
        </div>
      </section>

      <section className="composer" aria-labelledby="composer-title">
        <div>
          <div className="section-kicker">
            <PenLine size={17} aria-hidden="true" />
            New article
          </div>
          <h2 id="composer-title">Write a post</h2>
        </div>

        <form className="article-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>

          <div className="form-grid">
            <label>
              <span>Category</span>
              <input
                required
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
              />
            </label>

            <label>
              <span>Author</span>
              <input
                value={form.author}
                onChange={(event) => updateForm("author", event.target.value)}
              />
            </label>

            <label>
              <span>Timestamp</span>
              <input
                required
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => updateForm("publishedAt", event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Excerpt</span>
            <textarea
              required
              rows={3}
              value={form.excerpt}
              onChange={(event) => updateForm("excerpt", event.target.value)}
            />
          </label>

          <label>
            <span>Article body</span>
            <textarea
              required
              rows={9}
              value={form.content}
              placeholder="Separate paragraphs with a blank line."
              onChange={(event) => updateForm("content", event.target.value)}
            />
          </label>

          <div className="image-controls">
            <label>
              <span>Image URL</span>
              <input
                value={form.imageUrl}
                placeholder="https://..."
                onChange={(event) => updateForm("imageUrl", event.target.value)}
              />
            </label>

            <label className="file-input">
              <Image size={18} aria-hidden="true" />
              <span>Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {form.imageUrl ? (
            <img className="image-preview" src={form.imageUrl} alt="" />
          ) : null}

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} aria-hidden="true" />
                  Saving
                </>
              ) : (
                <>
                  <CalendarClock size={18} aria-hidden="true" />
                  Publish article
                </>
              )}
            </button>
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      </section>

      <section className="controls" aria-label="Article filters">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search articles</span>
          <input
            type="search"
            value={query}
            placeholder="Search articles"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="category-tabs" role="tablist" aria-label="Categories">
          {categories.map((category) => (
            <button
              key={category}
              className={category === selectedCategory ? "is-active" : ""}
              type="button"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="article-list" aria-label="Articles">
        {isLoading ? (
          <p className="empty-state">Loading articles...</p>
        ) : filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onOpen={navigateToArticle}
            />
          ))
        ) : (
          <p className="empty-state">
            No articles yet. Use the form above to publish the first one.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
