import React from 'react'
import styles from '../legal-pages.module.css'

export default function PrivacyPolicyPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.lastUpdated}>Last Updated: December 30, 2025</p>

            <section className={styles.section}>
                <p className={styles.text}>
                    At Deczon, accessible from deczon.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Deczon and how we use it.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Information We Collect</h2>
                <p className={styles.text}>
                    The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
                </p>
                <ul className={styles.list}>
                    <li className={styles.listItem}>Name, email address, phone number</li>
                    <li className={styles.listItem}>Billing and shipping address</li>
                    <li className={styles.listItem}>Payment information (processed securely by Razorpay)</li>
                    <li className={styles.listItem}>Account login credentials</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>How We Use Your Information</h2>
                <ul className={styles.list}>
                    <li className={styles.listItem}>Provide, operate, and maintain our website</li>
                    <li className={styles.listItem}>Improve, personalize, and expand our website</li>
                    <li className={styles.listItem}>Understand and analyze how you use our website</li>
                    <li className={styles.listItem}>Process your transactions and manage your orders</li>
                    <li className={styles.listItem}>Communicate with you, including for customer service and updates</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Security</h2>
                <p className={styles.text}>
                    We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
                </p>
            </section>

            <div className={styles.contactBox}>
                <h3 className={styles.heading} style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Contact Us</h3>
                <p className={styles.text} style={{ marginBottom: 0 }}>
                    If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at <strong>minionsmarthome@gmail.com</strong>.
                </p>
            </div>
        </div>
    )
}
