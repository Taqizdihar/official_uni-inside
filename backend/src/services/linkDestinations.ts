// Keep this small public-route manifest in sync with src/main.tsx and App.tsx.
// Dynamic :slug routes are intentionally excluded until an eligible record is selected.
export const linkDestinations=[
  {label:'Halaman Utama',url:'/'},
  {label:'About Us',url:'/#about-us'},
  {label:'Products — Section Homepage',url:'/#products'},
  {label:'Services — Section Homepage',url:'/#services'},
  {label:'News — Section Homepage',url:'/#news'},
  {label:'Achievements',url:'/#achievements'},
  {label:'Contact Us',url:'/#contact-us'},
  {label:'Daftar Produk',url:'/products'},
  {label:'Daftar Layanan',url:'/services'},
  {label:'Daftar Artikel',url:'/news'},
  {label:'Proyek',url:'/projects'},
  {label:'Media Kit',url:'/media-kit'},
  {label:'Uni-Tools',url:'/tools'},
  {label:'Prompt Gallery',url:'/tools/prompt-gallery'},
] as const;
