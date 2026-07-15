import React from 'react';
import { motion } from 'motion/react';

export const NewsHero: React.FC = () => {
  const textPopStyle = {
    color: '#ffffff',
    lineHeight: 0.9,
    textShadow: '5px 5px 0px #f9d02d, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
  };

  return (
    <div className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center bg-[#202121] overflow-hidden rounded-b-[4rem] sm:rounded-b-[6rem]">
      {/* Background Image with Overlay */}
      <motion.div 
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <img 
          src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2000&auto=format&fit=crop" 
          alt="News Hero Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202121] to-transparent opacity-80" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <h1 className="text-[70px] sm:text-[100px] lg:text-[130px] font-black uppercase tracking-tighter" style={textPopStyle}>
            NEWS
          </h1>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
          className="text-white/90 text-lg sm:text-2xl font-semibold max-w-2xl mt-4 tracking-wide"
        >
          Stories, updates, and insights from Uni-Inside.
        </motion.p>
      </div>
    </div>
  );
};
