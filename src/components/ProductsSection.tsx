import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import craftsLogo from '../assets/global/Uni-Inside Crafts.png';

export const OurProductsSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
  return (
    <div ref={ref} id="products" className="w-full min-h-[70vh] flex flex-col items-center justify-center relative z-10 px-8 pt-12 pb-24 scroll-mt-0">
      <motion.h2 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="text-[40px] sm:text-[70px] lg:text-[110px] font-black uppercase text-[#202121] leading-none text-center tracking-tight flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-4"
      >
        <span>OUR</span>
        <div className="flex items-center">
          <span>PRODU</span>
          <img src={craftsLogo} alt="C" className="h-[0.75em] w-auto object-contain mx-[0.02em]" />
          <span>TS</span>
        </div>
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-lg sm:text-xl lg:text-3xl text-[#202121] mt-8 text-center font-medium"
      >
        Discover our products, souvenirs, and more!
      </motion.p>
      <motion.button 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-12 bg-[#f9d02d] text-[#202121] font-extrabold text-lg sm:text-xl px-10 py-4 rounded-full hover:scale-105 transition-transform cursor-pointer shadow-lg"
      >
        Check our catalogue
      </motion.button>
    </div>
  );
});
OurProductsSection.displayName = 'OurProductsSection';
