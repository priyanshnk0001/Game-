import React, { useState } from 'react';
import { HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

export const ControlsGuide: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed top-24 right-4 z-20 pointer-events-auto select-none">
      <div className="p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 shadow-xl max-w-xs text-xs text-slate-300">
        <div
          className="flex items-center justify-between font-bold text-slate-200 cursor-pointer mb-2"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-1.5 text-cyan-400">
            <HelpCircle className="w-4 h-4" />
            <span className="tracking-wider uppercase">HOW TO PLAY</span>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>

        {!collapsed && (
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Lock Cursor</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">Click Screen</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Move</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">W / A / S / D</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Look / Camera</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">Mouse</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Aim (Zoom)</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">Right Mouse (Hold)</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Fire Weapon</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">Left Mouse</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Pick Up Gun</span>
              <span className="font-bold text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">E</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Ready / Holster</span>
              <span className="font-bold text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded">Q</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-800">
              <span className="text-slate-400">Switch Player</span>
              <span className="font-bold text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">Tab</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Sprint</span>
              <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">Shift</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
