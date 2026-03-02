'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verification code step (email OTP)
  const [step, setStep] = useState('credentials'); // 'credentials' | 'verify'
  const [code, setCode] = useState('');

  /** Redirect after a successful sign-in */
  const completeSignIn = async (result) => {
    await setActive({ session: result.createdSessionId });
    router.push('/');
  };

  /**
   * Drive the Clerk sign-in state-machine forward.
   * Handles: complete → redirect,
   *          needs_first_factor → attempt password,
   *          needs_second_factor → show email-code input.
   */
  const advanceSignIn = async (result) => {
    if (result.status === 'complete') {
      return completeSignIn(result);
    }

    if (result.status === 'needs_first_factor') {
      // Password wasn't consumed by create(); try it explicitly
      const firstFactor = await signIn.attemptFirstFactor({
        strategy: 'password',
        password,
      });
      return advanceSignIn(firstFactor); // recurse — may still need 2nd factor
    }

    if (result.status === 'needs_second_factor') {
      // Clerk requires an extra verification step (e.g. email code)
      // Try the available second-factor strategies
      const supported = result.supportedSecondFactors;
      const hasEmailCode = supported?.some((f) => f.strategy === 'email_code');
      const hasPhoneCode = supported?.some((f) => f.strategy === 'phone_code');
      const strategy = hasEmailCode ? 'email_code' : hasPhoneCode ? 'phone_code' : null;

      if (strategy) {
        await signIn.prepareSecondFactor({ strategy });
        setStep('verify');
        return; // wait for the user to enter the code
      }
    }

    // Fallback — unknown / unhandled status
    setError(`Sign-in could not be completed (status: ${result.status}). Check your Clerk dashboard settings.`);
  };

  /** Step 1 — email + password */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn.create({ identifier, password });
      await advanceSignIn(result);
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /** Step 2 — verification code (email / phone OTP) */
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });
      await advanceSignIn(result);
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        'Invalid code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF7A50] to-[#FF9068] text-white flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl font-bold">IW</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">IWAF Dashboard</h1>
          <p className="text-white/80 text-lg">
            Intelligent Web Application Firewall — monitor, analyse, and
            protect your applications in real time.
          </p>
        </div>
      </div>

      {/* Right Panel — Sign-in Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF7A50] to-[#FF9068] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">IW</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">IWAF</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-8">
            {step === 'credentials'
              ? 'Sign in to your account to continue'
              : 'A verification code was sent to your email'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Username
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none transition-shadow text-gray-900"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#FF7A50] to-[#FF9068] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: Verification code ── */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none transition-shadow text-gray-900 text-center tracking-widest text-lg"
                  placeholder="Enter code"
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
                    Verifying…
                  </>
                ) : (
                  'Verify & Sign in'
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setCode(''); setError(''); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to credentials
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            Access is by invitation only. Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
