import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Link, useBeforeUnload, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Grip, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { api, type ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { mediaUrl } from '../components/MediaPicker';
import { ProductMediaDialog } from '../products/ProductMediaDialog';
import type { Photo } from '../products/model';
import { Loading, Notice } from '../components/Ui';
import { setEditorDirty } from '../dirty';
import { servicePreviewPrice, type ServicePricing } from '../services/serviceForm';
import { safeRichHtml } from '../../utils/safeRichHtml';
import './service-create.css';

const RichEditor = lazy(() => import('../components/RichEditor'));
type ServiceItem = { key: number; item_type: 'deliverable' | 'included' | 'requirement' | 'not_included'; label: string };
type ServiceStep = { key: number; title: string; description: string };
type Category = { id: number; name: string };
const itemTypes: [ServiceItem['item_type'], string][] = [
  ['deliverable', 'Hasil yang Diterima'], ['included', 'Termasuk dalam Layanan'],
  ['requirement', 'Kebutuhan dari Klien'], ['not_included', 'Tidak Termasuk'],
];
const currencies = ['IDR', 'USD', 'SGD', 'EUR', 'AUD', 'MYR'];
const emptyImages = (): (Photo | null)[] => Array.from({ length: 9 }, () => null);

export function ServiceCreatePage() {
  const { has } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<unknown>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<(Photo | null)[]>(emptyImages);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pricing, setPricing] = useState<ServicePricing>({ pricing_type: 'contact', starting_price: null, currency_code: 'IDR', price_note: '' });
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [steps, setSteps] = useState<ServiceStep[]>([]);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewCanExpand, setPreviewCanExpand] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nextKey = useRef(0);
  const drag = useRef<{ index: number; x: number; y: number } | null>(null);
  const saving = useRef(false);
  const descriptionPreview = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const all: Category[] = [];
        let page = 1, pages = 1;
        do {
          const result = await api<Category[]>(`/admin/service-categories?page=${page}&limit=100&isActive=true`, { signal: controller.signal });
          all.push(...result.data);
          pages = result.meta?.totalPages ?? 1;
          page += 1;
        } while (page <= pages && !controller.signal.aborted);
        if (!controller.signal.aborted) setCategories(all);
      } catch (cause) { if (!controller.signal.aborted) setCategoryError(cause); }
      finally { if (!controller.signal.aborted) setCategoriesLoading(false); }
    })();
    return () => controller.abort();
  }, []);
  useEffect(() => { setEditorDirty(dirty); return () => setEditorDirty(false); }, [dirty]);
  useEffect(() => {
    const element = descriptionPreview.current;
    if (!element) return;
    const measure = () => setPreviewCanExpand(element.scrollHeight > 112);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.firstElementChild ?? element);
    return () => observer.disconnect();
  }, [description]);
  useBeforeUnload(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  if (!has('services.view') || !has('services.create')) return <div className="cms-notice cms-notice-error">Anda tidak memiliki izin untuk membuat layanan.</div>;
  const change = (setter: () => void) => { setter(); setDirty(true); };
  const setImage = (index: number, image: Photo | null) => change(() => setImages(previous => {
    const next = [...previous];
    next[index] = image; return next;
  }));
  const swapImages = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to || !images[from]) return;
    change(() => setImages(previous => { const next = [...previous]; [next[from], next[to]] = [next[to], next[from]]; return next; }));
    setPreviewIndex(0);
  };
  const moveList = <T,>(list: T[], setList: (list: T[]) => void, from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list]; next.splice(to, 0, ...next.splice(from, 1)); change(() => setList(next));
  };
  const dragStart = (event: PointerEvent<HTMLButtonElement>, index: number) => { drag.current = { index, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const dragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current; drag.current = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-service-slot]');
    if (target) swapImages(start.index, Number(target.dataset.serviceSlot));
  };
  const addItem = () => change(() => setItems(previous => [...previous, { key: ++nextKey.current, item_type: 'deliverable', label: '' }]));
  const addStep = () => change(() => setSteps(previous => [...previous, { key: ++nextKey.current, title: '', description: '' }]));
  const updateItem = (key: number, patch: Partial<ServiceItem>) => change(() => setItems(previous => previous.map(item => item.key === key ? { ...item, ...patch } : item)));
  const updateStep = (key: number, patch: Partial<ServiceStep>) => change(() => setSteps(previous => previous.map(step => step.key === key ? { ...step, ...patch } : step)));
  const chosenImages = images.filter((image): image is Photo => Boolean(image));
  const previewImage = chosenImages[previewIndex % Math.max(1, chosenImages.length)];
  const previewPrice = servicePreviewPrice({ ...pricing, starting_price: amount.trim() ? Number(amount) : null });
  const renderedDescription = safeRichHtml(description);

  async function save(status: 'draft' | 'published') {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(null); setErrors({});
    const payload = {
      name: name.trim(), category_id: categoryId ? Number(categoryId) : null,
      description, cover_media_id: images[0]?.id ?? null,
      gallery_media_ids: images.slice(1).filter((image): image is Photo => Boolean(image)).map(image => image.id),
      ...pricing, starting_price: amount.trim() ? Number(amount) : null,
      estimated_duration: duration.trim(),
      items: items.filter(item => item.label.trim()).map(({ item_type, label }) => ({ item_type, label: label.trim() })),
      process_steps: steps.filter(step => step.title.trim() || step.description.trim()).map(({ title, description: detail }) => ({ title: title.trim(), description: detail.trim() })),
      primary_cta_label: ctaLabel.trim(), primary_cta_url: ctaUrl.trim(), status,
    };
    try {
      const created = await api<{ id: number; status: string }>('/admin/services/create-complete', { method: 'POST', body: JSON.stringify(payload) });
      if (!Number.isSafeInteger(created.data?.id) || created.data.id <= 0 || created.data.status !== status) throw new Error('Server belum mengonfirmasi hasil penyimpanan. Periksa daftar layanan sebelum mencoba lagi.');
      setDirty(false); setEditorDirty(false);
      navigate(`/admin/content/services/${created.data.id}`, { replace: true });
    } catch (cause) {
      setError(cause);
      const details = (cause as ApiError).details ?? [];
      setErrors(Object.fromEntries(details.filter(detail => detail.path).map(detail => [detail.path!, detail.message ?? 'Nilai tidak valid.'])));
    } finally { saving.current = false; setBusy(false); }
  }
  const fieldError = (key: string) => errors[key] && <small className="cms-field-error" role="alert">{errors[key]}</small>;

  return <div className="cms-page cms-service-create">
    <div className="cms-page-head"><div><Link className="cms-back-link" to="/admin/content/services"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke Jasa/Layanan</Link><h1>Tambah Layanan</h1><p>Susun informasi layanan, lalu simpan sebagai draf atau terbitkan.</p></div></div>
    <Notice error={categoryError} />
    <Notice error={error} />
    <div className="cms-service-layout"><form id="cms-service-form" className="cms-service-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save('draft'); }}>
      <section className="cms-card"><h2>Informasi Utama</h2><p className="cms-service-card-help">Pilih visual layanan dan jelaskan apa yang akan Anda kerjakan.</p>
        <div className="cms-service-images"><div className="cms-service-cover" data-service-slot="0"><button type="button" className="cms-service-tile" onClick={() => setPickerIndex(0)} aria-label={images[0] ? 'Ganti gambar utama' : 'Pilih gambar utama'}>{images[0] ? <img src={mediaUrl(images[0].secure_url, 640)} alt={images[0].alt_text || 'Gambar utama terpilih'} /> : <><ImagePlus size={38} aria-hidden="true" /><strong>Tambah Foto Utama</strong><span>Gambar sampul layanan</span></>}</button>{images[0] && <div className="cms-service-tile-actions"><button type="button" onClick={() => setImage(0, null)} aria-label="Hapus gambar utama"><X size={15} /></button><button type="button" className="cms-service-grip" onPointerDown={event => dragStart(event, 0)} onPointerUp={dragEnd} aria-label="Geser gambar utama untuk menukar posisi"><Grip size={16} /></button></div>}</div>
          <div className="cms-service-gallery"><div className="cms-service-gallery-heading"><strong>Gambar Galeri/Layanan</strong><span>({images.slice(1).filter(Boolean).length}/8)</span></div><div className="cms-service-gallery-grid">{images.slice(1).map((image, offset) => { const index = offset + 1; return <div className="cms-service-gallery-slot" data-service-slot={index} key={index}><button type="button" className="cms-service-tile" onClick={() => setPickerIndex(index)} aria-label={image ? `Ganti gambar galeri ${index}` : `Pilih gambar galeri ${index}`}>{image ? <img src={mediaUrl(image.secure_url, 320)} alt={image.alt_text || `Gambar galeri ${index}`} /> : <ImagePlus size={24} aria-hidden="true" />}</button>{image && <div className="cms-service-tile-actions"><button type="button" onClick={() => setImage(index, null)} aria-label={`Hapus gambar galeri ${index}`}><X size={14} /></button><button type="button" onClick={() => swapImages(index, 0)} aria-label={`Jadikan gambar galeri ${index} sebagai gambar utama`}><ArrowUp size={14} /></button><button type="button" onClick={() => swapImages(index, index - 1)} disabled={index === 1} aria-label={`Geser gambar galeri ${index} ke kiri`}><ArrowLeft size={14} /></button><button type="button" onClick={() => swapImages(index, index + 1)} disabled={index === 8} aria-label={`Geser gambar galeri ${index} ke kanan`}><ArrowRight size={14} /></button><button type="button" className="cms-service-grip" onPointerDown={event => dragStart(event, index)} onPointerUp={dragEnd} aria-label={`Seret gambar galeri ${index}`}><Grip size={14} /></button></div>}</div>; })}</div></div></div>
        {fieldError('cover_media_id')}{fieldError('gallery_media_ids')}
        <div className="cms-service-two"><div className="cms-field"><label>Nama Layanan<input value={name} maxLength={190} onChange={event => change(() => setName(event.target.value))} aria-invalid={Boolean(errors.name)} placeholder="Contoh: Produksi Video Brand" /></label>{fieldError('name')}</div><div className="cms-field"><label>Kategori<select value={categoryId} disabled={categoriesLoading} onChange={event => change(() => setCategoryId(event.target.value))} aria-invalid={Boolean(errors.category_id)}><option value="">{categoriesLoading ? 'Memuat kategori…' : 'Pilih kategori'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>{fieldError('category_id')}</div></div>
        <Suspense fallback={<Loading />}><RichEditor label="Deskripsi Lengkap" value={description} onChange={value => change(() => setDescription(value))} underline /></Suspense>{fieldError('description')}
      </section>
      <section className="cms-card"><h2>Harga &amp; Estimasi</h2><p className="cms-service-card-help">Jelaskan harga dan perkiraan waktu tanpa menjanjikan angka yang belum pasti.</p><div className="cms-service-three"><div className="cms-field"><label>Model Harga<select value={pricing.pricing_type} onChange={event => change(() => setPricing(previous => ({ ...previous, pricing_type: event.target.value as ServicePricing['pricing_type'] })))}><option value="contact">Hubungi Kami</option><option value="fixed">Harga Tetap</option><option value="starting_from">Mulai dari</option><option value="range">Rentang Harga</option></select></label></div><div className="cms-field"><label>Harga Awal<input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={event => change(() => setAmount(event.target.value))} aria-invalid={Boolean(errors.starting_price)} placeholder="0" /></label>{fieldError('starting_price')}</div><div className="cms-field"><label>Mata Uang<select value={pricing.currency_code} onChange={event => change(() => setPricing(previous => ({ ...previous, currency_code: event.target.value })))}>{currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label></div></div><div className="cms-service-two"><div className="cms-field"><label>Catatan Harga<textarea rows={3} maxLength={255} value={pricing.price_note} onChange={event => change(() => setPricing(previous => ({ ...previous, price_note: event.target.value })))} placeholder={pricing.pricing_type === 'range' ? 'Jelaskan batas atau lingkup rentang harga' : 'Keterangan harga untuk pengunjung'} aria-invalid={Boolean(errors.price_note)} /></label>{fieldError('price_note')}</div><div className="cms-field"><label>Estimasi Durasi<input value={duration} maxLength={255} onChange={event => change(() => setDuration(event.target.value))} placeholder="Contoh: 2–4 minggu" /></label></div></div></section>
      <section className="cms-card"><h2>Informasi Layanan</h2><p className="cms-service-card-help">Tambahkan hasil, cakupan, kebutuhan klien, atau hal yang tidak termasuk.</p>{items.length === 0 && <p className="cms-service-empty">Belum ada informasi layanan.</p>}{items.map((item, index) => <div className="cms-service-repeat" key={item.key}><div className="cms-service-repeat-fields"><div className="cms-field"><label>Jenis Informasi Layanan<select value={item.item_type} onChange={event => updateItem(item.key, { item_type: event.target.value as ServiceItem['item_type'] })}>{itemTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="cms-field"><label>Isi Informasi Layanan<input value={item.label} maxLength={500} onChange={event => updateItem(item.key, { label: event.target.value })} placeholder="Tulis satu informasi singkat" aria-invalid={Boolean(errors[`items.${index}.label`])} /></label>{fieldError(`items.${index}.label`)}</div></div><div className="cms-service-repeat-actions"><button type="button" onClick={() => moveList(items, setItems, index, index - 1)} disabled={index === 0} aria-label={`Naikkan informasi ${index + 1}`}><ArrowUp size={17} /></button><button type="button" onClick={() => moveList(items, setItems, index, index + 1)} disabled={index === items.length - 1} aria-label={`Turunkan informasi ${index + 1}`}><ArrowDown size={17} /></button><button type="button" onClick={() => change(() => setItems(previous => previous.filter(current => current.key !== item.key)))} aria-label={`Hapus informasi ${index + 1}`}><Trash2 size={17} /></button></div></div>)}<button type="button" className="cms-button primary cms-service-add" onClick={addItem}><Plus size={17} /> Tambah Informasi</button></section>
      <section className="cms-card"><h2>Langkah Pengerjaan</h2><p className="cms-service-card-help">Nomor langkah mengikuti urutan yang Anda atur.</p>{steps.length === 0 && <p className="cms-service-empty">Belum ada langkah pengerjaan.</p>}{steps.map((step, index) => <div className="cms-service-repeat cms-service-step" key={step.key}><div className="cms-service-step-number">{String(index + 1).padStart(2, '0')}</div><div className="cms-service-step-fields"><div className="cms-field"><label>Judul Langkah<input value={step.title} maxLength={150} onChange={event => updateStep(step.key, { title: event.target.value })} placeholder="Contoh: Memahami kebutuhan" aria-invalid={Boolean(errors[`process_steps.${index}.title`])} /></label>{fieldError(`process_steps.${index}.title`)}</div><div className="cms-field"><label>Deskripsi Langkah<textarea rows={3} maxLength={1000} value={step.description} onChange={event => updateStep(step.key, { description: event.target.value })} placeholder="Jelaskan apa yang dilakukan pada tahap ini" /></label></div></div><div className="cms-service-repeat-actions"><button type="button" onClick={() => moveList(steps, setSteps, index, index - 1)} disabled={index === 0} aria-label={`Naikkan langkah ${index + 1}`}><ArrowUp size={17} /></button><button type="button" onClick={() => moveList(steps, setSteps, index, index + 1)} disabled={index === steps.length - 1} aria-label={`Turunkan langkah ${index + 1}`}><ArrowDown size={17} /></button><button type="button" onClick={() => change(() => setSteps(previous => previous.filter(current => current.key !== step.key)))} aria-label={`Hapus langkah ${index + 1}`}><Trash2 size={17} /></button></div></div>)}<button type="button" className="cms-button primary cms-service-add" onClick={addStep}><Plus size={17} /> Tambah Langkah</button></section>
      <section className="cms-card"><h2>Tombol Utama</h2><p className="cms-service-card-help">Kosongkan keduanya untuk memakai tombol kontak standar di halaman layanan.</p><div className="cms-service-two"><div className="cms-field"><label>Label Tombol Utama<input value={ctaLabel} maxLength={100} onChange={event => change(() => setCtaLabel(event.target.value))} aria-invalid={Boolean(errors.primary_cta_label)} placeholder="Contoh: Konsultasikan Proyek" /></label>{fieldError('primary_cta_label')}</div><div className="cms-field"><label>URL Tombol Utama<input value={ctaUrl} maxLength={1000} inputMode="url" onChange={event => change(() => setCtaUrl(event.target.value))} aria-invalid={Boolean(errors.primary_cta_url)} placeholder="/contact atau https://contoh.com" /></label>{fieldError('primary_cta_url')}<small>Gunakan path internal, URL HTTP(S), mailto:, atau tel: yang aman.</small></div></div></section>
    </form>
    <aside className="cms-service-side"><div className="cms-card cms-service-preview"><h2>Preview</h2><div className="cms-service-preview-visual">{previewImage ? <img src={mediaUrl(previewImage.secure_url, 640)} alt={previewImage.alt_text || 'Pratinjau gambar layanan'} /> : <><ImagePlus size={34} aria-hidden="true" /><span>Gambar layanan akan tampil di sini</span></>}{chosenImages.length > 1 && <div className="cms-service-preview-slider"><button type="button" onClick={() => setPreviewIndex(current => (current - 1 + chosenImages.length) % chosenImages.length)} aria-label="Gambar sebelumnya"><ChevronLeft size={17} /></button><span>{previewIndex + 1}/{chosenImages.length}</span><button type="button" onClick={() => setPreviewIndex(current => (current + 1) % chosenImages.length)} aria-label="Gambar berikutnya"><ChevronRight size={17} /></button></div>}</div><h3>{name.trim() || 'Nama Layanan'}</h3><div className="cms-service-preview-pricing"><strong>{previewPrice.label}</strong>{previewPrice.value && <span>{previewPrice.value}</span>}{previewPrice.note && <small>{previewPrice.note}</small>}{duration.trim() && <small>Estimasi: {duration.trim()}</small>}</div><div ref={descriptionPreview} className={`cms-service-preview-description ${previewExpanded ? 'expanded' : ''}`}>{renderedDescription ? <div dangerouslySetInnerHTML={{ __html: renderedDescription }} /> : <p>Deskripsi lengkap akan tampil di sini.</p>}</div>{previewCanExpand && <button type="button" className="cms-service-preview-expand" onClick={() => setPreviewExpanded(!previewExpanded)}>{previewExpanded ? 'Sembunyikan' : 'Lihat Semua'}</button>}{ctaLabel.trim() && ctaUrl.trim() && <div className="cms-service-cta-visual" aria-label="Pratinjau tombol utama">{ctaLabel.trim()} <ArrowRight size={16} aria-hidden="true" /></div>}</div><div className="cms-service-save"><button type="button" className="cms-button primary" onClick={() => void save('published')} disabled={busy || !has('services.publish') || !has('services.update')}>{busy ? 'Menyimpan…' : 'Simpan Layanan'}</button><button type="submit" form="cms-service-form" className="cms-button secondary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Draf'}</button>{(!has('services.publish') || !has('services.update')) && <small>Anda dapat menyimpan draf; penerbitan memerlukan izin khusus.</small>}</div></aside></div>
    <div className="cms-service-mobile-save"><button type="button" className="cms-button primary" onClick={() => void save('published')} disabled={busy || !has('services.publish') || !has('services.update')}>{busy ? 'Menyimpan…' : 'Simpan Layanan'}</button><button type="submit" form="cms-service-form" className="cms-button secondary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Draf'}</button></div>
    {pickerIndex !== null && <ProductMediaDialog scope="services" current={images[pickerIndex]} used={images.filter((image, index) => index !== pickerIndex && image !== null).map(image => image!.id)} onSelect={image => { setImage(pickerIndex, image); setPickerIndex(null); setPreviewIndex(0); }} onClose={() => setPickerIndex(null)} />}
  </div>;
}
