
import React, { useState, useEffect } from 'react';
import { TestConfig, Question, UserResponse, Subject, TestHistoryItem, Difficulty } from './types';
import { generateQuestions } from './services/geminiService';
import { TestInterface } from './components/TestInterface';
import { ResultScreen } from './components/ResultScreen';
import { ChapterSelector } from './components/ChapterSelector';
import { SYLLABUS } from './constants';
import { Brain, Settings, Play, Loader2, Sparkles, BookOpen, History, ArrowRight, Trash2, ChevronLeft, Cpu, Atom } from 'lucide-react';

type AppView = 'home' | 'config' | 'loading' | 'test' | 'result' | 'history';

const LOADING_TIPS = [
  "Read the question carefully before looking at options.",
  "Elimination method is your best friend for tricky MCQs.",
  "Don't spend more than 3 minutes on a single question.",
  "Units and dimensions can often solve Physics problems.",
  "For Numerical Type, double-check your calculations.",
  "Stay calm. Panic is the only wrong answer.",
  "Chemistry: Inorganic trends often have exceptions, recall them.",
  "Maths: Try substituting values if the general method is too long."
];

const LOADING_STATUSES = [
  "Establishing secure connection to Archives...",
  "Retrieving PYQs from 2019-2025 Database...",
  "Analyzing Subject Difficulty Matrix...",
  "Synthesizing Questions...",
  "Calibrating Options and Solutions...",
  "Rendering SVG Diagrams...",
  "Finalizing Test Environment..."
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  // Explicit state for Full Syllabus mode - Default UNCHECKED as requested
  const [isFullSyllabus, setIsFullSyllabus] = useState(false);
  
  // New state to track questions per subject for the UI
  const [questionsPerSubject, setQuestionsPerSubject] = useState(5);

  const [config, setConfig] = useState<TestConfig>({
    subjects: [Subject.PHYSICS, Subject.CHEMISTRY, Subject.MATHS],
    chapters: [],
    questionCount: 15, // 5 per subject * 3
    durationMinutes: 45,
    difficulty: 'Mixed'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);

  // Loading Screen States
  const [currentTip, setCurrentTip] = useState(LOADING_TIPS[0]);
  const [currentStatus, setCurrentStatus] = useState(LOADING_STATUSES[0]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('jee_genius_history');
    if (saved) {
      try {
        setTestHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Update Config when Questions Per Subject changes
  useEffect(() => {
    // Assuming 3 subjects are always active for standard generation
    const totalQuestions = questionsPerSubject * 3;
    let duration = 45; // Default for 5 per subject (15 total)
    
    if (questionsPerSubject === 15) duration = 90; // 45 total -> 90 mins (2 min/q)
    if (questionsPerSubject === 25) duration = 180; // 75 total -> 180 mins (Standard JEE)

    setConfig(prev => ({
      ...prev,
      questionCount: totalQuestions,
      durationMinutes: duration
    }));
  }, [questionsPerSubject]);

  // Loading Screen Animation Effects
  useEffect(() => {
    if (view === 'loading') {
      const tipInterval = setInterval(() => {
        setCurrentTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
      }, 3000);

      let statusIndex = 0;
      const statusInterval = setInterval(() => {
        statusIndex = (statusIndex + 1) % LOADING_STATUSES.length;
        setCurrentStatus(LOADING_STATUSES[statusIndex]);
      }, 1500);

      return () => {
        clearInterval(tipInterval);
        clearInterval(statusInterval);
      };
    }
  }, [view]);

  const saveHistory = (newHistory: TestHistoryItem[]) => {
    // Cap history at 50 items to optimize storage
    const cappedHistory = newHistory.slice(0, 50);
    setTestHistory(cappedHistory);
    localStorage.setItem('jee_genius_history', JSON.stringify(cappedHistory));
  };

  const startTest = async (testConfig: TestConfig) => {
    setView('loading');
    setError(null);
    
    // If Full Syllabus mode is active, ensure chapters is empty to signal backend
    const finalConfig = {
      ...testConfig,
      chapters: isFullSyllabus ? [] : testConfig.chapters
    };

    try {
      const generatedQuestions = await generateQuestions(finalConfig);
      if (generatedQuestions.length === 0) {
        throw new Error("No questions were generated. Please try again.");
      }
      setQuestions(generatedQuestions);
      setConfig(finalConfig); // Ensure config is synced
      setView('test');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setView('config'); // Return to config on error
    }
  };

  const handleQuickStart = () => {
     setIsFullSyllabus(true);
     setQuestionsPerSubject(5); // 15 total
     startTest({
        subjects: [Subject.PHYSICS, Subject.CHEMISTRY, Subject.MATHS],
        chapters: [],
        questionCount: 15,
        durationMinutes: 30,
        difficulty: 'Mixed'
     });
  };

  const handleCustomStart = () => {
     setIsFullSyllabus(false); // Unchecked by default
     setConfig(prev => ({ ...prev, chapters: [] }));
     setView('config');
  };

  const handleTestFinish = (userResponses: UserResponse[]) => {
    setResponses(userResponses);
    
    // Simple score calc for history summary
    let correct = 0;
    let score = 0;
    questions.forEach(q => {
      const r = userResponses.find(res => res.questionId === q.id);
      if (r && r.selectedOption !== null) {
        const isCorrect = q.type === 'MCQ' 
           ? r.selectedOption === q.correctAnswer 
           : r.selectedOption.trim() === q.correctAnswer.trim();
        if (isCorrect) {
          correct++;
          score += 4;
        } else {
          score -= 1;
        }
      }
    });
    
    const maxScore = questions.length * 4;
    const accuracy = userResponses.filter(r => r.selectedOption !== null).length > 0 
      ? Math.round((correct / userResponses.filter(r => r.selectedOption !== null).length) * 100) 
      : 0;

    const historyItem: TestHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      score,
      maxScore,
      accuracy,
      topics: config.chapters.length > 0 ? `${config.chapters.length} Chapters` : 'Full Syllabus',
      config: config
    };

    saveHistory([historyItem, ...testHistory]);
    setView('result');
  };

  const clearHistory = () => {
    if(confirm("Are you sure you want to delete all test history?")) {
      saveHistory([]);
    }
  };

  // --- Render Helpers ---

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
           {/* Animated Spinner Core */}
           <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
             <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping"></div>
             <div className="absolute inset-0 border-4 border-t-cyan-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin duration-[3s]"></div>
             <div className="absolute inset-2 border-4 border-t-transparent border-r-purple-500 border-b-transparent border-l-cyan-500 rounded-full animate-spin-reverse duration-[2s]"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                 <Atom size={48} className="text-cyan-400 animate-pulse" />
             </div>
           </div>

           <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-tight">
             Generating Test
           </h2>
           
           {/* Terminal Status Text */}
           <div className="h-8 mb-8 text-cyan-400/80 font-mono text-sm flex items-center gap-2 bg-cyan-950/30 px-4 py-1 rounded border border-cyan-900/50">
               <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
               {currentStatus} 
           </div>

           {/* Tip Card */}
           <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-xl w-full text-center shadow-[0_0_30px_rgba(8,145,178,0.15)] relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600"></div>
               <div className="absolute -right-4 -top-4 text-slate-800 rotate-12 opacity-50">
                   <Brain size={100} />
               </div>
               
               <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-bold flex items-center justify-center gap-2">
                   <Sparkles size={12} className="text-yellow-500" /> Did you know?
               </p>
               <p className="text-slate-200 italic text-lg leading-relaxed relative z-10 transition-all duration-500 ease-in-out">
                   "{currentTip}"
               </p>
           </div>
        </div>
      </div>
    );
  }

  if (view === 'test') {
    // Key prop forces a clean remount when question set changes
    return <TestInterface key={questions[0]?.id || 'test-interface'} questions={questions} durationMinutes={config.durationMinutes} onFinish={handleTestFinish} />;
  }

  if (view === 'result') {
    return <ResultScreen questions={questions} responses={responses} onRestart={() => setView('home')} />;
  }

  // History View
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
         <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => setView('home')} className="p-2 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"><ChevronLeft/></button>
                 <h2 className="text-2xl font-bold text-slate-100">Test History</h2>
              </div>
              {testHistory.length > 0 && (
                <button onClick={clearHistory} className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors">
                  <Trash2 size={16}/> Clear All
                </button>
              )}
            </div>
            
            <div className="space-y-4">
               {testHistory.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                    <History size={48} className="mx-auto mb-4 opacity-50"/>
                    <p>No tests taken yet. Start your journey today!</p>
                  </div>
               ) : (
                 testHistory.map(item => (
                   <div key={item.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-cyan-500/30 transition-colors shadow-lg shadow-black/40">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">{item.topics}</span>
                               <span className="text-xs text-slate-500">{item.date}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-200">Score: {item.score}/{item.maxScore} <span className={`text-sm ml-2 ${item.accuracy > 75 ? 'text-green-400' : 'text-yellow-400'}`}>({item.accuracy}% Accuracy)</span></h3>
                         </div>
                         <div className="flex gap-4 text-sm text-slate-400">
                            <div>
                               <span className="block text-xs uppercase text-slate-600 font-bold">Difficulty</span>
                               <span className="text-slate-300">{item.config.difficulty}</span>
                            </div>
                            <div>
                               <span className="block text-xs uppercase text-slate-600 font-bold">Duration</span>
                               <span className="text-slate-300">{item.config.durationMinutes}m</span>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>
      </div>
    );
  }

  // Configuration View
  if (view === 'config') {
    const toggleChapter = (ch: string) => {
       if (isFullSyllabus) return; 
       setConfig(prev => {
          const exists = prev.chapters.includes(ch);
          return {
             ...prev,
             chapters: exists ? prev.chapters.filter(c => c !== ch) : [...prev.chapters, ch]
          };
       });
    };

    const handleSubjectAll = (sub: Subject, select: boolean) => {
       if (isFullSyllabus) return;
       setConfig(prev => {
          const subChapters = SYLLABUS[sub];
          const otherChapters = prev.chapters.filter(c => !subChapters.includes(c));
          return {
             ...prev,
             chapters: select ? [...otherChapters, ...subChapters] : otherChapters
          };
       });
    };
    
    const handleSetFullSyllabus = (isFull: boolean) => {
       setIsFullSyllabus(isFull);
       if (isFull) {
          setConfig(prev => ({ ...prev, chapters: [] }));
       }
    };

    const handleRandomSelect = () => {
       const allChapters = Object.values(SYLLABUS).flat();
       // Shuffle and pick 5
       const shuffled = allChapters.sort(() => 0.5 - Math.random());
       const selected = shuffled.slice(0, 5);
       
       setIsFullSyllabus(false);
       setConfig(prev => ({ ...prev, chapters: selected }));
    };

    return (
      <div className="min-h-screen bg-slate-950 flex justify-center py-8 px-4 overflow-y-auto">
         <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl shadow-cyan-900/20 border border-slate-800 flex flex-col h-fit">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100"><Settings size={20} className="text-cyan-400"/> Custom PYQ Test Setup</h2>
                 <p className="text-slate-400 text-sm">Target specific areas of your syllabus</p>
               </div>
               <button onClick={() => setView('home')} className="text-slate-500 hover:text-slate-200 transition-colors"><span className="text-2xl">&times;</span></button>
            </div>
            
            <div className="p-6 space-y-8">
               
               {/* Controls Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-2">Questions Per Subject</label>
                     <select 
                        value={questionsPerSubject}
                        onChange={(e) => setQuestionsPerSubject(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                     >
                        <option value={5}>5 per subject (Quick)</option>
                        <option value={15}>15 per subject (Practice)</option>
                        <option value={25}>25 per subject (Full Paper)</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-2">Total Duration</label>
                     <div className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-900 text-slate-300 cursor-not-allowed">
                        {config.durationMinutes} Minutes
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-2">Difficulty</label>
                     <select 
                        value={config.difficulty}
                        onChange={(e) => setConfig({...config, difficulty: e.target.value as Difficulty})}
                        className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                     >
                        <option value="Mixed">Mixed (Exam Like)</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                     </select>
                  </div>
               </div>

               {/* Chapter Selection */}
               <div>
                  <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-slate-400">Syllabus Scope</label>
                     <span className="text-xs text-slate-500">
                        {isFullSyllabus ? 'Full Syllabus Mode' : `${config.chapters.length} chapters selected`}
                     </span>
                  </div>
                  <ChapterSelector 
                     selectedChapters={config.chapters}
                     onToggleChapter={toggleChapter}
                     onSelectSubjectAll={handleSubjectAll}
                     onSetFullSyllabus={handleSetFullSyllabus}
                     onRandomSelect={handleRandomSelect}
                     isFullSyllabus={isFullSyllabus}
                  />
               </div>

               {error && (
                  <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-sm flex items-center gap-2">
                     <span className="font-bold">Error:</span> {error}
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl">
               <button 
                  onClick={() => startTest(config)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-900/50 transition-all transform hover:scale-[1.01]"
               >
                  Generate Test
               </button>
            </div>
         </div>
      </div>
    );
  }

  // Home View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Navbar */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto w-full z-10">
         <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(6,182,212,0.6)]">J</div>
            <span className="text-2xl font-bold text-slate-100 tracking-tight">JEE Genius</span>
         </div>
         <button 
           onClick={() => setView('history')}
           className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 rounded-lg transition-all text-sm font-medium"
         >
           <History size={18} />
           <span className="hidden sm:inline">My Tests</span>
         </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-4xl mx-auto w-full space-y-12 z-10 py-12">
         <div className="space-y-6 animate-in slide-in-from-bottom duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-cyan-400 font-medium text-sm border border-cyan-900/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
               <Sparkles size={16} />
               <span>Powered by Gemini 2.5 Flash</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-2xl">
               Master JEE Mains with <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-lg">AI-Powered PYQs</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
               Generate unlimited mock tests sourced from authentic 2019-2025 question patterns. Shuffle papers, target weak chapters, and analyze your performance instantly.
            </p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl animate-in slide-in-from-bottom duration-700 delay-200 fade-in">
            <button 
               onClick={handleQuickStart}
               className="group relative overflow-hidden p-8 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 hover:border-cyan-500/50 shadow-xl hover:shadow-cyan-900/20 transition-all text-left"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
               <Brain size={32} className="text-cyan-400 mb-4 relative z-10" />
               <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Quick Mock</h3>
               <p className="text-slate-400 relative z-10">10 Questions • Mixed Syllabus • Instant Analysis. Perfect for a quick check.</p>
               <div className="mt-6 flex items-center text-cyan-400 font-semibold group-hover:gap-2 transition-all">
                  Start Now <ArrowRight size={18} className="ml-1" />
               </div>
            </button>

            <button 
               onClick={handleCustomStart}
               className="group relative overflow-hidden p-8 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 hover:border-purple-500/50 shadow-xl hover:shadow-purple-900/20 transition-all text-left"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
               <Settings size={32} className="text-purple-400 mb-4 relative z-10" />
               <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Custom PYQ Test</h3>
               <p className="text-slate-400 relative z-10">Select specific chapters, set time limits, difficulty, and question count.</p>
               <div className="mt-6 flex items-center text-purple-400 font-semibold group-hover:gap-2 transition-all">
                  Configure <ArrowRight size={18} className="ml-1" />
               </div>
            </button>
         </div>

         <div className="flex items-center gap-8 text-slate-500 text-sm font-medium animate-in fade-in duration-1000 delay-500">
            <span className="flex items-center gap-2"><BookOpen size={16}/> 90+ Chapters Covered</span>
            <span className="flex items-center gap-2"><Play size={16}/> Real Exam Interface</span>
         </div>
      </main>
      
      <div className="p-6 text-center text-slate-600 text-sm z-10 border-t border-slate-800/50">
         <p className="font-semibold text-slate-500">Made by Kunj Khandelwal</p>
         <p className="text-xs mt-1 opacity-70">Questions are AI-generated based on PYQ patterns. Not actual leaked papers.</p>
      </div>
    </div>
  );
};

export default App;
