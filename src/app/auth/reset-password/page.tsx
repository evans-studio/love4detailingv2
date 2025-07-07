import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password - Love4Detailing',
  description: 'Reset your Love4Detailing account password.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#1E1E1E] border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F2F2F2]">Reset password</CardTitle>
          <CardDescription className="text-[#C7C7C7]">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
        <CardFooter>
          <div className="text-sm text-[#C7C7C7]">
            <span>Remember your password? </span>
            <Link
              href="/auth/sign-in"
              className="text-[#9146FF] underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 