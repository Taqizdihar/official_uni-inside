import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import logoDarkTheme from '../assets/global/Logo - Dark Theme.svg';
import logoLightTheme from '../assets/global/Logo - Light Theme.svg';

const brandColors = [
  { value: '#202121', label: 'Studio black' },
  { value: '#f0f0f0', label: 'Canvas' },
  { value: '#f9d02d', label: 'Accent yellow' },
  { value: '#ffffff', label: 'White' },
] as const;

export const MediaKitPage = () => (
  <StaticPageLayout activePage="MEDIA KIT">
    <section className="relative overflow-hidden bg-[#202121] px-6 pb-20 pt-40 text-white sm:px-10 sm:pb-28 lg:px-12">
      <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#f9d02d]/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <BackToLandingLink />
        <p className="mt-16 text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">Uni-Inside Studio</p>
        <h1 className="mt-4 text-[clamp(56px,11vw,150px)] font-black leading-none tracking-tight">MEDIA KIT</h1>
        <p className="mt-7 w-[calc(100vw-3rem)] max-w-2xl text-lg font-medium leading-relaxed text-white/80 sm:w-auto sm:text-2xl">
          <span className="block sm:inline">A concise introduction to Uni-Inside,</span>{' '}
          <span className="block sm:inline">its current brand assets, and the visual system</span>{' '}
          <span className="block sm:inline">used across this site.</span>
        </p>
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-28">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Introduction</p>
        <h2 className="mt-3 max-w-full break-words text-4xl font-black leading-tight text-[#202121] sm:text-6xl">
          <span className="block sm:inline">Creative Inside,</span>{' '}
          <span className="block sm:inline">Impact Outside.</span>
        </h2>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#202121]/80 sm:text-xl">
          <span className="block sm:inline">Uni-Inside is a creative studio that focuses on creativity</span>{' '}
          <span className="block sm:inline">and dedicated collaboration to create wonderful piece of works.</span>
        </p>
        <a
          href="mailto:uninsidemed@gmail.com"
          className="mt-9 inline-flex rounded-full bg-[#f9d02d] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#202121] shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2"
        >
          Contact Uni-Inside
        </a>
      </div>

      <div className="flex min-h-80 items-center justify-center rounded-[2rem] bg-white p-12 shadow-[0_20px_50px_rgba(0,0,0,0.08)] sm:min-h-96">
        <img src={logoLightTheme} alt="Uni-Inside logo on a light background" width="1095" height="1095" className="h-52 w-52 max-w-full object-contain sm:h-64 sm:w-64" />
      </div>
    </section>

    <section className="bg-white px-6 py-20 sm:px-10 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Visual system</p>
        <h2 className="mt-3 text-4xl font-black text-[#202121] sm:text-6xl">Brand colors</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {brandColors.map((color) => (
            <div key={color.value} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <div className="h-36" style={{ backgroundColor: color.value }} aria-hidden="true" />
              <div className="p-5">
                <p className="text-sm font-bold uppercase tracking-wide text-[#202121]">{color.label}</p>
                <p className="mt-1 font-mono text-sm text-[#202121]/70">{color.value.toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:px-12 lg:py-28">
      <article>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Typography</p>
        <h2 className="mt-3 text-4xl font-black text-[#202121] sm:text-6xl">Poppins</h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#202121]/80">
          The site uses Poppins as its sans-serif typeface, with weights from regular through black to create its bold editorial hierarchy.
        </p>
      </article>
      <article>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Logo use</p>
        <h2 className="mt-3 text-4xl font-black text-[#202121] sm:text-6xl">Keep it clear.</h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#202121]/80">
          Use the supplied artwork without changing its proportions or colors, and keep the mark legible against a solid, high-contrast background.
        </p>
      </article>
    </section>

    <section className="bg-[#202121] px-6 py-20 text-white sm:px-10 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">Official logo files</p>
          <h2 className="mt-3 text-4xl font-black sm:text-6xl">Available brand assets</h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            These are the logo files currently used by the site. For other brand requests, contact Uni-Inside directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href={logoDarkTheme} download="uni-inside-logo-dark-theme.svg" className="inline-flex items-center justify-center rounded-full bg-[#f9d02d] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[#202121] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121]">
            Download dark logo
          </a>
          <a href={logoLightTheme} download="uni-inside-logo-light-theme.svg" className="inline-flex items-center justify-center rounded-full border-2 border-white px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-[#202121] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121]">
            Download light logo
          </a>
        </div>
      </div>
    </section>
  </StaticPageLayout>
);
