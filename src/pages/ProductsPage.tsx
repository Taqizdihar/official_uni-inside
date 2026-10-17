import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import craftsLogo from '../assets/global/Uni-Inside Crafts.svg';
import {Link} from 'react-router-dom';
import {usePublicList} from '../public/client';

const productModules = import.meta.glob('../assets/our-products/3D Printer Products/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const products = Object.entries(productModules)
  .map(([path, image]) => {
    const filename = path.split('/').pop() ?? 'Product';
    const number = Number(filename.match(/\d+/)?.[0] ?? 0);
    return {
      id: filename,
      image,
      label: filename.replace('.png', ''),
      number,
    };
  })
  .sort((first, second) => first.number - second.number);

export const ProductsPage = () => {
  const {data,loading,error,retry}=usePublicList('products');
  const collection=data===null?products:data.map(item=>({id:String(item.id),image:item.image?.secure_url||'',label:item.name,slug:item.slug,width:item.image?.width_px||500,height:item.image?.height_px||500,description:item.short_description}));
  return (
  <StaticPageLayout activePage="PRODUCTS">
    <section className="bg-[#202121] px-6 pb-20 pt-40 text-white sm:px-10 sm:pb-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <BackToLandingLink />
        <div className="mt-16 flex flex-wrap items-center gap-4">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">Uni-Inside</p>
          <img src={craftsLogo} alt="Uni-Inside Craft" className="h-8 w-auto" />
        </div>
        <h1 className="mt-4 text-[clamp(56px,11vw,150px)] font-black leading-none tracking-tight">PRODUCTS</h1>
        <p className="mt-7 w-[calc(100vw-3rem)] max-w-2xl text-lg font-medium leading-relaxed text-white/80 sm:w-auto sm:text-2xl">
          <span className="block sm:inline">Discover our products,</span>{' '}
          <span className="block sm:inline">souvenirs, and more.</span>
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12 lg:py-28">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Current collection</p>
        <h2 className="mt-3 text-4xl font-black text-[#202121] sm:text-6xl">Product visuals</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collection.map((product, index) => (
          <article key={product.id} className="group min-w-0 overflow-hidden rounded-3xl bg-white shadow-[0_16px_36px_rgba(0,0,0,0.08)]">
            <div className="aspect-square overflow-hidden bg-[#e7e7e7]">
              <img
                src={product.image}
                alt={product.label}
                width={'width' in product?product.width:500}
                height={'height' in product?product.height:500}
                loading={index < 3 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105 sm:p-7"
              />
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="text-xl font-black text-[#202121]">{product.label}</h3>
              {'description' in product&&product.description&&<p className="mt-2 text-[#202121]/70">{product.description}</p>}
              {'slug' in product&&product.slug&&<Link to={`/products/${product.slug}`} className="mt-4 inline-block font-bold underline">View product</Link>}
            </div>
          </article>
        ))}
      </div>
      {data!==null&&data.length===0&&<p className="mt-6 text-[#202121]/70" role="status">No published products yet.</p>}
      {loading&&<p className="mt-6 text-[#202121]/60" role="status">Checking for latest products…</p>}{error&&<button className="mt-6 underline" onClick={retry}>Retry latest products</button>}
    </section>

    <section className="bg-white px-6 py-20 sm:px-10 lg:px-12 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] bg-[#202121] p-8 text-white sm:p-12 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">Uni-Inside Craft</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Want to know more about the current collection?</h2>
        </div>
        <a
          href="mailto:uninsidemed@gmail.com"
          className="inline-flex w-fit items-center justify-center rounded-full bg-[#f9d02d] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#202121] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121]"
        >
          Contact Uni-Inside
        </a>
      </div>
    </section>
  </StaticPageLayout>
);};
