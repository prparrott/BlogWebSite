import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Article } from "../types";

type ArticleCardProps = {
  article: Article;
  onOpen: (slug: string) => void;
};

export default function ArticleCard({ article, onOpen }: ArticleCardProps) {
  const href = `/articles/${encodeURIComponent(article.slug)}`;

  return (
    <article className="article-card">
      {article.imageUrl ? (
        <img className="article-card__image" src={article.imageUrl} alt="" />
      ) : null}

      <div className="article-card__summary">
        <span className="article-card__meta">
          <span>{article.category}</span>
          <span>{article.date}</span>
        </span>

        <a
          className="article-card__title-row"
          href={href}
          onClick={(event) => {
            event.preventDefault();
            onOpen(article.slug);
          }}
        >
          <span className="article-card__title">{article.title}</span>
          <span className="article-card__icon" aria-hidden="true">
            <ArrowUpRight size={22} />
          </span>
        </a>

        <p className="article-card__excerpt">{article.excerpt}</p>

        <span className="article-card__read-time">
          <Clock3 size={16} aria-hidden="true" />
          {article.readTime}
        </span>
      </div>
    </article>
  );
}
