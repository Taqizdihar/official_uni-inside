import React from 'react';
import { motion } from 'motion/react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ onClick, isLoading }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full flex justify-center mt-16 mb-20"
    >
      <button 
        onClick={onClick}
        disabled={isLoading}
        className="group relative bg-[#202121] text-white font-bold text-sm px-10 py-4 rounded-full uppercase tracking-widest overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <span className="relative z-10 flex items-center gap-3">
          {isLoading ? 'Loading...' : 'Load More'}
          {!isLoading && (
            <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </span>
        <div className="absolute inset-0 bg-[#f9d02d] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
        <span className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-[#202121] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
          Load More
          <svg className="w-5 h-5 translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </span>
      </button>
    </motion.div>
  );
};
