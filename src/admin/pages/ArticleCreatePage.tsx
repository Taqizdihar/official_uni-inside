import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link, useBeforeUnload } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, GripVertical, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, type ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Loading, Notice } from '../components/Ui';
import { mediaUrl } from '../components/MediaPicker';
import { ProductMediaDialog } from '../products/ProductMediaDialog';
import type { Photo } from '../products/model';
import { moveArticleImage, suggestedArticleMinutes, validReadingMinutes } from '../news/articleForm';
import { setEditorDirty } from '../dirty';
import { safeNewsHtml } from '../../pages/news/newsModel';
import './article-create.css';

const RichEditor = lazy(() => import('../components/RichEditor'));
type Category = { id: number; name: string };
type AuthorOption = { source: 'user' | 'team'; id: number; name: string };
type Picker = { kind: 'cover' } | { kind: 'gallery'; index: number | null };
const contentTypes = [
  ['news', 'Berita'], ['article', 'Artikel'], ['update', 'Pembaruan'], ['event', 'Acara'],
] as const;

export function ArticleCreatePage() {
  const { user, has } = useAuth();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<(typeof contentTypes)[number][0]>('article');
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState<Photo | null>(null);
  const [gallery, setGallery] = useState<Photo[]>([]);
  const [authorValue, setAuthorValue] = useState('');
  const [readingOverride, setReadingOverride] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [authorLoading, setAuthorLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<unknown>(null);
  const [authorError, setAuthorError] = useState<unknown>(null);
  const [retryOptions, setRetryOptions] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ id: number; status: string } | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewCanExpand, setPreviewCanExpand] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const previewBody = useRef<HTMLDivElement>(null);
  const authorInitialized = useRef(false);
  const saving = useRef(false);
  const drag = useRef<{ index: number; x: number; y: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const suggested = suggestedArticleMinutes(body);
  const displayedMinutes = readingOverride ? manualMinutes : String(suggested ?? '');
  const chosenAuthor = authors.find(option => `${option.source}:${option.id}` === authorValue);
  const chosenCategory = categories.find(option => String(option.id) === categoryId);
  const safeBody = body ? safeNewsHtml(body) : '';
  const canPublish = has('news.update') && has('news.publish');

  useEffect(() => { setEditorDirty(dirty); return () => setEditorDirty(false); }, [dirty]);
  useBeforeUnload(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  useEffect(() => {
    if (!has('news.create')) return;
    const controller = new AbortController();
    setCategoryLoading(true); setCategoryError(null);
    (async () => {
      try {
        const all: Category[] = [];
        let page = 1, pages = 1;
        do {
          const result = await api<Category[]>(`/admin/news-categories?page=${page}&limit=100&isActive=true`, { signal: controller.signal });
          all.push(...result.data); pages = result.meta?.totalPages ?? 1; page++;
        } while (page <= pages && !controller.signal.aborted);
        if (!controller.signal.aborted) setCategories(all);
      } catch (cause) { if (!controller.signal.aborted) setCategoryError(cause); }
      finally { if (!controller.signal.aborted) setCategoryLoading(false); }
    })();
    return () => controller.abort();
  }, [has, retryOptions]);
  useEffect(() => {
    if (!has('news.create')) return;
    const controller = new AbortController();
    setAuthorLoading(true); setAuthorError(null);
    const load = async (source: 'user' | 'team') => {
      const all: AuthorOption[] = [];
      let page = 1, pages = 1;
      do {
        const result = await api<AuthorOption[]>(`/admin/news/author-options?source=${source}&page=${page}&limit=100`, { signal: controller.signal });
        all.push(...result.data); pages = result.meta?.totalPages ?? 1; page++;
      } while (page <= pages && !controller.signal.aborted);
      return all;
    };
    Promise.all([load('user'), load('team')])
      .then(([users, team]) => { if (!controller.signal.aborted) setAuthors([...users, ...team]); })
      .catch(cause => { if (!controller.signal.aborted) setAuthorError(cause); })
      .finally(() => { if (!controller.signal.aborted) setAuthorLoading(false); });
    return () => controller.abort();
  }, [has, retryOptions]);
  useEffect(() => {
    if (!authorLoading && !authorError && !authorInitialized.current) {
      const mine = authors.find(option => option.source === 'user' && option.id === user?.id);
      if (mine) setAuthorValue(`user:${mine.id}`);
      authorInitialized.current = true;
    }
  }, [authorLoading, authorError, authors, user?.id]);
  useEffect(() => {
    const element = previewBody.current;
    if (!element) return;
    const measure = () => setPreviewCanExpand(element.scrollHeight > 142);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.firstElementChild ?? element);
    return () => observer.disconnect();
  }, [body]);

  if (!has('news.view') || !has('news.create')) return <div className="cms-page cms-notice cms-notice-error">Anda tidak memiliki izin untuk menambah artikel.</div>;
  const change = (callback: () => void) => { callback(); setDirty(true); };
  const moveImage = (from: number, to: number) => change(() => setGallery(current => moveArticleImage(current, from, to)));
  const dragStart = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { index, x: event.clientX, y: event.clientY }; setDragIndex(index);
  };
  const dragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current; drag.current = null; setDragIndex(null);
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-article-image-index]');
    if (target) moveImage(start.index, Number(target.dataset.articleImageIndex));
  };
  const fieldError = (key: string) => errors[key] ? <small className="cms-field-error" role="alert">{errors[key]}</small> : null;
  const setFailure = (cause: unknown) => {
    setError(cause);
    const details = (cause as ApiError).details ?? [];
    if (details.length) setErrors(Object.fromEntries(details.filter(issue => issue.path).map(issue => [issue.path!, issue.message ?? 'Nilai tidak valid.'])));
    requestAnimationFrame(() => { feedback.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); feedback.current?.focus(); });
  };
  async function save(action: 'draft' | 'publish') {
    if (saving.current || saved) return;
    setError(null); setErrors({});
    try {
      if (readingOverride && manualMinutes.trim() && !validReadingMinutes(manualMinutes)) {
        setErrors({ reading_time_minutes: 'Gunakan bilangan bulat antara 1 dan 999 menit.' });
        throw new Error('Periksa estimasi waktu baca.');
      }
      const [source, authorId] = authorValue.split(':');
      const payload = {
        action, title: title.trim(), content_type: contentType, category_id: categoryId ? Number(categoryId) : null,
        excerpt: excerpt.trim(), body, cover_media_id: cover?.id ?? null,
        gallery_media_ids: gallery.map(image => image.id),
        author: authorValue ? { source, id: Number(authorId) } : null,
        reading_time_minutes: readingOverride && manualMinutes.trim() ? Number(manualMinutes) : null,
      };
      saving.current = true; setBusy(true);
      const result = await api<{ id: number; status: string }>('/admin/news/create-complete', { method: 'POST', body: JSON.stringify(payload) });
      if (!Number.isSafeInteger(result.data?.id) || result.data.id <= 0 || result.data.status !== (action === 'publish' ? 'published' : 'draft')) throw new Error('Server belum mengonfirmasi artikel. Periksa daftar Berita sebelum mencoba lagi.');
      setSaved(result.data); setDirty(false); setEditorDirty(false);
      requestAnimationFrame(() => feedback.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' }));
    } catch (cause) { setFailure(cause); }
    finally { saving.current = false; setBusy(false); }
  }
  const onImage = (image: Photo) => {
    if (!picker) return;
    if (picker.kind === 'cover') change(() => setCover(image));
    else change(() => setGallery(previous => picker.index === null ? [...previous, image] : previous.map((current, index) => index === picker.index ? image : current)));
    setPicker(null);
  };
  const currentPhoto = picker?.kind === 'cover' ? cover : picker?.kind === 'gallery' && picker.index !== null ? gallery[picker.index] : null;
  const usedPhotos = [cover, ...gallery].filter((image): image is Photo => Boolean(image)).filter(image => image.id !== currentPhoto?.id).map(image => image.id);

  return <div className="cms-page cms-article-create">
    <Link className="cms-article-back" to="/admin/content/news"><ArrowLeft size={17} /> Kembali ke Berita</Link>
    <h1>Tambah Artikel</h1>
    <div ref={feedback} tabIndex={-1} className="cms-article-feedback"><Notice error={error} />{saved && <div className="cms-article-success" role="status"><Check size={19} /><span>{saved.status === 'published' ? 'Artikel berhasil diterbitkan.' : 'Artikel berhasil disimpan sebagai draf.'} <Link to={`/admin/content/news/${saved.id}`}>Buka artikel</Link> · <Link to="/admin/content/news">Kembali ke daftar Berita</Link></span></div>}</div>
    {(categoryError || authorError) && <div className="cms-article-options-error"><Notice error={categoryError || authorError} /><button type="button" className="cms-button secondary" onClick={() => setRetryOptions(value => value + 1)}>Coba lagi</button></div>}
    <fieldset disabled={busy || Boolean(saved)} className="cms-article-layout"><div className="cms-article-form">
      <section className="cms-article-card"><h2>Informasi Utama</h2><div className="cms-article-cover"><button type="button" className="cms-article-cover-select" onClick={() => setPicker({ kind: 'cover' })} aria-label={cover ? 'Ganti gambar sampul' : 'Pilih gambar sampul'}>{cover ? <img src={mediaUrl(cover.secure_url, 960)} alt={cover.alt_text || title || 'Gambar sampul'} /> : <><ImagePlus size={40} strokeWidth={1.5} /><strong>Tambah Gambar Sampul</strong><span>Gambar utama artikel</span></>}</button>{cover && <button type="button" className="cms-article-cover-remove" onClick={() => change(() => setCover(null))} aria-label="Hapus gambar sampul"><Trash2 size={16} /></button>}</div>{fieldError('cover_media_id')}
        <div className="cms-field"><label>Judul Artikel<input value={title} maxLength={255} onChange={event => change(() => setTitle(event.target.value))} placeholder="Tulis judul yang jelas dan menarik" aria-invalid={Boolean(errors.title)} /></label>{fieldError('title')}</div>
        <div className="cms-article-main-row"><div className="cms-field"><label>Jenis Konten<select value={contentType} onChange={event => change(() => setContentType(event.target.value as typeof contentType))}>{contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="cms-field"><label>Kategori<select value={categoryId} disabled={categoryLoading} onChange={event => change(() => setCategoryId(event.target.value))} aria-invalid={Boolean(errors.category_id)}><option value="">{categoryLoading ? 'Memuat kategori…' : 'Pilih kategori'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>{fieldError('category_id')}</div></div>
        <div className="cms-field"><label>Ringkasan<textarea value={excerpt} maxLength={1000} rows={4} onChange={event => change(() => setExcerpt(event.target.value))} placeholder="Tulis pengantar singkat untuk kartu berita dan halaman artikel" aria-invalid={Boolean(errors.excerpt)} /></label>{fieldError('excerpt')}<small>{excerpt.length}/1000 karakter</small></div>
      </section>
      <section className="cms-article-card cms-article-body-card"><h2>Isi Artikel</h2><p className="cms-article-help">Susun naskah dengan paragraf, subjudul, daftar, kutipan, dan tautan. Tempel sebagai teks biasa.</p><Suspense fallback={<Loading />}><RichEditor label="Isi Artikel" value={body} onChange={value => change(() => setBody(value))} editorial /></Suspense>{fieldError('body')}</section>
      <section className="cms-article-card"><h2>Gambar Artikel</h2><p className="cms-article-help">Gambar tambahan tampil setelah isi artikel, sesuai urutan di bawah ini. Maksimal 100 gambar.</p><div className="cms-article-gallery" aria-label="Gambar tambahan artikel">{gallery.map((image, index) => <div key={image.id} className={`cms-article-image ${dragIndex === index ? 'dragging' : ''}`} data-article-image-index={index}><button type="button" className="cms-article-image-select" onClick={() => setPicker({ kind: 'gallery', index })} aria-label={`Ganti gambar artikel ${index + 1}`}><img src={mediaUrl(image.secure_url, 280)} alt={image.alt_text || `Gambar artikel ${index + 1}`} /></button><span className="cms-article-image-number">{index + 1}</span><div className="cms-article-image-actions"><button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0} aria-label={`Naikkan gambar artikel ${index + 1}`}><ArrowUp size={15} /></button><button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === gallery.length - 1} aria-label={`Turunkan gambar artikel ${index + 1}`}><ArrowDown size={15} /></button><button type="button" className="cms-article-image-grip" onPointerDown={event => dragStart(event, index)} onPointerUp={dragEnd} onPointerCancel={() => { drag.current = null; setDragIndex(null); }} aria-label={`Seret gambar artikel ${index + 1} untuk mengubah urutan`}><GripVertical size={15} /></button><button type="button" onClick={() => change(() => setGallery(previous => previous.filter((_, position) => position !== index)))} aria-label={`Hapus gambar artikel ${index + 1}`}><Trash2 size={15} /></button></div></div>)}{gallery.length < 100 && <button type="button" className="cms-article-gallery-add" onClick={() => setPicker({ kind: 'gallery', index: null })}><Plus size={24} /><span>Tambah Gambar</span></button>}</div>{!gallery.length && <p className="cms-article-empty">Belum ada gambar tambahan.</p>}{fieldError('gallery_media_ids')}</section>
      <section className="cms-article-card"><h2>Penulis &amp; Waktu Baca</h2><div className="cms-article-main-row"><div className="cms-field"><label>Penulis<select aria-label="Penulis" value={authorValue} disabled={authorLoading} onChange={event => change(() => setAuthorValue(event.target.value))} aria-invalid={Boolean(errors.author)}><option value="">{authorLoading ? 'Memuat penulis…' : 'Pilih penulis'}</option><optgroup label="Anggota CMS">{authors.filter(option => option.source === 'user').map(option => <option key={`user:${option.id}`} value={`user:${option.id}`}>{option.name}</option>)}</optgroup><optgroup label="Anggota Tim">{authors.filter(option => option.source === 'team').map(option => <option key={`team:${option.id}`} value={`team:${option.id}`}>{option.name}</option>)}</optgroup></select></label>{fieldError('author')}</div><div className="cms-field"><label>Estimasi Waktu Baca<div className="cms-article-minutes"><input type="number" inputMode="numeric" step="1" min="1" max="999" value={displayedMinutes} onChange={event => change(() => { setReadingOverride(true); setManualMinutes(event.target.value); })} aria-invalid={Boolean(errors.reading_time_minutes)} placeholder="Otomatis" /><span>menit</span></div></label>{fieldError('reading_time_minutes')}<div className="cms-article-reading-help"><small>Perkiraan otomatis: {suggested ?? '—'} menit · 200 kata/menit</small>{readingOverride && <button type="button" onClick={() => change(() => { setReadingOverride(false); setManualMinutes(''); })}><RotateCcw size={13} /> Hitung ulang</button>}</div></div></div></section>
    </div><aside className="cms-article-side"><div className="cms-article-preview"><h2>Preview</h2><div className="cms-article-preview-cover">{cover ? <img src={mediaUrl(cover.secure_url, 600)} alt={cover.alt_text || 'Pratinjau sampul'} /> : <><ImagePlus size={36} strokeWidth={1.5} /><span>Gambar sampul tampil di sini</span></>}</div><div className="cms-article-preview-meta"><span>{chosenCategory?.name ?? contentTypes.find(([value]) => value === contentType)?.[1]}</span>{chosenCategory && <span>{contentTypes.find(([value]) => value === contentType)?.[1]}</span>}</div><h3>{title.trim() || 'Judul Artikel'}</h3><p className="cms-article-preview-excerpt">{excerpt.trim() || 'Ringkasan artikel akan tampil di sini.'}</p><div className="cms-article-preview-byline">{chosenAuthor?.name && <span>Oleh {chosenAuthor.name}</span>}{displayedMinutes && validReadingMinutes(displayedMinutes) && <span>{displayedMinutes} menit baca</span>}</div><div ref={previewBody} className={`cms-article-preview-body ${previewExpanded ? 'expanded' : ''}`}>{safeBody ? <div dangerouslySetInnerHTML={{ __html: safeBody }} /> : <p>Isi artikel akan tampil di sini.</p>}</div>{previewCanExpand && <button type="button" className="cms-article-preview-expand" onClick={() => setPreviewExpanded(!previewExpanded)}>{previewExpanded ? 'Sembunyikan' : 'Lihat Semua'} <ArrowRight size={14} /></button>}<p className="cms-article-preview-count">{gallery.length ? `${gallery.length} gambar tambahan, urutan: ${gallery.slice(0, 3).map(image => image.original_filename || `Gambar ${image.id}`).join(' → ')}${gallery.length > 3 ? ' → …' : ''}` : 'Belum ada gambar tambahan'}</p></div><div className="cms-article-save"><button type="button" className="cms-button primary" disabled={!canPublish || busy || Boolean(saved)} onClick={() => void save('publish')}>{busy ? 'Menyimpan…' : 'Simpan Artikel'}</button><button type="button" className="cms-button secondary" disabled={busy || Boolean(saved)} onClick={() => void save('draft')}>{busy ? 'Menyimpan…' : 'Simpan Draf'}</button>{!canPublish && <small>Anda dapat menyimpan draf; menerbitkan artikel memerlukan izin khusus.</small>}</div></aside></fieldset>
    {picker && <ProductMediaDialog scope="news" current={currentPhoto ?? null} used={usedPhotos} onSelect={onImage} onClose={() => setPicker(null)} />}
  </div>;
}
