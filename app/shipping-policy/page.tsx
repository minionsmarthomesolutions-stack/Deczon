import React from 'react'
import styles from '../legal-pages.module.css'

export default function ShippingPolicyPage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Shipping Policy</h1>
            <p className={styles.lastUpdated}>Last Updated: December 30, 2025</p>

            <section className={styles.section}>
                <h2 className={styles.heading}>Shipping Rates & Delivery Estimates</h2>
                <p className={styles.text}>
                    Shipping charges for your order will be calculated and displayed at checkout. We currently offer free shipping on most orders across India.
                </p>
                <ul className={styles.list}>
                    <li className={styles.listItem}><strong>Standard Shipping:</strong> 3-7 business days</li>
                    <li className={styles.listItem}><strong>Expedited Shipping:</strong> 2-4 business days (if available)</li>
                </ul>
                <p className={styles.text}>
                    Delivery delays can occasionally occur due to unforeseen circumstances or high volume.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Shipment Confirmation & Order Tracking</h2>
                <p className={styles.text}>
                    You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). The tracking number will be active within 24 hours. You can also view your order status in the "My Orders" section of your account.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Damages</h2>
                <p className={styles.text}>
                    Deczon is not liable for any products damaged or lost during shipping. If you received your order damaged, please contact the shipment carrier to file a claim. Please save all packaging materials and damaged goods before filing a claim. However, do reach out to our support team, and we will do our best to assist you.
                </p>
            </section>
        </div>
    )
}
