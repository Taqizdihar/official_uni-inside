import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Award, Star, Trophy, Medal } from 'lucide-react';

const achievements = [
  {
    id: 1,
    year: '2025',
    title: 'Best Creative Agency',
    organization: 'Awwwards',
    description: 'Recognized for outstanding digital experiences and immersive web designs.',
    icon: Trophy
  },
  {
    id: 2,
    year: '2024',
    title: 'Innovation in AI',
    organization: 'TechCrunch Disrupt',
    description: 'Awarded for pioneering AI-driven interfaces in web applications.',
    icon: Star
  },
  {
    id: 3,
    year: '2023',
    title: 'Excellence in Design',
    organization: 'Red Dot Design Award',
    description: 'Honored for clean, accessible, and user-centric UI/UX paradigms.',
    icon: Award
  },
  {
    id: 4,
    year: '2022',
    title: 'Top Developer Studio',
    organization: 'Google Play Awards',
    description: 'Voted top studio for high-performance and beautifully crafted apps.',
    icon: Medal
  }
];

export const AchievementsSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
  return (
    <div className="w-full flex flex-col items-center px-8 lg:px-24">
      <div className="mb-16 text-center z-20">
        <h2 className="text-[60px] sm:text-[90px] lg:text-[130px] font-black uppercase text-white leading-none tracking-tight drop-shadow-xl">
          ACHIEVEMENTS
        </h2>
        <p className="text-[20px] sm:text-[30px] text-[#f9d02d] font-medium mt-4">
          Celebrating our milestones and recognitions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl z-20">
        {achievements.map((achievement, idx) => {
          const Icon = achievement.icon;
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="group relative bg-[#2a2b2b] p-8 rounded-3xl overflow-hidden border border-white/5 hover:border-[#f9d02d]/30 transition-colors"
            >
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#f9d02d] rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[#f9d02d] font-bold text-xl mb-2">{achievement.year}</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                    {achievement.title}
                  </h3>
                  <p className="text-gray-400 font-medium mb-4">{achievement.organization}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl text-white group-hover:text-[#f9d02d] group-hover:scale-110 transition-all duration-300">
                  <Icon size={32} strokeWidth={2} />
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed">
                {achievement.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

AchievementsSection.displayName = 'AchievementsSection';
