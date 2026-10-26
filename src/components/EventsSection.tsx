import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePublicContent } from '../public/client';
import {PublicCtaLink} from './PublicCtaLink';
import styles from './EventsSection.module.css';

export const EventsSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const {homepage,news}=usePublicContent();
  const section=homepage?.sections?.find(item=>item.section_key==='news'&&item.is_visible!==0);
  const selected=homepage?.featured?.news??news;
  const events=(selected??[]).slice(0,4).map(item=>({id:item.id,slug:item.slug,date:item.published_at?new Date(item.published_at).toLocaleDateString():'',title:String(item.title),description:String(item.excerpt||''),image:typeof item.image?.secure_url==='string'?item.image.secure_url:null}));

  return (
    <div className="w-full flex flex-col px-8 lg:px-24">
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <div className="flex w-fit items-center">
            <h2 className="text-[44px] sm:text-[70px] lg:text-[95px] font-black uppercase text-[#202121] leading-none tracking-tight">
              {section?.heading||'NEWS'}
            </h2>
            <span className={styles.slot}>
              <PublicCtaLink to={section?.primary_cta_url||'/news'} ariaLabel="See all news" className={styles.seeAll}>
                <span className={styles.label} aria-hidden="true">{section?.primary_cta_label||'SEE ALL'}</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m0 0-7-7m7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </PublicCtaLink>
            </span>
          </div>
          <p className="text-[18px] sm:text-[24px] text-gray-600 font-medium mt-2 sm:mt-3">
            {section?.description||'Catch up with our latest news and updates'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
        {events.map((evt, idx) => (
          <motion.div 
            key={evt.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: idx * 0.15 }}
            className="group rounded-2xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100"
          >
            <Link to={evt.slug?`/news/${encodeURIComponent(String(evt.slug))}`:'/news'} className="block h-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9d02d]">
            <div className="w-full h-36 sm:h-40 overflow-hidden relative">
              {evt.image ? <img src={evt.image} alt={evt.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="grid h-full w-full place-items-center bg-[#e8e8e4] text-xs font-semibold text-[#202121]/55">Story image unavailable</div>}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-sm">
                <span className="text-[#f9d02d] font-extrabold text-xs uppercase tracking-wider">{evt.date}</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-lg sm:text-xl font-bold text-[#202121] group-hover:text-[#f9d02d] transition-colors">{evt.title}</h3>
              <p className="text-gray-600 mt-1.5 sm:mt-2 line-clamp-2 text-xs sm:text-sm leading-relaxed">
                {evt.description}
              </p>
              <div className="mt-3 flex items-center text-[#202121] font-semibold text-xs sm:text-sm uppercase tracking-wider group-hover:text-[#f9d02d] transition-colors">
                Read More 
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {!selected&&<p role="status" className="text-[#202121]/70">Checking the latest stories…</p>}
      {selected?.length===0&&<p className="text-[#202121]/70">No news published yet.</p>}
    </div>
  );
});

EventsSection.displayName = 'EventsSection';
