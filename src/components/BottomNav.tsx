import React from 'react';
import { PenLine, Layers, Puzzle, Zap, Trophy } from 'lucide-react';
import type { AppTab } from '../types/verse';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string; icon: React.FC<{ className?: string; strokeWidth?: number }> }[] = [
  { id: 'cloze', label: 'Fill In', icon: PenLine },
  { id: 'flashcards', label: 'Cards', icon: Layers },
  { id: 'scramble', label: 'Scramble', icon: Puzzle },
  { id: 'trivia', label: 'Trivia', icon: Zap },
  { id: 'account', label: 'Progress', icon: Trophy },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => (
  <nav aria-label="Practice modes" className="material-bar fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[var(--safe-bottom)]">
    <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-xl items-stretch px-2">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = currentTab === id;
        return (
          <li key={id} className="flex flex-1">
            <button
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex flex-1 flex-col items-center justify-center gap-0.5 font-display text-[0.6875rem] font-extrabold transition-colors ${
                isActive ? 'text-brand-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <span
                className={`grid h-8 w-14 place-items-center rounded-full transition-[background-color,transform] duration-200 group-active:scale-90 ${
                  isActive ? 'bg-brand-soft' : ''
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
