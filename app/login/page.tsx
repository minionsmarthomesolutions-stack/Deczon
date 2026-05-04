'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getAuthInstance } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import styles from './login.module.css'


function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [showOtp, setShowOtp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Initialize Firebase Recaptcha
  useEffect(() => {
    const auth = getAuthInstance();
    if (auth && typeof window !== 'undefined' && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      setFirebaseReady(true);
    }
  }, [])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
    setPhoneNumber(value)
  }

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...otp]
    newOtp[index] = value.replace(/[^0-9]/g, '').slice(0, 1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    // Auto-verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      setTimeout(() => handleVerifyOtp(newOtp.join('')), 500)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const fullPhoneNumber = '+91' + phoneNumber
      console.log('Sending OTP to:', fullPhoneNumber)

      const auth = getAuthInstance();
      const appVerifier = (window as any).recaptchaVerifier;
      if (!auth || !appVerifier) throw new Error('Auth not initialized properly');

      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);

      setShowOtp(true)
      setResendTimer(30)

      // Focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (error: any) {
      console.error('Error sending OTP:', error)

      let errorMessage = 'Failed to send OTP. Please try again.'
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number. Please check and try again.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.'
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.'
      } else if (error.code === 'auth/invalid-app-credential') {
        errorMessage =
          'Authentication configuration error. Please ensure:\n1. Phone Authentication is enabled in Firebase Console\n2. localhost and 127.0.0.1 are added to Authorized Domains\n3. Try refreshing the page'
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (otpValue?: string) => {
    const otpCode = otpValue || otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!confirmationResult) throw new Error('No OTP confirmation object. Please try sending OTP again.');
      
      const result = await confirmationResult.confirm(otpCode);

      if (!result.user) {
        throw new Error('Verification failed')
      }

      // Store user session
      if (typeof window !== 'undefined') {
        localStorage.setItem('userPhone', phoneNumber)
        localStorage.setItem('isLoggedIn', 'true')
      }

      // Save/update user data in Supabase (JSONB)
      try {
        const { data: userDoc } = await supabase.from('users').select('*').eq('id', phoneNumber).maybeSingle()
        if (!userDoc) {
          // Create new user document
          await supabase.from('users').insert({
            id: phoneNumber,
            document: {
              phoneNumber: '+91' + phoneNumber,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            }
          })
        } else {
          // Update last login
          const curDoc = userDoc.document || {}
          await supabase.from('users').update({
            document: {
              ...curDoc,
              lastLogin: new Date().toISOString()
            }
          }).eq('id', phoneNumber)
        }
      } catch (error) {
        console.warn('Error saving user data:', error)
      }

      // Redirect
      const redirectUrl = searchParams.get('redirect') ||
        (typeof window !== 'undefined' ? localStorage.getItem('redirectAfterLogin') : null) ||
        '/'

      if (typeof window !== 'undefined') {
        localStorage.removeItem('redirectAfterLogin')
      }

      router.push(redirectUrl)
    } catch (error: any) {
      console.error('Error verifying OTP:', error)
      setError('Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setLoading(true)
    setError('')

    try {
      const fullPhoneNumber = '+91' + phoneNumber
      const auth = getAuthInstance();
      const appVerifier = (window as any).recaptchaVerifier;
      if (!auth || !appVerifier) throw new Error('Auth not initialized properly');
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);

      setResendTimer(30)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (error: any) {
      console.error('Error resending OTP:', error)
      setError(error.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      {/* Left Section - Hero Image / Branding */}
      <div className={styles.imageSection}>
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.brandContent}>
          <h2 className={styles.brandTitle}>Smart Living.</h2>
          <p className={styles.brandSubtitle}>
            Experience the future of home automation with DECZON.
            Seamless control, enhanced security, and ultimate comfort.
          </p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className={styles.formSection}>
        <div className={styles.loginContainer}>
          {loading && (
            <div className={styles.loadingOverlay}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>{showOtp ? 'Verifying...' : 'Sending OTP...'}</div>
            </div>
          )}

          <div id="recaptcha-container"></div>
          <div className={styles.loginHeader}>
            <div className={styles.logo}>
              <Link href="/">
                <Image
                  src="/LOGO/d__1_-removebg-preview.png"
                  alt="DECZON Logo"
                  width={240}
                  height={80}
                  priority
                  style={{ objectFit: 'contain', height: 'auto', width: 'auto', maxHeight: '80px' }}
                />
              </Link>
            </div>
            <h1 className={styles.loginTitle}>Welcome Back</h1>
            <p className={styles.loginSubtitle}>
              {showOtp ? 'Enter the verification code sent to your mobile' : 'Access your smart home dashboard securely'}
            </p>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}



          {/* Phone Number Step */}
          {!showOtp && (
            <div className={styles.phoneStep}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="phoneNumber">
                  Mobile Number
                </label>
                <div className={styles.phoneInputContainer}>
                  <div className={styles.countryCode}>
                    <span>🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    id="phoneNumber"
                    className={styles.formInput}
                    placeholder="Enter your mobile number"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    disabled={loading}
                    autoComplete="tel"
                  />
                </div>
              </div>
              <button
                className={styles.btnPrimary}
                onClick={handleSendOtp}
                disabled={loading || phoneNumber.length !== 10}
              >
                {loading ? 'Sending Verification...' : 'Get Verification Code'}
              </button>
            </div>
          )}

          {/* OTP Verification Step */}
          {showOtp && (
            <div className={styles.otpStep}>
              <div className={styles.formGroup}>
                <p className={styles.loginSubtitle} style={{ textAlign: 'center', marginBottom: '24px' }}>
                  We sent a 6-digit code to <strong>+91 {phoneNumber}</strong>
                  <br />
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowOtp(false); }} style={{ color: '#ffc000', fontSize: '0.9em', textDecoration: 'none' }}>
                    Change Number
                  </a>
                </p>
              </div>

              <div className={styles.otpInputs}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    className={styles.otpInput}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    autoFocus={index === 0}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <button
                className={styles.btnPrimary}
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? 'Verifying Code...' : 'Verify & Login'}
              </button>

              <div className={styles.resendOtp}>
                <button
                  className={`${styles.resendLink} ${resendTimer > 0 ? styles.disabled : ''}`}
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                >
                  Resend Code
                </button>
                {resendTimer > 0 && (
                  <div className={styles.timer}>
                    Wait {resendTimer}s to resend
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.backToHome}>
            <Link href="/">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
