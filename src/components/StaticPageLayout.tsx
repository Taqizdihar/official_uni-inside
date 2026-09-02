import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';
import logoDarkTheme from '../assets/global/Logo - Dark Theme.svg';

type StaticPageLayoutProps = PropsWithChildren<{
  activePage: 'MEDIA KIT' | 'PRODUCTS' | 'SERVICES';
}>;

const navigation = [
  { label: 'ABOUT US', to: '/#about-us' },
  { label: 'OUR TEAM', to: '/#our-team' },
  { label: 'PRODUCTS', to: '/products' },
  { label: 'SERVICES', to: '/services' },
  { label: 'NEWS', to: '/news' },
  { label: 'ACHIEVEMENTS', to: '/#achievements' },
  { label: 'CONTACT US', to: '/#contact-us' },
] as const;

export const BackToLandingLink = () => (
  <Link
    to="/"
    className="group inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-[#202121] shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all hover:-translate-x-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mr-2 transition-transform group-hover:-translate-x-1">
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    Back to home
  </Link>
);

export const StaticPageLayout: React.FC<StaticPageLayoutProps> = ({ activePage, children }) => (
  <div className="relative z-50 flex min-h-screen w-screen max-w-screen min-w-0 flex-col overflow-x-hidden bg-[#f0f0f0]">
    <nav
      aria-label="Primary navigation"
      className="fixed top-0 left-0 z-[100] flex w-full items-center justify-between px-8 py-8 lg:px-12"
      style={{
        backgroundColor: 'rgba(32,33,33,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Link to="/" aria-label="Uni-Inside home" className="flex flex-shrink-0 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121]">
        <span className="relative flex h-[60px] w-[60px] items-center justify-center sm:h-[66px] sm:w-[66px]">
          <img src={logoDarkTheme} alt="Uni-Inside Logo" className="absolute inset-0 h-full w-full object-contain" />
        </span>
      </Link>

      <div className="hidden items-center gap-5 lg:flex xl:gap-8">
        {navigation.map((item) => {
          const isActive = activePage === item.label;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`rounded-sm text-[12px] font-[800] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] xl:text-[14px] ${
                isActive ? 'text-[#f9d02d]' : 'text-white hover:text-[#f9d02d]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <Link
        to="/media-kit"
        className={`hidden rounded-full px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider shadow-md transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121] sm:block ${
          activePage === 'MEDIA KIT' ? 'bg-white text-[#202121]' : 'bg-[#f9d02d] text-[#202121]'
        }`}
      >
        Media Kit
      </Link>
    </nav>

    <main id="main-content" tabIndex={-1} className="min-w-0 max-w-full flex-grow outline-none">
      {children}
    </main>

    <Footer />
  </div>
);
