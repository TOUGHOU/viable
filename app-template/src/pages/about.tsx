/**
 * @file about.tsx
 * @description 关于页
 */

import { Link } from 'react-router-dom';

function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">About</h1>
      <p className="text-muted-foreground">This is the app-template project.</p>
      <Link to="/" className="text-primary underline">
        Back to Home
      </Link>
    </div>
  );
}

export default About;
