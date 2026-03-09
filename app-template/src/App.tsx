/**
 * @file App.tsx
 * @description 应用根组件，配置 React Router
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from '@/pages/home';
import About from '@/pages/about';

function App() {
  return (
    <BrowserRouter>
      <nav className="fixed top-0 left-0 right-0 border-b bg-background p-4 flex gap-4">
        <Link to="/" className="text-primary hover:underline">
          Home
        </Link>
        <Link to="/about" className="text-primary hover:underline">
          About
        </Link>
      </nav>
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
