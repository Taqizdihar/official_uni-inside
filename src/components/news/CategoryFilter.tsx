import React from 'react';
import { motion } from 'motion/react';
import { mockCategories } from '../../data/mockNews';

interface CategoryFilterProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ activeCategory, onSelectCategory }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="flex flex-wrap gap-2 mb-12"
    >
      {mockCategories.map((cat, idx) => {
        const isActive = activeCategory === cat;
        return (
          <motion.button
            key={cat}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + idx * 0.05 }}
            onClick={() => onSelectCategory(cat)}
            className={`relative px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wide transition-colors ${isActive ? 'text-[#202121]' : 'text-gray-500 hover:text-[#202121] bg-gray-100 hover:bg-gray-200'}`}
          >
            {isActive && (
              <motion.div 
                layoutId="activeCategory"
                className="absolute inset-0 bg-[#f9d02d] rounded-full z-0"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{cat}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};
