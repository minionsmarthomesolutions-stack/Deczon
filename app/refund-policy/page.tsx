import React from 'react'
import styles from '../legal-pages.module.css'

export default function RefundPolicyPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Refund and Cancellation Policy</h1>
            <p className={styles.lastUpdated}>Last Updated: December 30, 2025</p>

            <section className={styles.section}>
                <h2 className={styles.heading}>Cancellation Policy</h2>
                <p className={styles.text}>
                    You can cancel your order before it has been shipped. To cancel your order, please contact our support team immediately at minionsmarthome@gmail.com with your order details. If the order has already been shipped, we may not be able to cancel it.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Return Policy</h2>
                <p className={styles.text}>
                    We accept returns within 7 days of the delivery date. To be eligible for a return, your item must be unrelated, in the same condition that you received it, and in the original packaging.
                </p>
                <ul className={styles.list}>
                    <li className={styles.listItem}>Items must be unused and in original condition.</li>
                    <li className={styles.listItem}>Proof of purchase is required.</li>
                    <li className={styles.listItem}>Customized or installed products (like home automation setups) may not be eligible for return unless defective.</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Refunds</h2>
                <p className={styles.text}>
                    Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.
                    If you are approved, then your refund will be processed, and a credit will automatically be applied to your original method of payment, within 5-7 business days.
                </p>
            </section>
        </div>
    )
}
