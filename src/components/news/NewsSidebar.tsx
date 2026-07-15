import React from 'react';
import { motion } from 'motion/react';
import { NewsArticle } from '../../data/mockNews';

interface NewsSidebarProps {
  articles: NewsArticle[];
}

export const NewsSidebar: React.FC<NewsSidebarProps> = ({ articles }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8 }}
      className="w-full flex flex-col"
    >
      <h3 className="text-2xl font-black uppercase text-[#202121] mb-8 pb-4 border-b-4 border-[#202121] inline-block w-fit">
        Latest News
      </h3>
      <div className="flex flex-col gap-6">
        {articles.map((article, idx) => (
          <motion.div 
            key={article.id}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="flex gap-4 group cursor-pointer"
          >
            <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
              <img 
                src={article.thumbnail} 
                alt={article.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop`;
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[10px] font-extrabold text-[#f9d02d] uppercase tracking-widest mb-1.5">
                {article.category}
              </div>
              <h4 className="text-sm font-bold text-[#202121] group-hover:text-[#f9d02d] transition-colors line-clamp-2 mb-1.5 leading-snug">
                {article.title}
              </h4>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {article.date}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
