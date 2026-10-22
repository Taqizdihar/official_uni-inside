export const roleLabels: Record<string, string> = {
  super_admin: 'Super Administrator', administrator: 'Administrator', editor: 'Editor', author: 'Author', viewer: 'Viewer',
};

export const roleDescriptions: Record<string, string> = {
  super_admin: 'Akses penuh, termasuk role dan permission.',
  administrator: 'Mengelola pengguna, pengaturan, dan konten.',
  editor: 'Mengelola serta menerbitkan konten.',
  author: 'Membuat dan mengedit draft.',
  viewer: 'Melihat konten CMS tanpa mengubahnya.',
};

export const statusLabels: Record<string, string> = {
  draft: 'Draft', scheduled: 'Terjadwal', published: 'Terbit', archived: 'Diarsipkan',
  active: 'Aktif', suspended: 'Ditangguhkan', disabled: 'Nonaktif', invited: 'Diundang', pending: 'Menunggu',
};

export const actionLabels: Record<string, string> = {
  view: 'Lihat', create: 'Buat', update: 'Edit', edit: 'Edit', publish: 'Terbitkan',
  archive: 'Arsipkan', delete: 'Hapus', invite: 'Undang', manage: 'Kelola', upload: 'Unggah',
};

export const domainLabels: Record<string, string> = {
  dashboard: 'Dashboard', analytics: 'Analytics', media: 'Media Library', homepage: 'Homepage',
  partners: 'Partners', team: 'Our Team', products: 'Products', services: 'Services',
  projects: 'Projects', news: 'News', achievements: 'Achievements', settings: 'Pengaturan',
  users: 'Pengguna', roles: 'Role', audit: 'Audit', contact: 'Contact Us',
};

export const formatDate = (value: string | number | Date) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

// MySQL dateStrings are UTC without a suffix; browser-local parsing would shift them inconsistently.
export function formatCmsUtc(value: string) {
  const normalized = /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 'Waktu tidak tersedia' : new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  }).format(date);
}

export function friendlyPermission(code: string) {
  const [domain, action] = code.split('.');
  return `${actionLabels[action] ?? action} ${domainLabels[domain] ?? domain}`;
}

export function auditActionLabel(code: string) {
  const named: Record<string,string> = {
    'auth.bootstrap':'Akun Super Administrator dibuat',
    'auth.login':'Masuk ke CMS',
    'auth.logout':'Keluar dari CMS',
    'auth.logout.all':'Keluar dari semua perangkat',
    'auth.password.change':'Mengubah password',
    'auth.reset.request':'Meminta reset password',
    'auth.reset.complete':'Menyelesaikan reset password',
    'auth.invitation.accept':'Menerima undangan',
    'users.password.admin_reset':'Reset password anggota',
    'users.invite':'Mengundang anggota',
    'users.invitation.resend':'Mengirim ulang undangan',
    'users.invitation.revoke':'Membatalkan undangan',
    'users.update':'Memperbarui pengguna',
    'users.profile.update':'Memperbarui profil',
    'roles.permissions.update':'Mengubah hak akses role',
    'products.publish':'Menerbitkan produk',
    'media.create':'Mengunggah aset',
  };
  if (named[code]) return named[code];
  const match = /^([a-z_]+)\.(create|update|delete|publish|archive|rename|move)$/.exec(code);
  if (match) {
    const verbs:Record<string,string>={create:'Membuat',update:'Memperbarui',delete:'Menghapus',publish:'Menerbitkan',archive:'Mengarsipkan',rename:'Mengganti nama',move:'Memindahkan'};
    const category=auditEntityLabel(match[1]);
    return `${verbs[match[2]]} ${category.toLowerCase()}`;
  }
  return 'Aktivitas lainnya';
}

export function auditEntityLabel(type: string | null) {
  const labels:Record<string,string>={users:'Pengguna',invitations:'Undangan',roles:'Role dan Akses',products:'Produk',services:'Layanan',news_articles:'Artikel',media_assets:'Aset Media',hero_settings:'Hero',site_settings:'Pengaturan Website',social_links:'Sosial Media',homepage_section_settings:'Pengaturan Homepage',partners:'Mitra',team_members:'Anggota Tim',projects:'Proyek',achievements:'Pencapaian'};
  if (!type) return 'CMS';
  return labels[type.split(':')[0]]??'Konten CMS';
}

export function auditActorLabel(actorId: number | null, name: string | null) {
  return name?.trim() || (actorId === null ? 'Aksi sistem' : 'Pengguna tidak tersedia');
}

export function initials(name?: string) {
  return (name || 'UI').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}
