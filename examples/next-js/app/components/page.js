export default function ComponentsDemo() {
    return (
        <main className="container">
            <header className="header">
                <h1>Components Demo</h1>
                <p>See DNA injection in action with various components</p>
            </header>

            <section className="content">
                <article className="article">
                    <h2>Card Components</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        <Card title="Component 1" description="This is the first component with DNA tracking" />
                        <Card title="Component 2" description="Second component showing nested DNA attributes" />
                        <Card title="Component 3" description="Third component for testing purposes" />
                    </div>
                </article>

                <article className="article">
                    <h2>Lists with Tracking</h2>
                    <ItemList />
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

function Card({ title, description }) {
    return (
        <div style={{
            background: '#f9f9f9',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.3s'
        }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
            }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>{title}</h3>
            <p style={{ margin: 0, color: '#666' }}>{description}</p>
        </div>
    );
}

function ItemList() {
    const items = [
        'Item tracked with DNA',
        'Another tracked item',
        'Third tracked item',
        'Components maintain source location',
        'Even in lists!'
    ];

    return (
        <ul>
            {items.map((item, idx) => (
                <li key={idx}>{item}</li>
            ))}
        </ul>
    );
}
