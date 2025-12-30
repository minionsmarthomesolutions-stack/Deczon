'use client'

import React, { useState } from 'react'
import styles from '../legal-pages.module.css'

export default function ContactUsPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    })
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Simulate form submission
        console.log(formData)
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Contact Us</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginTop: '2rem' }}>
                <div>
                    <section className={styles.section}>
                        <h2 className={styles.heading}>Get in Touch</h2>
                        <p className={styles.text}>
                            Have questions about our smart home products or your order? We're here to help.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h3 className={styles.heading} style={{ fontSize: '1.25rem' }}>Office Address</h3>
                        <p className={styles.text}>
                            Deczon Smart Homes<br />
                            123 Tech Park, Electronics City<br />
                            Bangalore, Karnataka - 560100<br />
                            India
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h3 className={styles.heading} style={{ fontSize: '1.25rem' }}>Customer Support</h3>
                        <p className={styles.text}>
                            <strong>Email:</strong> minionsmarthome@gmail.com<br />
                            <strong>Phone:</strong> +91 96550 06069<br />
                            <strong>Hours:</strong> Mon-Sat, 9:00 AM - 6:00 PM
                        </p>
                    </section>
                </div>

                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 className={styles.heading} style={{ marginTop: 0 }}>Send us a message</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name</label>
                            <input
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                            <input
                                required
                                type="email"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
                            <textarea
                                required
                                rows={4}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                background: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none',
                                fontWeight: 600, cursor: 'pointer', width: '100%'
                            }}
                        >
                            Send Message
                        </button>
                        {status === 'success' && (
                            <p style={{ marginTop: '1rem', color: '#059669', textAlign: 'center' }}>Message sent successfully!</p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
