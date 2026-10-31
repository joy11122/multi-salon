import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#0B0B0B', panel: '#171717', gold: '#C6A15B', cream: '#F5F1E8' }, fontFamily: { display: ['Georgia', 'serif'], sans: ['Arial', 'sans-serif'] } } }, plugins: [] };
export default config;
