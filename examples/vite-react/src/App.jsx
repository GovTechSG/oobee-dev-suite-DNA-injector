import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vite + React + DNA Injector</h1>
        <p>Modern development with automatic source tracking</p>
      </header>

      <main className="app-main">
        <section className="section">
          <h2>Why Vite?</h2>
          <ul>
            <li>⚡ Lightning-fast HMR (Hot Module Replacement)</li>
            <li>🚀 Instant server start</li>
            <li>📦 Optimized build</li>
            <li>🔧 Simple configuration</li>
            <li>🎯 Built-in TypeScript support</li>
          </ul>
        </section>

        <section className="section">
          <h2>DNA Injector Integration</h2>
          <p>
            Every element in this app automatically gets three data attributes
            that track its source location in the codebase.
          </p>
          <Counter />
        </section>

        <section className="section">
          <h2>How It Works</h2>
          <div className="code-block">
            <code>
              &lt;App /&gt; ← data-oobee-path, line, column
              <br />
              &nbsp;&nbsp;&lt;section&gt; ← all elements tracked
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&lt;h2&gt; ← even nested ones
              <br />
            </code>
          </div>
        </section>
      </main>
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter-card">
      <h3>Interactive Counter Component</h3>
      <p>This component also has DNA attributes!</p>
      <div className="counter-display">
        <span className="count-value">{count}</span>
      </div>
      <div className="button-group">
        <button
          className="btn btn-increment"
          onClick={() => setCount((c) => c + 1)}
        >
          Increment
        </button>
        <button
          className="btn btn-decrement"
          onClick={() => setCount((c) => c - 1)}
        >
          Decrement
        </button>
        <button className="btn btn-reset" onClick={() => setCount(0)}>
          Reset
        </button>
      </div>
      <p className="hint">Inspect elements in DevTools to see DNA attributes</p>
    </div>
  );
}

export default App;
