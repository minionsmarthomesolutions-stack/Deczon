'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { auth, db } from '@/lib/firebase'
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Check Firebase initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkFirebase = () => {
        if (auth) {
          setFirebaseReady(true)
        } else {
          // Retry after a short delay
          setTimeout(checkFirebase, 100)
        }
      }
      checkFirebase()
    }
  }, [])

  // Don't pre-initialize reCAPTCHA - create it on-demand when needed
  // This avoids issues with DOM readiness and ensures clean state

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

    if (!firebaseReady || !auth) {
      setError('Firebase is not ready. Please wait a moment and try again, or refresh the page.')
      return
    }

    const container = document.getElementById('recaptcha-container')
    if (!container) {
      setError('reCAPTCHA container not found. Please refresh the page.')
      return
    }

    // Only create the verifier once and reuse it
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved')
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired')
          }
        })
        console.log('reCAPTCHA verifier initialized')
      } catch (e: any) {
        console.error('Error initializing reCAPTCHA:', e)
        setError(e?.message || 'Failed to initialize reCAPTCHA. Please refresh the page.')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const fullPhoneNumber = '+91' + phoneNumber
      console.log('Sending OTP to:', fullPhoneNumber)

      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current!)

      setConfirmationResult(confirmation)
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

    if (!confirmationResult) {
      setError('OTP session expired. Please request a new OTP.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await confirmationResult.confirm(otpCode)
      const user = result.user

      // Store user session
      if (typeof window !== 'undefined') {
        localStorage.setItem('userPhone', phoneNumber)
        localStorage.setItem('isLoggedIn', 'true')
      }

      // Save/update user data in Firestore
      if (db && user.phoneNumber) {
        const userPhone = user.phoneNumber.replace('+91', '')
        try {
          const userDoc = await getDoc(doc(db, 'users', userPhone))
          if (!userDoc.exists()) {
            // Create new user document
            await setDoc(doc(db, 'users', userPhone), {
              phoneNumber: user.phoneNumber,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            })
          } else {
            // Update last login
            await setDoc(doc(db, 'users', userPhone), {
              lastLogin: new Date().toISOString()
            }, { merge: true })
          }
        } catch (error) {
          console.warn('Error saving user data:', error)
          // Continue even if Firestore save fails
        }
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

    if (!firebaseReady || !auth) {
      setError('Firebase is not ready. Please wait a moment and try again, or refresh the page.')
      return
    }

    const container = document.getElementById('recaptcha-container')
    if (!container) {
      setError('reCAPTCHA container not found. Please refresh the page.')
      return
    }

    // Reuse existing verifier if available, otherwise create a new one
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved for resend')
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired')
          }
        })
        console.log('reCAPTCHA verifier initialized for resend')
      } catch (e: any) {
        console.error('Error initializing reCAPTCHA for resend:', e)
        setError(e?.message || 'Failed to initialize reCAPTCHA. Please refresh the page.')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const fullPhoneNumber = '+91' + phoneNumber
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current!)

      setConfirmationResult(confirmation)
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

          {/* reCAPTCHA container (invisible) */}
          <div id="recaptcha-container"></div>

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
