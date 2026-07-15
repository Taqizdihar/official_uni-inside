import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Footer } from '../components/Footer';
import { NewsHero } from '../components/news/NewsHero';
import { CategoryFilter } from '../components/news/CategoryFilter';
import { NewsGrid } from '../components/news/NewsGrid';
import { NewsSidebar } from '../components/news/NewsSidebar';
import { LoadMoreButton } from '../components/news/LoadMoreButton';
import { mockNews } from '../data/mockNews';
import { Link, useLocation } from 'react-router-dom';
import logoDarkTheme from '../assets/global/Logo - Dark Theme.png';

export const NewsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const filteredNews = mockNews.filter(
    article => activeCategory === 'All' || article.category === activeCategory
  );

  const featuredNews = filteredNews.slice(0, visibleCount);
  const latestNews = mockNews.slice(0, 5); // Just taking the first 5 for the sidebar

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 4);
      setIsLoading(false);
    }, 800);
  };

  return (
    <motion.div 
      initial={{ y: '100%', opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full min-h-screen bg-[#f0f0f0] relative z-50 flex flex-col"
    >
      {/* Navbar (Static version for News Page) */}
      <nav 
        className="fixed top-0 left-0 w-full flex justify-between items-center px-8 lg:px-12 py-8 z-[100]"
        style={{
          backgroundColor: 'rgba(32,33,33,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
          <div className="relative w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] flex items-center justify-center">
            <img src={logoDarkTheme} alt="Uni-Inside Logo" className="absolute inset-0 w-full h-full object-contain" />
          </div>
        </Link>
        <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          {['ABOUT US', 'OUR TEAM', 'PRODUCTS', 'SERVICES', 'NEWS', 'ACHIEVEMENTS', 'CONTACT US'].map((link) => {
            const isHighlightActive = link === 'NEWS';
            return (
              <Link
                key={link}
                to={link === 'NEWS' ? '/news' : '/'}
                className={`text-[12px] xl:text-[14px] font-[800] uppercase tracking-[0.12em] cursor-pointer transition-colors ${
                  isHighlightActive ? '!text-[#f9d02d]' : 'text-white hover:!text-[#f9d02d]'
                }`}
              >
                {link}
              </Link>
            );
          })}
        </div>
        <div className="hidden sm:block">
          <button className="bg-[#f9d02d] text-[#202121] font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md cursor-pointer">
            Media Kit
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow pb-24">
        <NewsHero />
        
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-20">
          <CategoryFilter 
            activeCategory={activeCategory} 
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setVisibleCount(6);
            }} 
          />
          
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            <div className="w-full lg:w-2/3 flex flex-col">
              <NewsGrid articles={featuredNews} />
              
              {visibleCount < filteredNews.length && (
                <LoadMoreButton onClick={handleLoadMore} isLoading={isLoading} />
              )}
            </div>
            
            <div className="w-full lg:w-1/3">
              <div className="sticky top-40">
                <NewsSidebar articles={latestNews} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </motion.div>
  );
};
