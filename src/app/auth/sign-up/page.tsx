import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = {
  title: 'Sign Up - Love4Detailing',
  description: 'Create your Love4Detailing account to start booking car detailing services.',
};

export default function SignUpPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your details to create your Love4Detailing account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted">
            <span>Already have an account? </span>
            <Link
              href="/auth/sign-in"
              className="text-primary-500 underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 