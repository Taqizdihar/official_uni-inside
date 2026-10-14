import { promptGalleryData, type PromptGalleryItem } from '../data/promptGalleryData';
import { mockNews, type NewsArticle } from '../data/mockNews';

const API_BASE = 'http://localhost:3001/api';

// Storage keys
const STORAGE_PROMPTS = 'uni_cms_prompts';
const STORAGE_NEWS = 'uni_cms_news';
const STORAGE_TEAM = 'uni_cms_team';
const STORAGE_TOKEN = 'cms_token';

// Initial default team
const defaultTeam = [
  { id: 1, name: 'April', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { id: 2, name: 'Dian', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { id: 3, name: 'Taqi', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { id: 4, name: 'Amadea', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { id: 5, name: 'Anggi', role: 'Creative Director', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
];

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN);
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_TOKEN, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_TOKEN);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// Local storage helpers
export function getLocalPrompts(): PromptGalleryItem[] {
  const data = localStorage.getItem(STORAGE_PROMPTS);
  if (!data) {
    localStorage.setItem(STORAGE_PROMPTS, JSON.stringify(promptGalleryData));
    return promptGalleryData;
  }
  try {
    return JSON.parse(data);
  } catch {
    return promptGalleryData;
  }
}

export function saveLocalPrompts(prompts: PromptGalleryItem[]) {
  localStorage.setItem(STORAGE_PROMPTS, JSON.stringify(prompts));
}

export function getLocalNews(): NewsArticle[] {
  const data = localStorage.getItem(STORAGE_NEWS);
  if (!data) {
    localStorage.setItem(STORAGE_NEWS, JSON.stringify(mockNews));
    return mockNews;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockNews;
  }
}

export function saveLocalNews(news: NewsArticle[]) {
  localStorage.setItem(STORAGE_NEWS, JSON.stringify(news));
}

export function getLocalTeam(): any[] {
  const data = localStorage.getItem(STORAGE_TEAM);
  if (!data) {
    localStorage.setItem(STORAGE_TEAM, JSON.stringify(defaultTeam));
    return defaultTeam;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultTeam;
  }
}

export function saveLocalTeam(team: any[]) {
  localStorage.setItem(STORAGE_TEAM, JSON.stringify(team));
}

// Auth Login
export async function login(username: string, password: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      return data;
    }
  } catch {
    // Backend is offline, fallback to built-in admin credentials
  }

  if (username === 'admin' && password === 'admin123') {
    const fakeToken = 'local_session_' + Date.now();
    setToken(fakeToken);
    return { token: fakeToken, user: { username: 'admin', displayName: 'Administrator' } };
  }
  throw new Error('Username atau password salah');
}

// Dashboard Stats
export async function getStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  const prompts = getLocalPrompts().length;
  const news = getLocalNews().length;
  const team = getLocalTeam().length;
  return { prompts, news, team };
}

// Prompts CRUD
export async function getPrompts(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/prompts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  return getLocalPrompts().map(p => ({
    ...p,
    aspect_ratio: p.aspectRatio,
    negative_prompt: p.negativePrompt,
  }));
}

