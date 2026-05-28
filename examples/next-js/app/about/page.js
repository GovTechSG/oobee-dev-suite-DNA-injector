export default function About() {
    return (
        <main className="container">
            <header className="header">
                <h1>About DNA Injector</h1>
                <p>Learn more about the DNA injection technology</p>
            </header>

            <section className="content">
                <article className="article">
                    <h2>What is Oobee DNA?</h2>
                    <p>
                        Oobee DNA is a development tool that automatically injects source location tracking data
                        into your DOM elements. It helps developers quickly identify where elements come from in
                        their codebase.
                    </p>
                </article>

                <article className="article">
                    <h2>Key Features</h2>
                    <ul>
                        <li>🎯 Automatic source tracking on all elements</li>
                        <li>📦 Supports multiple bundlers (Vite, Webpack, esbuild, Rollup)</li>
                        <li>🚀 Works with React, Vue, Angular, and plain HTML</li>
                        <li>⚡ Zero performance impact (data attributes only)</li>
                        <li>🔧 Easy integration with existing projects</li>
                        <li>🌐 Perfect for WCAG accessibility auditing</li>
                    </ul>
                </article>

                <article className="article">
                    <h2>Supported Bundlers</h2>
                    <ul>
                        <li><strong>Vite</strong> - Modern build tool</li>
                        <li><strong>Webpack</strong> - React, Angular, traditional SPAs</li>
                        <li><strong>esbuild</strong> - Fast, minimal config</li>
                        <li><strong>Rollup</strong> - Library bundler</li>
                        <li><strong>Next.js</strong> - Built on Webpack</li>
                    </ul>
                </article>

                <article className="article">
                    <h2>Supported Frameworks</h2>
                    <ul>
                        <li>React (with Vite, Webpack, esbuild)</li>
                        <li>Vue 3 (with Vite, Webpack, esbuild)</li>
                        <li>Angular (with Webpack CLI)</li>
                        <li>Next.js (13.x and 14.x)</li>
                        <li>Vanilla HTML/JavaScript</li>
                    </ul>
                </article>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <a href="/" style={{
                        padding: '12px 24px',
                        background: '#0066cc',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        display: 'inline-block'
                    }}>
                        Back to Home
                    </a>
                </div>
            </section>
        </main>
    );
}
