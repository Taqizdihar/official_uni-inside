import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  login, isLoggedIn, clearToken, getStats,
  getPrompts, createPrompt, updatePrompt, deletePrompt,
  getNewsList, createNews, updateNews, deleteNews,
  getTeam, createTeamMember, updateTeamMember, deleteTeamMember,
} from '../lib/cmsApi';

// ==================== TYPES ====================
interface Stats { prompts: number; news: number; team: number }
interface PromptItem { id: string; title: string; category: string; type: string; orientation: string; aspect_ratio: string; prompt: string; negative_prompt: string; model: string; seed: string; src: string; tags: string[] }
interface NewsItem { id: string; title: string; description: string; category: string; author: string; date: string; thumbnail: string; reading_time: string; featured: number }
interface TeamItem { id: number; name: string; role: string; image: string }

type Section = 'dashboard' | 'prompts' | 'news' | 'team';

// ==================== LOGIN SCREEN ====================
const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '48px 40px',
          width: 420, maxWidth: '90vw', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff',
          }}>U</div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Uni-Inside CMS</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>Login untuk mengelola konten</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Username</label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              placeholder="admin"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
              {error}
            </motion.div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px 0', background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
          }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ==================== SIDEBAR ====================
const sidebarItems: { key: Section; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'prompts', label: 'Prompt Gallery', icon: '🎨' },
  { key: 'news', label: 'News & Artikel', icon: '📰' },
  { key: 'team', label: 'Team Members', icon: '👥' },
];

const Sidebar: React.FC<{ active: Section; onNavigate: (s: Section) => void; onLogout: () => void }> = ({ active, onNavigate, onLogout }) => (
  <div style={{
    width: 260, minHeight: '100vh', background: 'rgba(15,15,26,0.98)',
    borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 0', display: 'flex',
    flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 100,
  }}>
    <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff',
        }}>U</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Uni-Inside</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Content Manager</div>
        </div>
      </div>
    </div>
    <nav style={{ flex: 1, padding: '16px 12px' }}>
      {sidebarItems.map(item => (
        <button key={item.key} onClick={() => onNavigate(item.key)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', border: 'none', borderRadius: 10, cursor: 'pointer',
          background: active === item.key ? 'rgba(99,102,241,0.15)' : 'transparent',
          color: active === item.key ? '#a5b4fc' : 'rgba(255,255,255,0.55)',
          fontSize: 14, fontWeight: active === item.key ? 600 : 400, textAlign: 'left',
          transition: 'all 0.15s', marginBottom: 4,
        }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
    <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onLogout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', border: 'none', borderRadius: 10, cursor: 'pointer',
        background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 14, fontWeight: 500,
      }}>
        <span>🚪</span> Logout
      </button>
    </div>
  </div>
);

// ==================== STAT CARD ====================
const StatCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: 24, flex: 1, minWidth: 200,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>{icon}</div>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{label}</span>
    </div>
    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{value}</div>
  </motion.div>
);

// ==================== DASHBOARD ====================
const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ prompts: 0, news: 0, team: 0 });

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>Overview konten website Uni-Inside</p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <StatCard icon="🎨" label="Prompt Gallery" value={stats.prompts} color="#6366f1" />
        <StatCard icon="📰" label="News & Artikel" value={stats.news} color="#10b981" />
        <StatCard icon="👥" label="Team Members" value={stats.team} color="#f59e0b" />
      </div>
    </div>
  );
};