export async function createPrompt(data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/prompts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  // Local fallback
  const list = getLocalPrompts();
  const title = (data.get('title') as string) || 'Untitled';
  const file = data.get('image') as File | null;
  let src = '/images/buah-naga-estetik.jpg';
  
  if (file && file.size > 0) {
    try {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } catch {}
  }

  const tagsRaw = data.get('tags') as string;
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(tagsRaw);
  } catch {
    parsedTags = (tagsRaw || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  const newPrompt: PromptGalleryItem = {
    id: `pg-${Date.now()}`,
    title,
    category: (data.get('category') as string) || 'General',
    type: (data.get('type') as any) || 'photo',
    orientation: (data.get('orientation') as any) || 'portrait',
    aspectRatio: (data.get('aspect_ratio') as any) || '9:16',
    prompt: (data.get('prompt') as string) || '',
    negativePrompt: (data.get('negative_prompt') as string) || '',
    model: (data.get('model') as string) || 'Midjourney v6.1',
    seed: (data.get('seed') as string) || '123456789',
    src,
    tags: parsedTags,
  };

  list.unshift(newPrompt);
  saveLocalPrompts(list);
  return { message: 'Prompt created locally', id: newPrompt.id };
}

export async function updatePrompt(id: string, data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/prompts/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalPrompts();
  const index = list.findIndex(p => p.id === id);
  if (index !== -1) {
    const file = data.get('image') as File | null;
    let src = list[index].src;
    if (file && file.size > 0) {
      try {
        src = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } catch {}
    }

    const tagsRaw = data.get('tags') as string;
    let parsedTags: string[] = list[index].tags;
    try {
      parsedTags = JSON.parse(tagsRaw);
    } catch {
      if (tagsRaw) parsedTags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    list[index] = {
      ...list[index],
      title: (data.get('title') as string) || list[index].title,
      category: (data.get('category') as string) || list[index].category,
      type: (data.get('type') as any) || list[index].type,
      orientation: (data.get('orientation') as any) || list[index].orientation,
      aspectRatio: (data.get('aspect_ratio') as any) || list[index].aspectRatio,
      prompt: (data.get('prompt') as string) || list[index].prompt,
      negativePrompt: (data.get('negative_prompt') as string) || list[index].negativePrompt,
      model: (data.get('model') as string) || list[index].model,
      seed: (data.get('seed') as string) || list[index].seed,
      src,
      tags: parsedTags,
    };
    saveLocalPrompts(list);
  }
  return { message: 'Prompt updated locally' };
}

export async function deletePrompt(id: string) {
  try {
    const res = await fetch(`${API_BASE}/prompts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalPrompts().filter(p => p.id !== id);
  saveLocalPrompts(list);
  return { message: 'Prompt deleted locally' };
}

// News CRUD
export async function getNewsList(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/news`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  return getLocalNews().map(n => ({
    ...n,
    reading_time: n.readingTime,
    featured: n.featured ? 1 : 0,
  }));
}

export async function createNews(data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/news`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalNews();
  const file = data.get('thumbnail') as File | null;
  let thumbnail = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop';
  
  if (file && file.size > 0) {
    try {
      thumbnail = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } catch {}
  }

  const newItem: NewsArticle = {
    id: `news-${Date.now()}`,
    title: (data.get('title') as string) || 'Untitled',
    description: (data.get('description') as string) || '',
    category: (data.get('category') as string) || 'General',
    author: (data.get('author') as string) || 'Admin',
    date: (data.get('date') as string) || new Date().toLocaleDateString(),
    thumbnail,
    readingTime: (data.get('reading_time') as string) || '5 min',
    featured: data.get('featured') === '1',
  };

  list.unshift(newItem);
  saveLocalNews(list);
  return { message: 'News created locally', id: newItem.id };
}

export async function updateNews(id: string, data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/news/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalNews();
  const index = list.findIndex(n => n.id === id);
  if (index !== -1) {
    const file = data.get('thumbnail') as File | null;
    let thumbnail = list[index].thumbnail;
    if (file && file.size > 0) {
      try {
        thumbnail = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } catch {}
    }

    list[index] = {
      ...list[index],
      title: (data.get('title') as string) || list[index].title,
      description: (data.get('description') as string) || list[index].description,
      category: (data.get('category') as string) || list[index].category,
      author: (data.get('author') as string) || list[index].author,
      date: (data.get('date') as string) || list[index].date,
      thumbnail,
      readingTime: (data.get('reading_time') as string) || list[index].readingTime,
      featured: data.get('featured') === '1',
    };
    saveLocalNews(list);
  }
  return { message: 'News updated locally' };
}

export async function deleteNews(id: string) {
  try {
    const res = await fetch(`${API_BASE}/news/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalNews().filter(n => n.id !== id);
  saveLocalNews(list);
  return { message: 'News deleted locally' };
}

// Team CRUD
export async function getTeam(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/team`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  return getLocalTeam();
}

export async function createTeamMember(data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/team`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalTeam();
  const file = data.get('image') as File | null;
  let image = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
  if (file && file.size > 0) {
    try {
      image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } catch {}
  }

  const member = {
    id: Date.now(),
    name: (data.get('name') as string) || 'New Member',
    role: (data.get('role') as string) || 'Member',
    image,
  };
  list.push(member);
  saveLocalTeam(list);
  return { message: 'Member created locally', id: member.id };
}

export async function updateTeamMember(id: number, data: FormData) {
  try {
    const res = await fetch(`${API_BASE}/team/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data,
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalTeam();
  const index = list.findIndex(m => m.id === id);
  if (index !== -1) {
    const file = data.get('image') as File | null;
    let image = list[index].image;
    if (file && file.size > 0) {
      try {
        image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } catch {}
    }

    list[index] = {
      ...list[index],
      name: (data.get('name') as string) || list[index].name,
      role: (data.get('role') as string) || list[index].role,
      image,
    };
    saveLocalTeam(list);
  }
  return { message: 'Member updated locally' };
}

export async function deleteTeamMember(id: number) {
  try {
    const res = await fetch(`${API_BASE}/team/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) return await res.json();
  } catch {}

  const list = getLocalTeam().filter(m => m.id !== id);
  saveLocalTeam(list);
  return { message: 'Member deleted locally' };
}
