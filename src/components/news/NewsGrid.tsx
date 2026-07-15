import React from 'react';
import { NewsArticle } from '../../data/mockNews';
import { NewsCard } from './NewsCard';
import { motion } from 'motion/react';

interface NewsGridProps {
  articles: NewsArticle[];
}

export const NewsGrid: React.FC<NewsGridProps> = ({ articles }) => {
  if (articles.length === 0) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center text-center">
        <h3 className="text-2xl font-bold text-gray-400 mb-2">No articles found</h3>
        <p className="text-gray-500">Try selecting a different category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
      {articles.map((article, idx) => (
        <NewsCard key={article.id} article={article} index={idx} />
      ))}
    </div>
  );
};