// ==================== MODAL ====================
const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            width: 600, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto',
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: 24 }}>{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ==================== FORM INPUT ====================
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6,
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ==================== PROMPTS VIEW ====================
const PromptsView: React.FC = () => {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(() => { getPrompts().then(setItems).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const tagsRaw = fd.get('tags') as string;
    fd.set('tags', JSON.stringify(tagsRaw.split(',').map(t => t.trim()).filter(Boolean)));

    try {
      if (editing) {
        await updatePrompt(editing.id, fd);
      } else {
        await createPrompt(fd);
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    await deletePrompt(id);
    setDeleteConfirm(null);
    load();
  };

  const openEdit = (item: PromptItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>Prompt Gallery</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 }}>{items.length} item</p>
        </div>
        <button onClick={openNew} style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ Tambah Prompt</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map(item => (
          <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, overflow: 'hidden',
            }}>
            <div style={{ height: 160, background: '#111', overflow: 'hidden', position: 'relative' }}>
              <img src={item.src.startsWith('http') ? item.src : `http://localhost:3001${item.src}`} alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{
                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#a5b4fc',
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              }}>{item.type}</div>
            </div>
            <div style={{ padding: 16 }}>
              <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 12px' }}>{item.category}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(item)} style={{
                  flex: 1, padding: '8px 0', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8, color: '#a5b4fc', fontSize: 13, cursor: 'pointer',
                }}>Edit</button>
                <button onClick={() => setDeleteConfirm(item.id)} style={{
                  flex: 1, padding: '8px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#f87171', fontSize: 13, cursor: 'pointer',
                }}>Hapus</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Prompt' : 'Tambah Prompt Baru'}>
        <form onSubmit={handleSubmit}>
          <FormField label="Judul">
            <input name="title" defaultValue={editing?.title || ''} required style={inputStyle} />
          </FormField>
          <FormField label="Kategori">
            <input name="category" defaultValue={editing?.category || ''} required style={inputStyle} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Type">
              <select name="type" defaultValue={editing?.type || 'photo'} style={inputStyle}>
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </FormField>
            <FormField label="Orientation">
              <select name="orientation" defaultValue={editing?.orientation || 'portrait'} style={inputStyle}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Aspect Ratio">
              <select name="aspect_ratio" defaultValue={editing?.aspect_ratio || '9:16'} style={inputStyle}>
                <option value="9:16">9:16</option>
                <option value="3:4">3:4</option>
                <option value="16:9">16:9</option>
                <option value="21:9">21:9</option>
              </select>
            </FormField>
            <FormField label="Model">
              <input name="model" defaultValue={editing?.model || ''} required style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Prompt">
            <textarea name="prompt" defaultValue={editing?.prompt || ''} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <FormField label="Negative Prompt">
            <textarea name="negative_prompt" defaultValue={editing?.negative_prompt || ''} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <FormField label="Seed">
            <input name="seed" defaultValue={editing?.seed || ''} required style={inputStyle} />
          </FormField>
          <FormField label="Tags (pisahkan dengan koma)">
            <input name="tags" defaultValue={editing?.tags?.join(', ') || ''} style={inputStyle} />
          </FormField>
          <FormField label="Upload Gambar">
            <input name="image" type="file" accept="image/*" style={inputStyle} />
            {editing?.src && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Gambar saat ini: {editing.src}</p>}
          </FormField>
          <button type="submit" style={{
            width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8,
          }}>{editing ? 'Simpan Perubahan' : 'Tambah Prompt'}</button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Konfirmasi Hapus">
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 24 }}>Yakin ingin menghapus item ini? Tindakan ini tidak bisa dibatalkan.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setDeleteConfirm(null)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#fff', fontSize: 14, cursor: 'pointer',
          }}>Batal</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Ya, Hapus</button>
        </div>
      </Modal>
    </div>
  );
};

