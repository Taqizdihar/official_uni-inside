import bcrypt from 'bcryptjs';
import db from './db.js';

// Seed default admin user
const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (username, password, display_name) VALUES (?, ?, ?)').run('admin', hashedPassword, 'Administrator');
  console.log('✅ Default admin created: admin / admin123');
}

// Seed prompt gallery data if empty
const promptCount = (db.prepare('SELECT COUNT(*) as count FROM prompt_gallery').get() as { count: number }).count;
if (promptCount === 0) {
  const promptInsert = db.prepare(`
    INSERT INTO prompt_gallery (id, title, category, type, orientation, aspect_ratio, prompt, negative_prompt, model, seed, src, video_src, duration, tags, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedPrompts = [
    {
      id: 'pg-fruit-aesthetic',
      title: 'Foto Buah Estetik',
      category: 'Commercial & Food Photography',
      type: 'photo',
      orientation: 'portrait',
      aspectRatio: '9:16',
      prompt: 'Foto studio komersial Ultra HD super tajam buah naga...',
      negativePrompt: 'blurry, low quality, dark shadows',
      model: 'Hasselblad Macro / Midjourney v6.1',
      seed: '782194031',
      src: '/images/buah-naga-estetik.jpg',
      tags: ['Foto Buah Estetik', 'Buah Naga', 'Food Photography'],
    },
    {
      id: 'pg-parfum-miss-dior',
      title: 'Foto Studio Parfum',
      category: 'Luxury Product',
      type: 'photo',
      orientation: 'portrait',
      aspectRatio: '3:4',
      prompt: 'Foto studio komersial produk parfum profesional Ultra HD 8K...',
      negativePrompt: 'blurry, low quality, dark shadows, plastic look',
      model: 'Hasselblad Macro / Midjourney v6.1',
      seed: '891240162',
      src: '/images/parfum-miss-dior.jpg',
      tags: ['Foto Studio Parfum', 'Miss Dior', 'Luxury Product'],
    },
  ];

  const insertMany = db.transaction(() => {
    seedPrompts.forEach((p, i) => {
      promptInsert.run(p.id, p.title, p.category, p.type, p.orientation, p.aspectRatio, p.prompt, p.negativePrompt || null, p.model, p.seed, p.src, null, null, JSON.stringify(p.tags), i);
    });
  });
  insertMany();
  console.log(`✅ Seeded ${seedPrompts.length} prompt gallery items`);
}

// Seed news data if empty
const newsCount = (db.prepare('SELECT COUNT(*) as count FROM news').get() as { count: number }).count;
if (newsCount === 0) {
  const newsInsert = db.prepare(`
    INSERT INTO news (id, title, description, category, author, date, thumbnail, reading_time, featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedNews = [
    { id: '1', title: 'Exploring the New Era of Web Design in 2026', description: 'A deep dive into how AI and 3D rendering are changing the landscape.', category: 'Design', author: 'April', date: 'July 15, 2026', readingTime: '5 min', featured: true },
    { id: '2', title: 'The Evolution of Photography in the Digital Age', description: 'How modern cameras and computational photography push boundaries.', category: 'Photography', author: 'Dian', date: 'July 10, 2026', readingTime: '8 min', featured: true },
    { id: '3', title: 'Behind the Scenes: Creative Coding', description: 'Building generative art and complex web animations using WebGL.', category: 'Development', author: 'Taqi', date: 'July 05, 2026', readingTime: '6 min', featured: true },
  ];

  const fallbackThumbnail = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop';
  const insertMany = db.transaction(() => {
    seedNews.forEach((n, i) => {
      newsInsert.run(n.id, n.title, n.description, n.category, n.author, n.date, fallbackThumbnail, n.readingTime, n.featured ? 1 : 0, i);
    });
  });
  insertMany();
  console.log(`✅ Seeded ${seedNews.length} news items`);
}

// Seed team members if empty
const teamCount = (db.prepare('SELECT COUNT(*) as count FROM team_members').get() as { count: number }).count;
if (teamCount === 0) {
  const teamInsert = db.prepare(`
    INSERT INTO team_members (name, role, image, sort_order) VALUES (?, ?, ?, ?)
  `);

  const members = [
    { name: 'April', role: 'Creative Director', image: '/assets/our-team/members/1 - April.avif' },
    { name: 'Dian', role: 'Creative Director', image: '/assets/our-team/members/2 - Dian.avif' },
    { name: 'Taqi', role: 'Creative Director', image: '/assets/our-team/members/3 - Taqi.avif' },
    { name: 'Amadea', role: 'Creative Director', image: '/assets/our-team/members/4 - Amadea.avif' },
    { name: 'Nadine', role: 'Creative Director', image: '/assets/our-team/members/5 - Nadine.avif' },
    { name: 'Naura', role: 'Creative Director', image: '/assets/our-team/members/6 - Naura.avif' },
    { name: 'Anggi', role: 'Creative Director', image: '/assets/our-team/members/7 - Anggi.avif' },
    { name: 'Amany', role: 'Creative Director', image: '/assets/our-team/members/8 - Amany.avif' },
    { name: 'Ropaldo', role: 'Creative Director', image: '/assets/our-team/members/9 - Ropaldo.avif' },
  ];

  const insertMany = db.transaction(() => {
    members.forEach((m, i) => teamInsert.run(m.name, m.role, m.image, i));
  });
  insertMany();
  console.log(`✅ Seeded ${members.length} team members`);
}

console.log('🌱 Database seeding complete!');
