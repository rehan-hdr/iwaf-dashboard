'use client';

import { useState, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clerk appends __clerk_ticket when the user clicks the invitation link
  const ticket = searchParams.get('__clerk_ticket');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || !ticket) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signUp.create({
        strategy: 'ticket',
        ticket,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/');
      } else {
        setError('Sign-up could not be completed. Please try again.');
      }
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If there is no ticket the user navigated here manually — block access
  if (isLoaded && !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 mb-6">
            Sign-up is by invitation only. Please use the link sent to your
            email or contact your administrator.
          </p>
          <a
            href="/sign-in"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#FF7A50] to-[#FF9068] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF7A50] to-[#FF9068] text-white flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl font-bold">IW</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome to IWAF</h1>
          <p className="text-white/80 text-lg">
            You&apos;ve been invited to join the IWAF Dashboard. Set your
            password below to get started.
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF7A50] to-[#FF9068] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">IW</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">IWAF</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Set your password</h2>
          <p className="text-gray-500 mb-8">Create a secure password to activate your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none transition-shadow text-gray-900 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none transition-shadow text-gray-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#FF7A50] to-[#FF9068] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <a href="/sign-in" className="text-[#FF7A50] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
