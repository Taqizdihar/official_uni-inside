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
  active: 'Aktif', suspended: 'Ditangguhkan', disabled: 'Nonaktif', pending: 'Menunggu',
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

export function friendlyPermission(code: string) {
  const [domain, action] = code.split('.');
  return `${actionLabels[action] ?? action} ${domainLabels[domain] ?? domain}`;
}

export function auditActionLabel(code: string) {
  const named: Record<string,string> = {
    'auth.bootstrap':'Akun Super Administrator dibuat',
    'auth.login':'Masuk ke CMS',
    'auth.logout':'Keluar dari CMS',
    'auth.password_change':'Kata sandi diubah',
    'auth.invite':'Undangan dibuat',
  };
  return named[code] ?? friendlyPermission(code);
}

export function initials(name?: string) {
  return (name || 'UI').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}
