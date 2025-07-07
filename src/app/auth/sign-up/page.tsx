import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = {
  title: 'Sign Up - Love4Detailing',
  description: 'Create your Love4Detailing account to start booking car detailing services.',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#1E1E1E] border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F2F2F2]">Create an account</CardTitle>
          <CardDescription className="text-[#C7C7C7]">
            Enter your details to create your Love4Detailing account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <div className="text-sm text-[#C7C7C7]">
            <span>Already have an account? </span>
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