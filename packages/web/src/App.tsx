import { Button } from '@/components/ui/button';
import { inspect } from '@vibe/utils-inspector';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Vibe Coding</h1>
      <p className="text-muted-foreground text-sm">{inspect({ status: 'ready' })}</p>
      <Button>Get started</Button>
    </div>
  );
}

export default App;
