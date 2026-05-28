import React from 'react';
export default function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>React + Webpack + DNA Injector</h1>
        <p>
          Each element below has DNA attributes injected for tracking source
          location.
        </p>
      </header>
      <main className="main">
        <section className="section">
          <h2>Features</h2>
          <ul>
            <li>Webpack loader integration</li>
            <li>Automatic source mapping with data attributes</li>
            <li>File path, line, and column tracking</li>
            <li>No runtime overhead in production</li>
          </ul>
        </section>
        <section className="section">
          <h2>Component Example</h2>
          <ComponentExample />
        </section>
      </main>
    </div>
  );
}

function ComponentExample() {
  return (
    <div className="component-box">
      <h3>Nested Component</h3>
      <p>This nested component is also tracked with DNA attributes.</p>
      <button onClick={() => alert("Button clicked!")}>Click Me</button>
    </div>
  );
}
