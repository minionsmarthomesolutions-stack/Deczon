'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export default function Footer() {
  const [services, setServices] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    loadDynamicCategories()
  }, [])

  const loadDynamicCategories = async () => {
    if (!db) {
      // Fallback static services
      setServices(['Smart Home', 'Lighting', 'Security', 'Audio', 'Climate Control'])
      setLoadingServices(false)
      return
    }

    try {
      // Try loading from categories collection
      const categoriesSnapshot = await getDocs(collection(db, 'categories'))
      let categoriesData: any = null

      if (!categoriesSnapshot.empty) {
        const transformed: any = {}
        categoriesSnapshot.forEach((docSnapshot) => {
          const d = docSnapshot.data() || {}
          const main = docSnapshot.id
          if (d && d.subcategories) {
            transformed[main] = { subcategories: {} }
            Object.keys(d.subcategories).forEach((sub) => {
              transformed[main].subcategories[sub] = d.subcategories[sub]
            })
          }
        })
        if (Object.keys(transformed).length > 0) {
          categoriesData = normalizeCategories(transformed)
        }
      }

      // If no categories from collection, try structure doc
      if (!categoriesData) {
        const categoriesDoc = await getDoc(doc(db, 'categories', 'structure'))
        if (categoriesDoc.exists()) {
          const raw = categoriesDoc.data().categories || {}
          categoriesData = normalizeCategories(raw)
        }
      }

      if (categoriesData && Object.keys(categoriesData).length > 0) {
        const mainCategories = Object.keys(categoriesData).slice(0, 5)
        setServices(mainCategories)
      } else {
        setServices(['Smart Home', 'Lighting', 'Security', 'Audio', 'Climate Control'])
      }
    } catch (error) {
      console.warn('Error loading categories for footer:', error)
      setServices(['Smart Home', 'Lighting', 'Security', 'Audio', 'Climate Control'])
    } finally {
      setLoadingServices(false)
    }
  }

  const normalizeCategories = (source: any) => {
    const out: any = {}
    Object.keys(source || {}).forEach((main) => {
      const mainData = source[main] || {}
      const subs = mainData.subcategories || {}
      out[main] = {}
      Object.keys(subs).forEach((sub) => {
        const subData = subs[sub] || {}
        const items = Array.isArray(subData.items) ? subData.items : (Array.isArray(subData) ? subData : [])
        out[main][sub] = items
      })
    })
    return out
  }

  const handleNewsletter = () => {
    alert('Thank you for subscribing to our newsletter!')
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        {/* Main Footer Content */}
        <div className={styles.footerMain}>
          {/* Company Information */}
          <div className={styles.footerColumn}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogoContainer}>
                <Image
                  src="/images/FINAL_QUOTE_OF_MRS._CHHAYA_KUMARI-removebg-preview.png"
                  alt="Minion Smart Home Solutions"
                  width={150}
                  height={150}
                  className={styles.footerLogoImg}
                  style={{ width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    // Fallback if image doesn't load
                    try {
                      const target = e.target as HTMLImageElement
                      if (target) {
                        target.style.display = 'none'
                        const container = target.parentElement
                        if (container && !container.querySelector('.footer-logo-text')) {
                          const textLogo = document.createElement('div')
                          textLogo.className = 'footer-logo-text'
                          textLogo.textContent = 'DECZON'
                          textLogo.style.cssText = 'font-size: 32px; font-weight: 800; color: white;'
                          container.appendChild(textLogo)
                        }
                      }
                    } catch (error) {
                      // Silently handle errors to prevent HMR issues
                      console.warn('Error handling image fallback:', error)
                    }
                  }}
                />
              </div>
              <p className={styles.footerTagline}>Smart Home And Interior Solutions</p>
              <p className={styles.footerDescription}>
                Deczon is part of Minion Smart Home Solutions, specializing in advanced smart home automation and design. Your one-stop destination for smart home automation, interiors, and lifestyle solutions. We specialize in creating seamless, intelligent spaces that blend technology with design to elevate your daily life. Whether it&apos;s enhancing your home&apos;s comfort with automated systems or transforming interiors with modern designs, we bring your vision to life with precision and style.
              </p>

              {/* Partners & Resources */}
              <div className={styles.footerPartners}>
                <h4 className={styles.footerHeading}>OUR AFFILIATES</h4>
                <p className={styles.partnersDescription}>
                  Discover our trusted affiliates in the field of smart home solutions and interior design.
                </p>
                <ul className={styles.footerLinks}>
                  <li>
                    <a
                      href="https://www.smarthomeindia.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.partnerLink}
                    >
                      Smart Home India
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.homeautomationchennai.com/about.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.partnerLink}
                    >
                      Home Automation Chennai
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className={`${styles.footerColumn} ${styles.footerQuickLinks}`}>
            <h4 className={styles.footerHeading}>QUICK LINKS</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/#about">About Us</Link></li>
              <li><Link href="/products">Products</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/#contact">Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerHeading}>SERVICES</h4>
            <ul className={styles.footerLinks} id="footer-services-list">
              {loadingServices ? (
                <li style={{ color: '#ffd700' }}>Loading categories...</li>
              ) : (
                services.map((service) => (
                  <li key={service}>
                    <Link href={`/products?mainCategory=${encodeURIComponent(service)}`}>
                      {service}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Make Money with Us */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerHeading}>MAKE MONEY WITH US</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/#supply-to-deczon">Supply to Deczon</Link></li>
              <li><Link href="/#sell-on-deczon">Sell on Deczon</Link></li>
              <li><Link href="/#become-affiliate">Become an Affiliate</Link></li>
              <li><Link href="/#advertise-products">Advertise Your Products</Link></li>
            </ul>
          </div>

          {/* Let Us Help You */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerHeading}>LET US HELP YOU</h4>
            <ul className={styles.footerLinks}>
              <li><Link href="/account">Your Account</Link></li>
              <li><Link href="/#help-center">Help Center</Link></li>
              <li><Link href="/#customer-service">Customer Service</Link></li>
              <li><Link href="/#support">Support</Link></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerHeading}>CONTACT</h4>
            <div className={styles.footerContactSection}>
              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>📞</div>
                <div className={styles.contactContent}>
                  <h5 className={styles.contactLabel}>CALL NOW</h5>
                  <div className={styles.contactDetails}>
                    <p>+91 9655006069</p>
                    <p>+91 9655006439</p>
                    <p>+91 9655009199</p>
                  </div>
                </div>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>✉️</div>
                <div className={styles.contactContent}>
                  <h5 className={styles.contactLabel}>EMAIL</h5>
                  <div className={styles.contactDetails}>
                    <p>minionsmarthome@gmail.com</p>
                  </div>
                </div>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>📍</div>
                <div className={styles.contactContent}>
                  <h5 className={styles.contactLabel}>ADDRESS</h5>
                  <div className={styles.contactDetails}>
                    <p>30, Arcot road, Virugambakkam,</p>
                    <p>Chennai. 600092</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media & Newsletter Section */}
        <div className={styles.footerSocialNewsletter}>
          <div className={styles.footerSocial}>
            <a href="#" className={styles.socialLink} aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className={styles.socialLink} aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className={styles.socialLink} aria-label="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="#" className={styles.socialLink} aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="#" className={styles.socialLink} aria-label="Pinterest">
              <i className="fab fa-pinterest-p"></i>
            </a>
          </div>

          <div className={styles.footerNewsletter}>
            <p className={styles.newsletterText}>
              Subscribe for updates on new smart home products and exclusive offers.
            </p>
            <button className={styles.newsletterBtn} onClick={handleNewsletter}>
              Subscribe
            </button>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className={styles.footerCopyright}>
          <p>© {new Date().getFullYear()} Deczon. All Rights Reserved. | Designed by Minion Smart Home Solutions</p>
        </div>
      </div>
    </footer>
  )
}

