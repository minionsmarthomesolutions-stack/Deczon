import React from 'react'
import styles from '../legal-pages.module.css'

export default function TermsConditionsPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Terms and Conditions</h1>
            <p className={styles.lastUpdated}>Last Updated: December 30, 2025</p>

            <section className={styles.section}>
                <h2 className={styles.heading}>1. Introduction</h2>
                <p className={styles.text}>
                    Welcome to Deczon! These terms and conditions outline the rules and regulations for the use of Deczon's Website. By accessing this website we assume you accept these terms and conditions. Do not continue to use Deczon if you do not agree to take all of the terms and conditions stated on this page.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>2. License</h2>
                <p className={styles.text}>
                    Unless otherwise stated, Deczon and/or its licensors own the intellectual property rights for all material on Deczon. All intellectual property rights are reserved. You may access this from Deczon for your own personal use subjected to restrictions set in these terms and conditions.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>3. Product Descriptions</h2>
                <p className={styles.text}>
                    Deczon attempts to be as accurate as possible. However, Deczon does not warrant that product descriptions or other content of this site is accurate, complete, reliable, current, or error-free. If a product offered by Deczon itself is not as described, your sole remedy is to return it in unused condition.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>4. Pricing</h2>
                <p className={styles.text}>
                    Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.
                </p>
            </section>
        </div>
    )
}
