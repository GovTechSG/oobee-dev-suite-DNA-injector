'use client';

import Link from 'next/link';
import './page.css';

export default function Home() {
    return (
        <main className="container">
            <header className="header">
                <h1>Next.js + DNA Injector</h1>
                <p>
                    Tracking component source locations with DNA attributes in Next.js
                </p>
            </header>

            <section className="content">
                <article className="article">
                    <h2>What is DNA Injection?</h2>
                    <p>
                        DNA Injection automatically adds source location data to every DOM element in your app.
                        Each element gets three data attributes:
                    </p>
                    <ul>
                        <li><code>data-oobee-path</code> - Source file path</li>
                        <li><code>data-oobee-line</code> - Line number</li>
                        <li><code>data-oobee-column</code> - Column number</li>
                    </ul>
                </article>

                <article className="article">
                    <h2>Benefits</h2>
                    <ul>
                        <li>🎯 Quickly find component source in the codebase</li>
                        <li>📍 Perfect for accessibility auditing (WCAG)</li>
                        <li>🔍 Great for debugging UI issues</li>
                        <li>⚡ Zero runtime cost (data attributes only)</li>
                        <li>🚀 Works with all Next.js rendering modes</li>
                    </ul>
                </article>

                <article className="article">
                    <h2>Try It Out</h2>
                    <div className="demo-section">
                        <ComponentExample />
                    </div>
                </article>

                <article className="article">
                    <h2>How to Use</h2>
                    <ol>
                        <li>Open DevTools (F12 or Cmd+Opt+I)</li>
                        <li>Inspect any element on this page</li>
                        <li>Look for <code>data-oobee-*</code> attributes</li>
                        <li>Navigate to that file and line in your editor</li>
                    </ol>
                </article>

                <nav className="links">
                    <Link href="/about">About Page</Link>
                    <Link href="/components">Components Demo</Link>
                </nav>
            </section>
        </main>
    );
}

function ComponentExample() {
    const [count, setCount] = React.useState(0);

    return (
        <div className="component-box">
            <h3>Interactive Component</h3>
            <p>This component also has DNA attributes injected.</p>
            <p>Count: <strong>{count}</strong></p>
            <div className="button-group">
                <button onClick={() => setCount(c => c + 1)}>
                    Increment
                </button>
                <button onClick={() => setCount(0)}>
                    Reset
                </button>
            </div>
        </div>
    );
}

// Add React import for hooks
import React from 'react';
