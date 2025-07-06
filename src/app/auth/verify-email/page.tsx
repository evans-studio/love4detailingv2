import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Verify Email - Love4Detailing',
  description: 'Please verify your email address to complete your registration.',
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#1E1E1E] border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F2F2F2]">Check your email</CardTitle>
          <CardDescription className="text-[#C7C7C7]">
            We&apos;ve sent you a verification link to complete your registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#C7C7C7]">
            Please check your email inbox and click the verification link to complete your registration.
            If you don&apos;t see the email, please check your spam folder.
          </p>
          <div className="flex flex-col space-y-2">
            <Link href="/auth/sign-in">
              <Button variant="outline" className="w-full">
                Return to sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 