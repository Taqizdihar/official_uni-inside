import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { api, query } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Empty, Loading, Notice, Pagination } from '../components/Ui';
import { mediaUrl } from '../components/MediaPicker';
import { ProductModal } from './ProductModal';
import type { Photo } from './model';
import { uploadImage } from '../media/upload';

export function ProductMediaDialog({ current, used, onSelect, onClose, scope = 'products' }: {
  current: Photo | null;
  used: number[];
  onSelect: (photo: Photo) => void;
  onClose: () => void;
  scope?: 'products' | 'services' | 'news';
}) {
  const { has } = useAuth();
  const allowed = has('media.view');
  const noun = scope === 'services' ? 'Layanan' : scope === 'news' ? 'Artikel' : 'Produk';
  const [items, setItems] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(current);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);

  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    api<Photo[]>(`/admin/media?${query({ group:'postingan', page, limit: 12, search: debounced })}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setItems(result.data); setPages(result.meta?.totalPages ?? 0); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, scope, page, debounced, retry]);

  return <ProductModal title={`Pilih Foto ${noun}`} onClose={onClose} className="cms-product-media-modal">
    <p className="cms-product-muted">Media Library · Bagian Postingan</p>
    {!allowed ? <p role="alert">Anda tidak memiliki izin untuk melihat Media Library.</p> : <>
      <div className="cms-search-wrap"><Search size={17} /><input className="cms-search" aria-label={`Cari foto ${noun.toLowerCase()}`} placeholder="Cari nama foto" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>
      <div className="cms-product-media-results">{error ? <><Notice error={error} /><button type="button" className="cms-button secondary" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></> : loading ? <Loading /> : items.length ? <div className="cms-product-media-grid">{items.map(item => <button type="button" key={item.id} disabled={used.includes(item.id) && item.id !== current?.id} aria-pressed={selected?.id === item.id} aria-label={`Pilih ${item.original_filename || `foto ${item.id}`}`} onClick={() => setSelected(item)}><img src={mediaUrl(item.secure_url, 240)} alt="" loading="lazy" /><span>{item.original_filename || `Foto ${item.id}`}</span>{selected?.id === item.id && <Check size={19} />}</button>)}</div> : <Empty>Belum ada foto yang cocok di Bagian Postingan.</Empty>}<Pagination page={page} totalPages={pages} onChange={setPage} /></div>
      {has('media.upload')&&<div className="cms-field"><label>Unggah gambar baru<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={event=>setFile(event.target.files?.[0]??null)}/></label>{uploading&&<progress max={100} value={progress} aria-label="Progres unggahan"/>}<button type="button" className="cms-button secondary" disabled={!file||uploading} onClick={()=>{if(!file)return;setUploading(true);setError(null);void uploadImage(file,'postingan',scope,'','',setProgress,()=>{},api).then(media=>{setSelected(media as Photo);setRetry(value=>value+1);}).catch(setError).finally(()=>{setUploading(false);setProgress(0);});}}>{uploading?'Mengunggah…':'Unggah gambar'}</button></div>}
      <div className="cms-actions end"><button className="cms-button secondary" type="button" onClick={onClose}>Batal</button><button className="cms-button primary" type="button" disabled={!selected} onClick={() => { if (selected) onSelect(selected); }}>Gunakan gambar</button></div>
    </>}
  </ProductModal>;
}
