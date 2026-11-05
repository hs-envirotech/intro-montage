import { useEffect } from 'react';
import { useStore } from './state/store';
import { engine } from './audio/engine';
import { BottomBar, EngineBanner, Tabs, TopBar } from './ui/Shell';
import { RiffMode } from './ui/RiffMode';
import { GuitarMode } from './ui/GuitarMode';
import { PerformanceMode } from './ui/PerformanceMode';
import { RecordSheet, SettingsSheet, ToneSheet } from './ui/Sheets';

export function App() {
  const tab = useStore((s) => s.tab);
  const sheet = useStore((s) => s.sheet);

  // The very first touch anywhere unlocks audio (Android requires a real user gesture),
  // so the first pad tap itself makes sound — no splash screen.
  useEffect(() => {
    const unlock = () => { engine.ensure().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  return (
    <div className={`app tab-${tab}`}>
      <TopBar />
      <Tabs />
      <EngineBanner />
      <main className="stage">
        {tab === 'riffs' && <RiffMode />}
        {tab === 'guitar' && <GuitarMode />}
        {tab === 'performance' && <PerformanceMode />}
      </main>
      <BottomBar />
      {sheet === 'tone' && <ToneSheet />}
      {sheet === 'settings' && <SettingsSheet />}
      {sheet === 'rec' && <RecordSheet />}
    </div>
  );
}
