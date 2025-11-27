
import React, { useState } from 'react';
import { Subject } from '../types';
import { SYLLABUS, SUBJECT_COLORS } from '../constants';
import { ChevronDown, ChevronRight, Check, CheckSquare, Square, Dices } from 'lucide-react';

interface ChapterSelectorProps {
  selectedChapters: string[];
  onToggleChapter: (chapter: string) => void;
  onSelectSubjectAll: (subject: Subject, all: boolean) => void;
  onSetFullSyllabus: (isFull: boolean) => void;
  onRandomSelect: () => void;
  isFullSyllabus: boolean;
}

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ 
  selectedChapters, 
  onToggleChapter, 
  onSelectSubjectAll,
  onSetFullSyllabus,
  onRandomSelect,
  isFullSyllabus
}) => {
  // Start with no subject expanded
  const [expandedSubject, setExpandedSubject] = useState<Subject | null>(null);

  const toggleExpand = (sub: Subject) => {
    setExpandedSubject(expandedSubject === sub ? null : sub);
  };

  return (
    <div className="space-y-4 pr-2">
      {/* Header Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Syllabus Checkbox */}
        <div 
          className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border ${
            isFullSyllabus 
              ? 'bg-cyan-950/30 border-cyan-500/50' 
              : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
          }`}
          onClick={() => onSetFullSyllabus(!isFullSyllabus)}
        >
          <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
             isFullSyllabus ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500 bg-slate-950'
          }`}>
             {isFullSyllabus && <Check size={16} className="text-white" />}
          </div>
          <div>
            <span className={`font-bold block text-sm ${isFullSyllabus ? 'text-cyan-300' : 'text-slate-300'}`}>Full Syllabus</span>
          </div>
        </div>

        {/* Random / Surprise Button */}
        <button 
           onClick={onRandomSelect}
           disabled={isFullSyllabus}
           className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
             isFullSyllabus 
              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-purple-900/20 border-purple-500/30 text-purple-300 hover:bg-purple-900/30 hover:border-purple-500/50'
           }`}
        >
           <Dices size={20} />
           <span className="font-bold text-sm">Surprise Me (Random 5)</span>
        </button>
      </div>

      <div className={`space-y-4 transition-all duration-300 ${isFullSyllabus ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {Object.values(Subject).map((subject) => {
          const chapters = SYLLABUS[subject];
          const selectedInSubject = chapters.filter(c => selectedChapters.includes(c));
          const allSelected = selectedInSubject.length === chapters.length;
          const isExpanded = expandedSubject === subject;
          const color = SUBJECT_COLORS[subject];

          return (
            <div key={subject} className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900 shadow-sm">
              <div 
                className={`flex items-center justify-between p-3 bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors border-l-4 border-l-${color}-500`}
                onClick={() => !isFullSyllabus && toggleExpand(subject)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={18} className="text-slate-400"/> : <ChevronRight size={18} className="text-slate-400"/>}
                  <span className="font-medium text-slate-200">{subject}</span>
                  <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300 border border-slate-600">
                    {selectedInSubject.length}/{chapters.length}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                      onClick={() => onSelectSubjectAll(subject, !allSelected)}
                      className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                        isFullSyllabus ? 'text-slate-600 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                      disabled={isFullSyllabus}
                  >
                      {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {isExpanded && !isFullSyllabus && (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900 border-t border-slate-800">
                  {chapters.map((chapter) => {
                    const isSelected = selectedChapters.includes(chapter);
                    return (
                      <div 
                        key={chapter}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all border ${
                          isSelected 
                            ? `bg-${color}-900/30 border-${color}-500/50 text-${color}-200` 
                            : 'hover:bg-slate-800 border-transparent text-slate-400'
                        }`}
                        onClick={() => onToggleChapter(chapter)}
                      >
                        {isSelected 
                          ? <CheckSquare size={18} className={`text-${color}-400`} /> 
                          : <Square size={18} className="text-slate-600" />
                        }
                        <span className="text-sm truncate" title={chapter}>{chapter}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
