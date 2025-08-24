
import React from 'react';
import { Icons } from '../components/Icon';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  files: Record<string, string>;
}

export const templates: ProjectTemplate[] = [
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'A modern React starter with Vite for a fast development experience.',
    icon: React.createElement(Icons.ReactIcon, { className: "w-10 h-10" }),
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + Vite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      '/package.json': `{
  "name": "react-vite-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}`,
      '/src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      '/src/App.jsx': `import React, { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
    </div>
  )
}

export default App
`,
      '/src/index.css': `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
       '/src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}`,
    },
  },
  {
    id: 'vanilla-js',
    name: 'Vanilla JS',
    description: 'A classic plain HTML, CSS, and JavaScript project. No frameworks.',
    icon: React.createElement(Icons.JSIcon, { className: "w-10 h-10" }),
    files: {
        '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is a vanilla JavaScript application.</p>
    <button id="myButton">Click Me</button>
    <script src="script.js"></script>
</body>
</html>`,
        '/style.css': `body {
    font-family: sans-serif;
    background-color: #f0f0f0;
    color: #333;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
}`,
        '/script.js': `const button = document.getElementById('myButton');
let count = 0;
button.addEventListener('click', () => {
    count++;
    alert('Button clicked ' + count + ' times!');
});`
    }
  }
];
