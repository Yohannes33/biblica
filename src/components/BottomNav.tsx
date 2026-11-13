import React from 'react';
import { PenLine, Layers, Puzzle, Zap, Trophy } from 'lucide-react';
import type { AppTab } from '../types/verse';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  badges?: Partial<Record<AppTab, number>>;
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
export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, badges = {} }) => (
  <nav
    aria-label="Practice modes"
    className="material-bar fixed inset-x-0 bottom-0 z-30 pb-[var(--safe-bottom)] shadow-[inset_0_0.5px_0_var(--line-strong)]"
  >
    <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-xl items-stretch">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = currentTab === id;
        const badge = badges[id] ?? 0;
        return (
          <li key={id} className="flex flex-1">
            <button
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={badge ? `${label}, ${badge} to review` : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 font-sans text-[0.625rem] leading-none font-medium tracking-[0.01em] transition-opacity duration-150 active:opacity-50 ${
                isActive ? 'text-brand' : 'text-ink-3'
              }`}
            >
              <span className="relative">
                <Icon
                  className="h-[25px] w-[25px]"
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.22 : 0}
                />
                {/* iOS-style tab badge */}
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[0.6875rem] leading-none font-semibold text-[var(--on-danger)] tabular-nums"
                    aria-hidden="true"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
