import React from 'react';
import { motion } from 'motion/react';
import { NewsArticle } from '../../data/mockNews';

interface NewsCardProps {
  article: NewsArticle;
  index: number;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article, index }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.15 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group cursor-pointer rounded-3xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col"
    >
      <div className="w-full h-56 overflow-hidden relative bg-gray-200">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
           {/* Fallback if image fails to load or while developing */}
           Image Placeholder
        </div>
        <img 
          src={article.thumbnail} 
          alt={article.title} 
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop`; // Fallback Unsplash image
          }}
          className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-700 ease-out" 
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm z-20">
          <span className="text-[#f9d02d] font-extrabold text-xs uppercase tracking-wider">{article.category}</span>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 gap-2">
          <span>{article.date}</span>
          <span>•</span>
          <span>{article.author}</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-[#202121] group-hover:text-[#f9d02d] transition-colors line-clamp-2 mb-3">
          {article.title}
        </h3>
        <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed mb-auto">
          {article.description}
        </p>
        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between text-[#202121] font-bold text-xs uppercase tracking-wider group-hover:text-[#f9d02d] transition-colors">
          <span className="flex items-center">
            Read Article
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
          <span className="text-gray-400 group-hover:text-gray-400">{article.readingTime}</span>
        </div>
      </div>
    </motion.div>
  );
};
