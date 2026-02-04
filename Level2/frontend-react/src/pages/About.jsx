import React from 'react';

const About = () => {
    return (
        <div className="container">
            <div className="page-greeting">
                <h1>About Streaklet</h1>
                <p>Learn more about the project and the mission</p>
            </div>

            <div className="card about-card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <img
                    src="/images/codveda.jpg"
                    alt="Kanzy Hany X Codeveda"
                    className="about-image"
                    style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-md)',
                        marginBottom: 'var(--space-lg)'
                    }}
                />

                <h2 className="card-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>Kanzy Hany X Codeveda</h2>
                <p className="about-description" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
                    Streaklet is a project collaboration between Kanzy Hany and Codeveda, designed to help you build
                    better habits and achieve your goals through consistency and smart insights.
                </p>
                <div className="mt-xl">
                    <div className="status-badge progress" style={{ display: 'inline-flex' }}>
                        Empowering building routines through technology
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
