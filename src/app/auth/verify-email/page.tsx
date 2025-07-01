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
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a verification link to complete your registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
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