
import React, { useState, useEffect, useCallback } from 'react';
import { Question, UserResponse, QuestionStatus, QuestionType, Subject } from '../types';
import { Clock, Menu, X, Bookmark, ArrowRight, ArrowLeft, Grid } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { SUBJECT_COLORS } from '../constants';

interface TestInterfaceProps {
  questions: Question[];
  durationMinutes: number;
  onFinish: (responses: UserResponse[]) => void;
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ questions, durationMinutes, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Subject>(questions[0]?.subject || Subject.PHYSICS);

  // Initialize responses synchronously to prevent "undefined" errors on first render/interaction
  const [responses, setResponses] = useState<Record<string, UserResponse>>(() => {
    const initial: Record<string, UserResponse> = {};
    questions.forEach(q => {
      initial[q.id] = {
        questionId: q.id,
        selectedOption: null,
        status: QuestionStatus.NOT_VISITED,
        timeSpentSeconds: 0
      };
    });
    // Mark first question as visited
    if (questions.length > 0) {
      initial[questions[0].id].status = QuestionStatus.NOT_ANSWERED;
    }
    return initial;
  });

  // Sync tab with current question subject
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (currentQ && currentQ.subject !== activeTab) {
      setActiveTab(currentQ.subject);
    }
  }, [currentIndex, questions, activeTab]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishTest();
          return 0;
        }
        return prev - 1;
      });
      
      // Track time per question
      setResponses(prev => {
        const currentQ = questions[currentIndex];
        if(!currentQ || !prev[currentQ.id]) return prev;
        
        return {
           ...prev,
           [currentQ.id]: {
             ...prev[currentQ.id],
             timeSpentSeconds: prev[currentQ.id].timeSpentSeconds + 1
           }
        }
      });

    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  const handleFinishTest = useCallback(() => {
    onFinish(Object.values(responses));
  }, [onFinish, responses]);

  const navigateTo = (index: number) => {
    const nextQ = questions[index];
    if (!nextQ) return;
    const nextQId = nextQ.id;

    setResponses(prev => {
      const nextRes = prev[nextQId];
      // Safety check: if response entry doesn't exist, don't crash
      if (!nextRes) return prev;

      const nextStatus = nextRes.status === QuestionStatus.NOT_VISITED 
        ? QuestionStatus.NOT_ANSWERED 
        : nextRes.status;
      
      return {
        ...prev,
        [nextQId]: { ...nextRes, status: nextStatus }
      };
    });

    setCurrentIndex(index);
    setIsPaletteOpen(false);
    
    // Auto switch tab if jumping to different subject
    if(nextQ.subject !== activeTab) {
       setActiveTab(nextQ.subject);
    }
  };

  // Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        navigateTo(Math.min(questions.length - 1, currentIndex + 1));
      }
      if (e.key === 'ArrowLeft') {
        navigateTo(Math.max(0, currentIndex - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions]);

  const handleOptionSelect = (option: string) => {
    const qId = questions[currentIndex].id;
    setResponses(prev => {
      if (!prev[qId]) return prev;
      return {
        ...prev,
        [qId]: { 
          ...prev[qId], 
          selectedOption: option,
          status: prev[qId].status === QuestionStatus.MARKED_FOR_REVIEW 
            ? QuestionStatus.ANSWERED_AND_MARKED 
            : QuestionStatus.ANSWERED 
        }
      };
    });
  };

  const handleNumericalInput = (val: string) => {
    const qId = questions[currentIndex].id;
    setResponses(prev => {
      if (!prev[qId]) return prev;
      return {
        ...prev,
        [qId]: { 
          ...prev[qId], 
          selectedOption: val,
          status: val.length > 0 
            ? (prev[qId].status === QuestionStatus.MARKED_FOR_REVIEW ? QuestionStatus.ANSWERED_AND_MARKED : QuestionStatus.ANSWERED)
            : QuestionStatus.NOT_ANSWERED
        }
      };
    });
  };

  const handleMarkForReview = () => {
    const qId = questions[currentIndex].id;
    const currentRes = responses[qId];
    if (!currentRes) return;

    let newStatus = QuestionStatus.MARKED_FOR_REVIEW;
    
    if (currentRes.selectedOption) {
      newStatus = QuestionStatus.ANSWERED_AND_MARKED;
    }

    // Toggle logic
    if (currentRes.status === QuestionStatus.MARKED_FOR_REVIEW) {
      newStatus = QuestionStatus.NOT_ANSWERED;
    } else if (currentRes.status === QuestionStatus.ANSWERED_AND_MARKED) {
      newStatus = QuestionStatus.ANSWERED;
    }

    setResponses(prev => ({
      ...prev,
      [qId]: { ...prev[qId], status: newStatus }
    }));
  };

  const handleClearResponse = () => {
    const qId = questions[currentIndex].id;
    setResponses(prev => {
      if (!prev[qId]) return prev;
      return {
        ...prev,
        [qId]: { 
          ...prev[qId], 
          selectedOption: null,
          status: prev[qId].status === QuestionStatus.ANSWERED_AND_MARKED 
            ? QuestionStatus.MARKED_FOR_REVIEW 
            : QuestionStatus.NOT_ANSWERED
        }
      };
    });
  };

  const handleTabChange = (subject: Subject) => {
    setActiveTab(subject);
    // Find first question of this subject
    const index = questions.findIndex(q => q.subject === subject);
    if(index !== -1) {
      navigateTo(index);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentResponse = responses[currentQuestion?.id] || { selectedOption: null, status: QuestionStatus.NOT_VISITED };

  if (!currentQuestion) return <div>Loading...</div>;

  const getStatusColor = (status: QuestionStatus) => {
    switch(status) {
      case QuestionStatus.ANSWERED: return 'bg-green-600 text-white border-green-700 shadow-[0_0_10px_rgba(22,163,74,0.5)]';
      case QuestionStatus.MARKED_FOR_REVIEW: return 'bg-purple-600 text-white border-purple-700 shadow-[0_0_10px_rgba(147,51,234,0.5)]';
      case QuestionStatus.ANSWERED_AND_MARKED: return 'bg-purple-600 text-white border-purple-700 relative after:content-[""] after:block after:w-2 after:h-2 after:bg-green-400 after:rounded-full after:absolute after:bottom-0 after:right-0 shadow-[0_0_10px_rgba(147,51,234,0.5)]';
      case QuestionStatus.NOT_ANSWERED: return 'bg-red-600 text-white border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)]';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const activeSubjects = Array.from(new Set(questions.map(q => q.subject)));
  
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Background Decor (Grid) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shadow-lg shadow-black/50 z-10 shrink-0 relative">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)]">J</div>
           <h1 className="font-bold text-slate-100 hidden sm:block tracking-wide">JEE Genius Mock</h1>
        </div>

        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium border ${timeLeft < 300 ? 'bg-red-900/20 text-red-500 border-red-900/50 animate-pulse' : 'bg-cyan-950/30 text-cyan-400 border-cyan-800'}`}>
              <Clock size={18} />
              <span>{formatTime(timeLeft)}</span>
           </div>
           <button 
             onClick={handleFinishTest}
             className="hidden sm:block px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-sm font-medium transition-colors"
           >
             Submit Test
           </button>
           <button 
             onClick={() => setIsPaletteOpen(true)}
             className="sm:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-md"
           >
             <Grid size={24} />
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        
        {/* Left: Question Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <div className="max-w-4xl mx-auto">
             <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-bold uppercase tracking-widest px-3 py-1 rounded bg-${SUBJECT_COLORS[currentQuestion.subject]}-900/30 text-${SUBJECT_COLORS[currentQuestion.subject]}-400 border border-${SUBJECT_COLORS[currentQuestion.subject]}-500/30`}>
                  {currentQuestion.subject}
                </span>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700">
                   {currentQuestion.year}
                </span>
             </div>
             
             <div className="bg-slate-900/50 rounded-xl shadow-lg border border-slate-800 p-6 mb-6 backdrop-blur-sm">
                <div className="flex gap-4">
                   <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-800 text-cyan-500 font-bold rounded-full border border-slate-700">
                     {currentIndex + 1}
                   </div>
                   <div className="flex-1">
                      <div className="text-lg text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                        <MathRenderer text={currentQuestion.text} />
                      </div>
                      
                      {/* Diagram Rendering with Auto-Fixes */}
                      {currentQuestion.diagramSvg && (
                        <MathRenderer 
                          svg={currentQuestion.diagramSvg}
                          className="mt-6 p-4 bg-white rounded-lg flex justify-center border border-slate-700/50 overflow-hidden text-black"
                        />
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-3 pl-0 sm:pl-12">
                {currentQuestion.type === QuestionType.MCQ ? (
                  currentQuestion.options?.map((option, idx) => {
                    const isSelected = currentResponse.selectedOption === idx.toString();
                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx.toString())}
                        className={`w-full flex items-center p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                          isSelected 
                           ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                           : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${
                           isSelected ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-600'
                         }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                         </div>
                         <span className="font-medium text-lg">
                           <MathRenderer text={option} />
                         </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-md">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Enter Numerical Value</label>
                    <input 
                      type="text" 
                      value={currentResponse.selectedOption || ''}
                      onChange={(e) => handleNumericalInput(e.target.value)}
                      placeholder="e.g., 5.4"
                      className="w-full max-w-xs p-3 bg-slate-950 border border-slate-700 text-slate-100 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none font-mono text-lg"
                    />
                    <p className="text-xs text-slate-500 mt-2">Enter the correct numerical value (integer or decimal).</p>
                  </div>
                )}
             </div>
          </div>
        </main>

        {/* Right: Question Palette (Desktop) */}
        <aside className="hidden lg:flex w-80 bg-slate-900 border-l border-slate-800 flex-col shrink-0 relative z-10">
          <div className="flex border-b border-slate-800">
             {activeSubjects.map(sub => {
                const isActive = sub === activeTab;
                const color = SUBJECT_COLORS[sub]; 
                return (
                  <button
                    key={sub}
                    onClick={() => handleTabChange(sub)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                       isActive 
                        ? `text-${color}-400 border-${color}-500 bg-slate-800` 
                        : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                     {sub.slice(0, 4)}
                  </button>
                );
             })}
          </div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
             <div className="space-y-6">
                {/* Sections for Current Subject */}
                {[QuestionType.MCQ, QuestionType.NUMERICAL].map(qType => {
                   const subjectQuestions = questions.filter(q => q.subject === activeTab && q.type === qType);
                   if(subjectQuestions.length === 0) return null;

                   return (
                      <div key={qType}>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> 
                           {qType === QuestionType.MCQ ? 'Section A (MCQ)' : 'Section B (Numeric)'}
                        </h4>
                        <div className="grid grid-cols-5 gap-3">
                           {questions.map((q, idx) => {
                              if (q.subject !== activeTab || q.type !== qType) return null;
                              const status = responses[q.id]?.status || QuestionStatus.NOT_VISITED;
                              return (
                                 <button
                                    key={q.id}
                                    onClick={() => navigateTo(idx)}
                                    className={`aspect-square flex items-center justify-center rounded-md font-medium text-sm border transition-all ${
                                       currentIndex === idx ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900 z-10' : ''
                                    } ${getStatusColor(status)}`}
                                 >
                                    {idx + 1}
                                 </button>
                              );
                           })}
                        </div>
                      </div>
                   )
                })}
             </div>
          </div>
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs space-y-2 text-slate-400">
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-sm shadow-[0_0_5px_rgba(22,163,74,0.5)]"></div> Answered</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-sm shadow-[0_0_5px_rgba(220,38,38,0.5)]"></div> Not Answered</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-600 rounded-sm shadow-[0_0_5px_rgba(147,51,234,0.5)]"></div> Marked for Review</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></div> Not Visited</div>
          </div>
        </aside>

        {/* Mobile Palette Drawer */}
        {isPaletteOpen && (
          <div className="absolute inset-0 z-50 flex lg:hidden">
             <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsPaletteOpen(false)}></div>
             <div className="w-4/5 bg-slate-900 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200 border-l border-slate-800">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between text-slate-100">
                   <h3 className="font-bold">Question Palette</h3>
                   <button onClick={() => setIsPaletteOpen(false)}><X size={20} /></button>
                </div>
                
                {/* Mobile Tabs */}
                <div className="flex border-b border-slate-800">
                  {activeSubjects.map(sub => (
                     <button
                        key={sub}
                        onClick={() => handleTabChange(sub)}
                        className={`flex-1 py-3 text-xs font-bold uppercase ${
                           sub === activeTab ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-500'
                        }`}
                     >
                        {sub.slice(0, 3)}
                     </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                   {[QuestionType.MCQ, QuestionType.NUMERICAL].map(qType => {
                      const subjectQuestions = questions.filter(q => q.subject === activeTab && q.type === qType);
                      if(subjectQuestions.length === 0) return null;

                      return (
                         <div key={qType}>
                           <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                              {qType === QuestionType.MCQ ? 'Section A' : 'Section B'}
                           </h4>
                           <div className="grid grid-cols-5 gap-3">
                              {questions.map((q, idx) => {
                                 if (q.subject !== activeTab || q.type !== qType) return null;
                                 const status = responses[q.id]?.status || QuestionStatus.NOT_VISITED;
                                 return (
                                    <button
                                       key={q.id}
                                       onClick={() => navigateTo(idx)}
                                       className={`aspect-square flex items-center justify-center rounded-md font-medium text-sm border ${
                                          currentIndex === idx ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' : ''
                                       } ${getStatusColor(status)}`}
                                    >
                                       {idx + 1}
                                    </button>
                                 );
                              })}
                           </div>
                         </div>
                      )
                   })}
                </div>
                <div className="p-4 border-t border-slate-800">
                  <button onClick={handleFinishTest} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow-[0_0_15px_rgba(8,145,178,0.5)]">Submit Test</button>
                </div>
             </div>
          </div>
        )}

      </div>

      {/* Bottom Footer Navigation */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-lg relative">
         <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => handleMarkForReview()}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors border border-slate-700"
            >
              <Bookmark size={18} className={currentResponse.status === QuestionStatus.MARKED_FOR_REVIEW || currentResponse.status === QuestionStatus.ANSWERED_AND_MARKED ? "fill-purple-500 text-purple-500" : ""} />
              <span className="hidden sm:inline">Review</span>
            </button>
            <button 
               onClick={handleClearResponse}
               className="px-4 py-2 text-slate-500 hover:text-red-400 font-medium transition-colors"
            >
               Clear
            </button>
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 flex items-center gap-2 text-slate-400 hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
               <ArrowLeft size={18} />
               <span className="hidden sm:inline">Prev</span>
            </button>
            <button 
               onClick={() => navigateTo(Math.min(questions.length - 1, currentIndex + 1))}
               className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
               {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
               {currentIndex !== questions.length - 1 && <ArrowRight size={18} />}
            </button>
         </div>
      </footer>
    </div>
  );
};
