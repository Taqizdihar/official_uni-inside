import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import { servicesData } from '../data/services';

export const ServicesPage = () => (
  <StaticPageLayout activePage="SERVICES">
    <section className="bg-[#202121] px-6 pb-20 pt-40 text-white sm:px-10 sm:pb-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <BackToLandingLink />
        <p className="mt-16 text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">Our services</p>
        <h1 className="mt-4 text-[clamp(56px,11vw,150px)] font-black leading-none tracking-tight">SERVICES</h1>
        <p className="mt-7 w-[calc(100vw-3rem)] max-w-2xl text-lg font-medium leading-relaxed text-white/80 sm:w-auto sm:text-2xl">
          <span className="block sm:inline">Capture, Drone, and</span>{' '}
          <span className="block sm:inline">Code for your need.</span>
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12 lg:py-28">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {servicesData.map((service, index) => (
          <article key={service.id} className="group flex min-w-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e7e7]">
              <img
                src={service.img}
                alt={service.text}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105 sm:p-8"
              />
            </div>
            <div className="flex flex-grow flex-col p-7 sm:p-8">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/50">0{index + 1}</p>
              <h2 className="mt-3 text-4xl font-black text-[#202121]">{service.text}</h2>
              <p className="mt-4 text-lg leading-relaxed text-[#202121]/75">{service.text} for your need.</p>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="bg-[#f9d02d] px-6 py-20 sm:px-10 lg:px-12 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/70">Get in touch</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#202121] sm:text-6xl">Tell Uni-Inside what you are looking for.</h2>
        </div>
        <a
          href="mailto:uninsidemed@gmail.com"
          className="inline-flex w-fit items-center justify-center rounded-full bg-[#202121] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f9d02d]"
        >
          Contact Uni-Inside
        </a>
      </div>
    </section>
  </StaticPageLayout>
);
