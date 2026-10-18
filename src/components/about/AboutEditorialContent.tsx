import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { usePublicContent } from '../../public/client';

type Workspace = {
  number: string;
  label: string;
  name: string;
  category: string;
  description: string;
  keywords: string[];
};

type Principle = {
  number: string;
  title: string;
  description: string;
};

const WORKSPACES: Workspace[] = [
  {
    number: '01',
    label: 'SERVICE WORKSPACE',
    name: 'UNI-INSIDE STUDIO',
    category: 'VISUAL & DIGITAL SERVICES',
    description: 'The service workspace for photography, videography, drone documentation, editing, company profiles, research documentation, and creative digital solutions.',
    keywords: ['CAPTURE', 'DOCUMENT', 'EDIT', 'DELIVER'],
  },
  {
    number: '02',
    label: 'PRODUCT WORKSPACE',
    name: 'UNI-INSIDE CRAFT',
    category: '3D-PRINTED PRODUCTS',
    description: 'The product workspace for ready-made and custom 3D-printed objects, from functional everyday pieces to character models and original designs built from scratch.',
    keywords: ['DESIGN', 'PRINT', 'FINISH', 'MAKE'],
  },
];

const PRINCIPLES: Principle[] = [
  {
    number: '01',
    title: 'STAY CURIOUS.',
    description: 'We explore tools, materials, and perspectives before deciding how an idea should take shape.',
  },
  {
    number: '02',
    title: 'BUILD TOGETHER.',
    description: 'The strongest outcomes come from open collaboration across disciplines, roles, and communities.',
  },
  {
    number: '03',
    title: 'MAKE IT MATTER.',
    description: 'Every visual, system, or product should serve a clear purpose—not exist only to look good.',
  },
];

const RELATIONSHIPS = ['STARTUPS', 'ACADEMIC & RESEARCH TEAMS', 'COMMUNITY ORGANIZATIONS'];

