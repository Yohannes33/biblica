import React from 'react';
import { PenLine, Layers, Puzzle, Zap, Trophy } from 'lucide-react';
import type { AppTab } from '../types/verse';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

type IconProps = { className?: string; strokeWidth?: number; fill?: string; fillOpacity?: number };

const TABS: { id: AppTab; label: string; icon: React.FC<IconProps> }[] = [
  { id: 'cloze', label: 'Fill In', icon: PenLine },
  { id: 'flashcards', label: 'Cards', icon: Layers },
  { id: 'scramble', label: 'Scramble', icon: Puzzle },
  { id: 'trivia', label: 'Trivia', icon: Zap },
  { id: 'account', label: 'Progress', icon: Trophy },
];

/**
 * iOS tab bar per Apple's HIG: 49pt tall above the home indicator, a hairline
 * top separator, translucent material, SF Pro 10pt labels, and selection shown
 * by tint plus a filled glyph (no pill behind the icon, which is Material).
 */
export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => (
  <nav
    aria-label="Practice modes"
    className="material-bar fixed inset-x-0 bottom-0 z-30 pb-[var(--safe-bottom)] shadow-[inset_0_0.5px_0_var(--line-strong)]"
  >
    <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-xl items-stretch">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = currentTab === id;
        return (
          <li key={id} className="flex flex-1">
            <button
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 font-sans text-[0.625rem] leading-none font-medium tracking-[0.01em] transition-opacity duration-150 active:opacity-50 ${
                isActive ? 'text-brand' : 'text-ink-3'
              }`}
            >
              <Icon
                className="h-[25px] w-[25px]"
                strokeWidth={isActive ? 2.25 : 1.75}
                fill={isActive ? 'currentColor' : 'none'}
                fillOpacity={isActive ? 0.22 : 0}
              />
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
