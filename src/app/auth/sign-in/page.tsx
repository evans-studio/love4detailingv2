import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { SignInForm } from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign In - Love4Detailing',
  description: 'Sign in to your Love4Detailing account to manage your bookings and rewards.',
};

export default function SignInPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/auth/sign-up"
              className="text-primary-500 underline-offset-4 transition-colors hover:underline"
            >
              Sign up
            </Link>
          </div>
          <Link
            href="/auth/reset-password"
            className="text-sm text-primary-500 underline-offset-4 transition-colors hover:underline"
          >
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 