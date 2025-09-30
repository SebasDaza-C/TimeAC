import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const Container = document.getElementById('root');
if (Container) {
  const Root = createRoot(Container);
  Root.render(<App />);
} else {
  console.warn('No root container found');
}
