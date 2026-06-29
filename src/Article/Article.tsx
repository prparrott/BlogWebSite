import { ArrowLeft, Clock3 } from "lucide-react";
import type { Article } from "../types";

type ArticlePageProps = {
  article: Article | null;
  isLoading: boolean;
  message: string;
  onBack: () => void;
};

export default function ArticlePage({
  article,
  isLoading,
  message,
  onBack,
}: ArticlePageProps) {
  if (isLoading && !article) {
    return (
      <main className="page-shell">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to articles
        </button>
        <p className="empty-state">Loading article...</p>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="page-shell">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to articles
        </button>
        <p className="empty-state">{message || "Article not found."}</p>
      </main>
    );
  }

  return (
    <main className="page-shell article-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to articles
      </button>

      <article className="article-detail">
        <header className="article-detail__header">
          <div className="article-detail__meta">
            <span>{article.category}</span>
            <span>{article.date}</span>
            <span>
              <Clock3 size={16} aria-hidden="true" />
              {article.readTime}
            </span>
          </div>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <span className="article-detail__author">By {article.author}</span>
        </header>

        {article.imageUrl ? (
          <img className="article-detail__image" src={article.imageUrl} alt="" />
        ) : null}

        <div className="article-detail__body">
          {article.body.map((paragraph, index) => (
            <p key={`${article.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
