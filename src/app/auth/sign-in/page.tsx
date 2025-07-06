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
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md bg-[#1E1E1E] border-gray-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl text-[#F2F2F2]">Sign in</CardTitle>
          <CardDescription className="text-sm sm:text-base text-[#C7C7C7]">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <SignInForm />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-[#C7C7C7] text-center sm:text-left">
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
            className="text-xs sm:text-sm text-[#9146FF] underline-offset-4 transition-colors hover:underline text-center sm:text-right"
          >
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 