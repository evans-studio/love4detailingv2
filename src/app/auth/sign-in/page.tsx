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
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#1E1E1E] border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F2F2F2]">Sign in</CardTitle>
          <CardDescription className="text-[#C7C7C7]">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-[#C7C7C7]">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/auth/sign-up"
              className="text-[#9146FF] underline-offset-4 transition-colors hover:underline"
            >
              Sign up
            </Link>
          </div>
          <Link
            href="/auth/reset-password"
            className="text-sm text-[#9146FF] underline-offset-4 transition-colors hover:underline"
          >
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 