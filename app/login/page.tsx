import { AuthForm } from '@/components/auth-form';
export default function LoginPage(){return <main className="min-h-[75vh] px-5 py-20"><AuthForm mode="login" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)}/></main>;}