// ==================== NEWS VIEW ====================
const NewsView: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(() => { getNewsList().then(setItems).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateNews(editing.id, fd);
      } else {
        await createNews(fd);
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    await deleteNews(id);
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>News & Artikel</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 }}>{items.length} artikel</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ Tambah Artikel</button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Judul', 'Kategori', 'Author', 'Tanggal', 'Featured', 'Aksi'].map(h => (
                <th key={h} style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px', color: '#fff', fontSize: 14, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{item.category}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.author}</td>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{item.date}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: item.featured ? '#34d399' : 'rgba(255,255,255,0.3)', fontSize: 16 }}>{item.featured ? '⭐' : '○'}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditing(item); setModalOpen(true); }} style={{
                      padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: 'none',
                      borderRadius: 6, color: '#a5b4fc', fontSize: 12, cursor: 'pointer',
                    }}>Edit</button>
                    <button onClick={() => setDeleteConfirm(item.id)} style={{
                      padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: 'none',
                      borderRadius: 6, color: '#f87171', fontSize: 12, cursor: 'pointer',
                    }}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Belum ada artikel</div>}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Artikel' : 'Tambah Artikel Baru'}>
        <form onSubmit={handleSubmit}>
          <FormField label="Judul">
            <input name="title" defaultValue={editing?.title || ''} required style={inputStyle} />
          </FormField>
          <FormField label="Deskripsi">
            <textarea name="description" defaultValue={editing?.description || ''} required rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Kategori">
              <select name="category" defaultValue={editing?.category || 'Design'} style={inputStyle}>
                {['Photography', 'Development', 'Events', 'Design', 'Creative', 'Technology', 'Video', 'Social Media'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Author">
              <input name="author" defaultValue={editing?.author || ''} required style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tanggal">
              <input name="date" defaultValue={editing?.date || ''} required style={inputStyle} placeholder="July 15, 2026" />
            </FormField>
            <FormField label="Reading Time">
              <input name="reading_time" defaultValue={editing?.reading_time || '5 min'} style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Featured">
            <select name="featured" defaultValue={editing?.featured ? '1' : '0'} style={inputStyle}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </FormField>
          <FormField label="Upload Thumbnail">
            <input name="thumbnail" type="file" accept="image/*" style={inputStyle} />
            {editing?.thumbnail && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Thumbnail saat ini tersedia</p>}
          </FormField>
          <button type="submit" style={{
            width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8,
          }}>{editing ? 'Simpan Perubahan' : 'Tambah Artikel'}</button>
        </form>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Konfirmasi Hapus">
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 24 }}>Yakin ingin menghapus artikel ini?</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setDeleteConfirm(null)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#fff', fontSize: 14, cursor: 'pointer',
          }}>Batal</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Ya, Hapus</button>
        </div>
      </Modal>
    </div>
  );
};

// ==================== TEAM VIEW ====================
const TeamView: React.FC = () => {
  const [items, setItems] = useState<TeamItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = useCallback(() => { getTeam().then(setItems).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateTeamMember(editing.id, fd);
      } else {
        await createTeamMember(fd);
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    await deleteTeamMember(id);
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>Team Members</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 }}>{items.length} anggota</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ Tambah Anggota</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {items.map(item => (
          <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, overflow: 'hidden', textAlign: 'center',
            }}>
            <div style={{ height: 180, background: '#111', overflow: 'hidden' }}>
              <img src={item.image.startsWith('http') ? item.image : `http://localhost:3001${item.image}`} alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div style={{ padding: 16 }}>
              <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>{item.name}</h4>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 14px' }}>{item.role}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditing(item); setModalOpen(true); }} style={{
                  flex: 1, padding: '8px 0', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8, color: '#a5b4fc', fontSize: 13, cursor: 'pointer',
                }}>Edit</button>
                <button onClick={() => setDeleteConfirm(item.id)} style={{
                  flex: 1, padding: '8px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: '#f87171', fontSize: 13, cursor: 'pointer',
                }}>Hapus</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Anggota' : 'Tambah Anggota Baru'}>
        <form onSubmit={handleSubmit}>
          <FormField label="Nama">
            <input name="name" defaultValue={editing?.name || ''} required style={inputStyle} />
          </FormField>
          <FormField label="Role / Jabatan">
            <input name="role" defaultValue={editing?.role || ''} required style={inputStyle} />
          </FormField>
          <FormField label="Upload Foto">
            <input name="image" type="file" accept="image/*" style={inputStyle} />
            {editing?.image && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Foto saat ini: {editing.image}</p>}
          </FormField>
          <button type="submit" style={{
            width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8,
          }}>{editing ? 'Simpan Perubahan' : 'Tambah Anggota'}</button>
        </form>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Konfirmasi Hapus">
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 24 }}>Yakin ingin menghapus anggota ini?</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setDeleteConfirm(null)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#fff', fontSize: 14, cursor: 'pointer',
          }}>Batal</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} style={{
            flex: 1, padding: '10px 0', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Ya, Hapus</button>
        </div>
      </Modal>
    </div>
  );
};

// ==================== MAIN ADMIN PAGE ====================
export const AdminPage: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(isLoggedIn());
  const [activeSection, setActiveSection] = useState<Section>('dashboard');

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <Sidebar active={activeSection} onNavigate={setActiveSection} onLogout={handleLogout} />
      <main style={{ marginLeft: 260, padding: '32px 40px', minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'dashboard' && <DashboardView />}
            {activeSection === 'prompts' && <PromptsView />}
            {activeSection === 'news' && <NewsView />}
            {activeSection === 'team' && <TeamView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
