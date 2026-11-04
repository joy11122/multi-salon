import { AuthForm } from '@/components/auth-form';

type LoginPageProps = {
  searchParams?: { callbackUrl?: string | string[] };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const requested = searchParams?.callbackUrl;
  const callbackUrl = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/dashboard';

  return <main className="min-h-[75vh] px-5 py-20"><AuthForm mode="login" callbackUrl={callbackUrl} googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)}/></main>;
}
