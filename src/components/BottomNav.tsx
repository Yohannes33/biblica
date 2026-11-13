import React from 'react';
import { 
  FileEdit, 
  Layers, 
  Dices, 
  HelpCircle, 
  Bookmark, 
  User 
} from 'lucide-react';
import type { AppTab } from '../types/verse';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'cloze', label: 'Cloze', icon: FileEdit },
    { id: 'flashcards', label: 'Cards', icon: Layers },
    { id: 'scramble', label: 'Scramble', icon: Dices },
    { id: 'trivia', label: 'Trivia', icon: HelpCircle },
    { id: 'library', label: 'Library', icon: Bookmark },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="theme-card rounded-3xl p-1.5 flex items-center justify-around shadow-xl border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all btn-press ${
                isActive 
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
