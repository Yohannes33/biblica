import React from 'react';
import { 
  FileEdit, 
  Layers, 
  Dices, 
  HelpCircle, 
  Bookmark, 
  Trophy 
} from 'lucide-react';
import type { AppTab } from '../types/verse';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'cloze', label: 'Fill Blanks', icon: FileEdit },
    { id: 'flashcards', label: 'Cards', icon: Layers },
    { id: 'scramble', label: 'Scramble', icon: Dices },
    { id: 'trivia', label: 'Trivia', icon: HelpCircle },
    { id: 'library', label: 'Verses', icon: Bookmark },
    { id: 'stats', label: 'Progress', icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 safe-area-pb">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive 
                  ? 'text-indigo-400 font-bold bg-indigo-500/15 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
