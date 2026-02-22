import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

function getInitialTheme() {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

document.documentElement.setAttribute('data-theme', getInitialTheme());

createRoot(document.getElementById('root')).render(<App />);