const Reveal: React.FC<{
  animated: boolean;
  reduceMotion: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}> = ({ animated, reduceMotion, children, className, ariaLabel }) => {
  if (!animated || reduceMotion) {
    return <section className={className} aria-label={ariaLabel}>{children}</section>;
  }

  return (
    <motion.section
      className={className}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
};

const AboutEditorialMarkup: React.FC<{ animated: boolean; reduceMotion: boolean }> = ({ animated, reduceMotion }) => {
  const revealProps = { animated, reduceMotion };
  const { homepage } = usePublicContent();
  const workspaces = WORKSPACES.map((fallback,index)=>{const cms=homepage?.aboutWorkspaces?.find(item=>item.workspace_key===(index===0?'studio':'craft')&&item.is_visible!==0);return cms?{...fallback,name:cms.name||fallback.name,category:cms.short_label||fallback.category,description:cms.description||fallback.description}:fallback;});
  const principles = PRINCIPLES.map((fallback,index)=>{const cms=homepage?.aboutPrinciples?.find(item=>Number(item.slot)===index+1&&item.is_visible!==0);return cms?{...fallback,title:cms.title||fallback.title,description:cms.description||fallback.description}:fallback;});

  return (
    <div
      className="w-full text-[#202121]"
      aria-hidden={!animated || undefined}
      data-about-editorial-content={animated ? 'live' : 'presentation'}
    >
      <Reveal {...revealProps} className="w-full py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-center gap-4 sm:mb-14">
            <span className="h-[3px] w-10 bg-[#f9d02d] sm:w-14" aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm">ONE ECOSYSTEM</p>
          </div>
          <div className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-12">
            <h3 className="max-w-4xl text-[clamp(2.65rem,6.2vw,6rem)] font-black leading-[0.9] tracking-[-0.06em]">
              {homepage?.about?.workspaces_heading && String(homepage.about.workspaces_heading).length < 48 ? homepage.about.workspaces_heading : <>TWO WORKSPACES.<br />ONE SHARED PURPOSE.</>}
            </h3>
            <p className="max-w-md border-l-2 border-[#f9d02d] pl-5 text-lg leading-relaxed sm:text-xl">
              Different outputs, one way of working: curious, collaborative, and built around the idea.
            </p>
          </div>

          <div className="relative grid gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#202121] bg-[#f9d02d] lg:block" aria-hidden="true" />
            {workspaces.map((workspace, index) => (
              <article
                key={workspace.number}
                className={`relative flex min-h-[24rem] flex-col border-2 border-[#202121] p-6 sm:min-h-[27rem] sm:p-9 lg:p-11 ${index === 0 ? 'bg-[#202121] text-[#fffdf5]' : 'bg-[#fffdf5] text-[#202121]'}`}
              >
                <div className="flex items-start justify-between gap-4 border-b border-current/25 pb-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] sm:text-sm">
                    {workspace.number} / {workspace.label}
                  </p>
                  <span className="text-3xl font-black leading-none text-[#f9d02d]" aria-hidden="true">{workspace.number}</span>
                </div>
                <div className="my-auto py-8">
                  <p className={`mb-3 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] ${index === 0 ? 'text-[#f9d02d]' : 'text-[#806000]'}`}>{workspace.category}</p>
                  <h4 className="max-w-lg text-[clamp(1.8rem,3.8vw,3.4rem)] font-black leading-[0.95] tracking-[-0.045em]">{workspace.name}</h4>
                  <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg">{workspace.description}</p>
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-current/25 pt-5 text-[0.63rem] font-extrabold tracking-[0.13em] sm:gap-x-6 sm:text-xs" aria-label={`${workspace.name} process`}>
                  {workspace.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal {...revealProps} className="w-full py-20 sm:py-28 lg:py-32" ariaLabel="Vision and mission">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-center gap-4 sm:mb-14">
            <span className="h-[3px] w-10 bg-[#f9d02d] sm:w-14" aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm">VISION & MISSION</p>
          </div>
          <h3 className="sr-only">Vision and Mission</h3>
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
            <article className="relative flex min-h-[25rem] flex-col overflow-hidden border-2 border-[#202121] bg-[#202121] p-7 text-[#fffdf5] sm:min-h-[29rem] sm:p-10 lg:p-12">
              <span className="absolute -right-2 top-0 text-[clamp(7rem,20vw,16rem)] font-black leading-none text-white/[0.06]" aria-hidden="true">01</span>
              <p className="relative text-xs font-extrabold uppercase tracking-[0.18em] text-[#f9d02d]">01 / VISION</p>
              <div className="relative my-auto max-w-2xl py-10">
                <h4 className="text-[clamp(2rem,4.5vw,4rem)] font-black leading-[0.95] tracking-[-0.05em]">CREATIVITY AND TECHNOLOGY, MOVING TOGETHER.</h4>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">To shape meaningful experiences where creativity and technology move together—from digital stories to physical products.</p>
              </div>
              <span className="relative h-1 w-16 bg-[#f9d02d]" aria-hidden="true" />
            </article>
            <article className="relative flex min-h-[25rem] flex-col overflow-hidden border-2 border-[#202121] bg-[#f9d02d] p-7 text-[#202121] sm:min-h-[29rem] sm:p-10 lg:p-12">
              <span className="absolute -right-2 top-0 text-[clamp(7rem,20vw,16rem)] font-black leading-none text-[#202121]/[0.07]" aria-hidden="true">02</span>
              <p className="relative text-xs font-extrabold uppercase tracking-[0.18em]">02 / MISSION</p>
              <div className="relative my-auto py-10">
                <h4 className="max-w-lg text-[clamp(2rem,4.5vw,4rem)] font-black leading-[0.95] tracking-[-0.05em]">IDEAS DESERVE THE RIGHT FORM.</h4>
                <ul className="mt-7 space-y-3 border-t border-[#202121]/35 pt-6 text-base font-semibold leading-relaxed sm:text-lg">
                  <li>Collaborate across disciplines.</li>
                  <li>Translate ideas into thoughtful solutions.</li>
                  <li>Deliver visual, digital, and physical work with purpose and care.</li>
                </ul>
              </div>
              <span className="relative h-1 w-16 bg-[#202121]" aria-hidden="true" />
            </article>
          </div>
        </div>
      </Reveal>

      <Reveal {...revealProps} className="w-full py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-center gap-4 sm:mb-14">
            <span className="h-[3px] w-10 bg-[#f9d02d] sm:w-14" aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm">WHAT GUIDES US</p>
          </div>
          <h3 className="mb-12 max-w-4xl text-[clamp(2.8rem,6.5vw,6.2rem)] font-black leading-[0.9] tracking-[-0.065em] sm:mb-16">{homepage?.about?.principles_heading||'THE WAY WE MAKE MATTERS.'}</h3>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {principles.map((principle) => (
              <article
                key={principle.number}
                className={`min-w-0 border-t-2 border-[#202121] pt-6 ${animated && !reduceMotion ? 'group transition-transform duration-300 motion-safe:hover:-translate-y-1' : ''}`}
              >
                <span className={`inline-flex h-10 min-w-10 items-center justify-center border border-[#202121] px-2 text-sm font-black text-[#202121] ${animated && !reduceMotion ? 'group-hover:border-[#f9d02d] group-hover:bg-[#f9d02d]' : ''}`}>{principle.number}</span>
                <h4 className="mt-8 text-[clamp(1.55rem,2.5vw,2.3rem)] font-black leading-tight tracking-[-0.035em]">{principle.title}</h4>
                <p className="mt-4 max-w-sm text-base leading-relaxed sm:text-lg">{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal {...revealProps} className="w-full py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-center gap-4 sm:mb-14">
            <span className="h-[3px] w-10 bg-[#f9d02d] sm:w-14" aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm">CLIENTS & COLLABORATORS</p>
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.82fr] lg:gap-24">
            <h3 className="max-w-4xl text-[clamp(2.65rem,6vw,5.8rem)] font-black leading-[0.92] tracking-[-0.06em]">BUILT WITH PEOPLE WHO BRING DIFFERENT PROBLEMS TO THE TABLE.</h3>
            <div className="self-end">
              <p className="text-lg leading-relaxed sm:text-xl">Our collaborations span startups, university research teams, lecturers, and community organizations. Through lecturer-led research projects, we have also contributed CMS-based tools used by groups such as KWT.</p>
              <p className="mt-5 text-lg leading-relaxed sm:text-xl">Whether the outcome is a video, a digital system, or a printed object, each collaboration begins with listening and choosing the right way to build.</p>
            </div>
          </div>
          <ul className="mt-12 flex flex-wrap border-y-2 border-[#202121] sm:mt-16" aria-label="Collaboration groups">
            {RELATIONSHIPS.map((relationship, index) => (
              <li key={relationship} className={`flex min-h-16 flex-1 items-center py-4 text-xs font-extrabold tracking-[0.1em] sm:min-h-20 sm:text-sm ${index > 0 ? 'border-l border-[#202121]/30 pl-4 sm:pl-7' : 'pr-4'}`}>
                {relationship}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
};

const AnimatedAboutEditorialContent: React.FC = () => {
  const reduceMotion = useReducedMotion();
  return <AboutEditorialMarkup animated reduceMotion={Boolean(reduceMotion)} />;
};

export const AboutEditorialContent: React.FC<{ presentationOnly?: boolean }> = ({ presentationOnly = false }) => (
  presentationOnly ? <AboutEditorialMarkup animated={false} reduceMotion /> : <AnimatedAboutEditorialContent />
);
