export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  date: string;
  thumbnail: string;
  readingTime: string;
  featured: boolean;
}

export const mockCategories = [
  'All', 'Photography', 'Development', 'Events', 'Design', 'Creative', 'Technology', 'Video', 'Social Media'
];

export const mockNews: NewsArticle[] = [
  {
    id: '1',
    title: 'Exploring the New Era of Web Design in 2026',
    description: 'A deep dive into how AI and 3D rendering are changing the landscape of interactive web experiences.',
    category: 'Design',
    author: 'April',
    date: 'July 15, 2026',
    thumbnail: '/src/assets/news/article-01.jpg',
    readingTime: '5 min',
    featured: true
  },
  {
    id: '2',
    title: 'The Evolution of Photography in the Digital Age',
    description: 'How modern cameras and computational photography are pushing the boundaries of what is possible.',
    category: 'Photography',
    author: 'Dian',
    date: 'July 10, 2026',
    thumbnail: '/src/assets/news/article-02.jpg',
    readingTime: '8 min',
    featured: true
  },
  {
    id: '3',
    title: 'Behind the Scenes: Creative Coding',
    description: 'An inside look at our process of building generative art and complex web animations using WebGL.',
    category: 'Development',
    author: 'Taqi',
    date: 'July 05, 2026',
    thumbnail: '/src/assets/news/article-03.jpg',
    readingTime: '6 min',
    featured: true
  },
  {
    id: '4',
    title: 'Future Tech Summit Highlights',
    description: 'The best moments and key takeaways from the biggest tech event of the year.',
    category: 'Events',
    author: 'Amadea',
    date: 'June 28, 2026',
    thumbnail: '/src/assets/news/article-04.jpg',
    readingTime: '4 min',
    featured: false
  },
  {
    id: '5',
    title: 'The Rise of Immersive Video Content',
    description: 'Why brands are shifting towards interactive and immersive storytelling over traditional video.',
    category: 'Video',
    author: 'Nadine',
    date: 'June 20, 2026',
    thumbnail: '/src/assets/news/article-05.jpg',
    readingTime: '7 min',
    featured: false
  },
  {
    id: '6',
    title: 'Mastering Social Media Algorithms',
    description: 'A comprehensive guide to understanding and leveraging social media algorithms for organic growth.',
    category: 'Social Media',
    author: 'Naura',
    date: 'June 15, 2026',
    thumbnail: '/src/assets/news/article-06.jpg',
    readingTime: '10 min',
    featured: false
  },
  {
    id: '7',
    title: 'Building Scalable Next.js Applications',
    description: 'Best practices for organizing and optimizing your Next.js projects for performance and maintainability.',
    category: 'Development',
    author: 'Anggi',
    date: 'June 10, 2026',
    thumbnail: '/src/assets/news/article-07.jpg',
    readingTime: '12 min',
    featured: false
  },
  {
    id: '8',
    title: 'Minimalism in UI Design',
    description: 'How to achieve more with less, focusing on content and user experience without unnecessary clutter.',
    category: 'Design',
    author: 'Amany',
    date: 'June 05, 2026',
    thumbnail: '/src/assets/news/article-08.jpg',
    readingTime: '5 min',
    featured: false
  },
  {
    id: '9',
    title: 'The Art of Storytelling in Tech',
    description: 'Translating complex technical concepts into engaging stories that resonate with a wider audience.',
    category: 'Creative',
    author: 'Ropaldo',
    date: 'May 30, 2026',
    thumbnail: '/src/assets/news/article-09.jpg',
    readingTime: '6 min',
    featured: false
  },
  {
    id: '10',
    title: 'Upcoming Tech Trends for Q4',
    description: 'Predictions on which technologies will dominate the market in the last quarter of the year.',
    category: 'Technology',
    author: 'April',
    date: 'May 25, 2026',
    thumbnail: '/src/assets/news/article-10.jpg',
    readingTime: '8 min',
    featured: false
  },
  {
    id: '11',
    title: 'Lighting Techniques for Portrait Photography',
    description: 'A practical guide to mastering studio and natural lighting for stunning portraits.',
    category: 'Photography',
    author: 'Dian',
    date: 'May 20, 2026',
    thumbnail: '/src/assets/news/article-11.jpg',
    readingTime: '7 min',
    featured: false
  },
  {
    id: '12',
    title: 'Framer Motion: Advanced Animations',
    description: 'Taking your React applications to the next level with complex, physics-based animations.',
    category: 'Development',
    author: 'Taqi',
    date: 'May 15, 2026',
    thumbnail: '/src/assets/news/article-12.jpg',
    readingTime: '9 min',
    featured: false
  },
  {
    id: '13',
    title: 'Community Meetup Recap',
    description: 'A huge thank you to everyone who joined our local creative community meetup last weekend.',
    category: 'Events',
    author: 'Amadea',
    date: 'May 10, 2026',
    thumbnail: '/src/assets/news/article-13.jpg',
    readingTime: '3 min',
    featured: false
  },
  {
    id: '14',
    title: 'Editing Workflow for Short-form Video',
    description: 'Streamline your video editing process for TikTok, Reels, and YouTube Shorts.',
    category: 'Video',
    author: 'Nadine',
    date: 'May 05, 2026',
    thumbnail: '/src/assets/news/article-14.jpg',
    readingTime: '6 min',
    featured: false
  },
  {
    id: '15',
    title: 'Brand Identity Design Principles',
    description: 'Core concepts for creating a strong, memorable, and adaptable brand identity.',
    category: 'Design',
    author: 'Naura',
    date: 'May 01, 2026',
    thumbnail: '/src/assets/news/article-15.jpg',
    readingTime: '8 min',
    featured: false
  }
];
