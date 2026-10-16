import { AnimationsPanel } from './ui/AnimationsPanel.js';
import { CharacterPanel } from './ui/CharacterPanel.js';
import { ColorsPanel } from './ui/ColorsPanel.js';
import { ConfigJsonPanel } from './ui/ConfigJsonPanel.js';
import { DescribeBar } from './ui/DescribeBar.js';
import { ExportBar } from './ui/ExportBar.js';
import { FramesPanel } from './ui/FramesPanel.js';
import { PartsPanel } from './ui/PartsPanel.js';
import { StylePanel } from './ui/StylePanel.js';
import { PreviewPanel } from './ui/PreviewPanel.js';

export function App() {
  return (
    <div className="app">
      <header className="top panel">
        <DescribeBar />
      </header>
      <aside className="left">
        <CharacterPanel />
        <PartsPanel />
        <ColorsPanel />
      </aside>
      <main className="center">
        <PreviewPanel />
        <FramesPanel />
      </main>
      <aside className="right">
        <StylePanel />
        <AnimationsPanel />
      </aside>
      <footer className="bottom bottom-grid">
        <ExportBar />
        <ConfigJsonPanel />
      </footer>
    </div>
  );
}
