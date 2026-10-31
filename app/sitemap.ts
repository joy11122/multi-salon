import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const base=process.env.NEXT_PUBLIC_APP_URL||'https://example.com';return ['','/about','/services','/barbers','/gallery','/booking','/contact','/privacy'].map((path)=>({url:`${base}${path}`,lastModified:new Date(),changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:0.7})); }
