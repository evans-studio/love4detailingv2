'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)


    try {
      const { error } = await signIn(email, password)


      if (error) {
        setError(error.message || 'Failed to sign in')
      } else {
        // Redirect to specific URL if provided, otherwise let middleware handle role-based redirect
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          // Let middleware handle role-based redirect by going to auth callback
          router.push('/auth/callback')
        }
      }
    } catch (error) {
      console.error('Login form error:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="w-full max-w-[200px] mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-lg overflow-hidden">
            <Image
              src="/logo.png"
              alt="Love4Detailing Logo"
              width={200}
              height={60}
              className="w-full h-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-white/70">
            Sign in to your Love4Detailing account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-white/70">
          <Link
            href="/auth/reset-password"
            className="text-primary hover:text-primary/80 hover:underline"
          >
            Forgot your password?
          </Link>
          
          <div>
            Don't have an account?{' '}
            <Link
              href={`/auth/register${redirectTo ? `?redirectTo=${redirectTo}` : ''}`}
              className="text-primary hover:text-primary/80 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
          
          <div className="pt-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}