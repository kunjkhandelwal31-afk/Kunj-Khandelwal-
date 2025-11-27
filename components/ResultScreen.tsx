
import React, { useState } from 'react';
import { UserResponse, Question, QuestionType, Subject, QuestionStatus } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, Legend, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  CheckCircle, XCircle, RefreshCw, BookOpen, BarChart2, 
  Clock, Zap, Trophy, Target, Brain, AlertTriangle, Timer, Activity, Share2
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface ResultScreenProps {
  questions: Question[];
  responses: UserResponse[];
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ questions, responses, onRestart }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'solutions'>('analysis');
  const [isCopied, setIsCopied] = useState(false);

  // --- Core Calculations ---
  
  let correct = 0;
  let incorrect = 0;
  let score = 0;
  let unattempted = 0;
  let totalTime = 0;

  // Detailed question analysis
  const analyzedQuestions = questions.map(q => {
    const res = responses.find(r => r.questionId === q.id);
    const timeSpent = res?.timeSpentSeconds || 0;
    totalTime += timeSpent;

    let status: 'correct' | 'wrong' | 'skipped' = 'skipped';
    let userAnswer = res?.selectedOption;

    if (res && res.selectedOption !== null) {
      // Logic for checking answer
      let isCorrect = false;
      if (q.type === QuestionType.MCQ) {
         isCorrect = res.selectedOption === q.correctAnswer;
      } else {
         // Numerical comparison (trim whitespace)
         isCorrect = res.selectedOption.trim() === q.correctAnswer.trim();
      }

      if (isCorrect) {
        correct++;
        score += 4;
        status = 'correct';
      } else {
        incorrect++;
        score -= 1;
        status = 'wrong';
      }
    } else {
      unattempted++;
    }

    return { ...q, status, timeSpent, userAnswer };
  });

  const totalQuestions = questions.length;
  const attempted = correct + incorrect;
  const maxScore = totalQuestions * 4;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const percentage = Math.round((score / maxScore) * 100);
  
  // Simulated Percentile (Gamification)
  const percentile = Math.min(99.9, Math.max(10, (percentage * 0.8) + 40 + (accuracy * 0.1))).toFixed(1);

  // --- Time Stats ---
  const avgTimePerQ = attempted > 0 ? Math.round(totalTime / attempted) : 0;
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // --- Chart Data ---

  const pieData = [
    { name: 'Correct', value: correct, color: '#22c55e' },
    { name: 'Incorrect', value: incorrect, color: '#ef4444' },
    { name: 'Skipped', value: unattempted, color: '#334155' },
  ];

  // Subject-wise Radar Data
  const subjects = [Subject.PHYSICS, Subject.CHEMISTRY, Subject.MATHS];
  const radarData = subjects.map(sub => {
    const subQs = analyzedQuestions.filter(q => q.subject === sub);
    const subAttempted = subQs.filter(q => q.status !== 'skipped').length;
    const subCorrect = subQs.filter(q => q.status === 'correct').length;
    const subAccuracy = subAttempted > 0 ? Math.round((subCorrect / subAttempted) * 100) : 0;
    
    return {
      subject: sub,
      accuracy: subAccuracy,
      fullMark: 100
    };
  });

  // Subject-wise Bar Data
  const barData = subjects.map(sub => {
    const subQs = analyzedQuestions.filter(q => q.subject === sub);
    return {
      name: sub.slice(0, 4), // Short name
      Correct: subQs.filter(q => q.status === 'correct').length,
      Wrong: subQs.filter(q => q.status === 'wrong').length,
      Skipped: subQs.filter(q => q.status === 'skipped').length,
    };
  });

  // --- AI Verdict Generator ---
  const getVerdict = () => {
    if (score === maxScore) return { title: "Godlike!", msg: "Perfect score. You are absolutely ready for JEE Advanced.", color: "text-amber-400" };
    if (accuracy > 85 && percentage > 70) return { title: "Excellent Performance", msg: "High accuracy and great conceptual clarity. Keep maintaining this pace.", color: "text-green-400" };
    if (accuracy > 85 && percentage < 50) return { title: "Cautious Sniper", msg: "Great accuracy but low attempts. You need to increase your speed.", color: "text-cyan-400" };
    if (accuracy < 60 && attempted > totalQuestions * 0.8) return { title: "Guesswork Hazard", msg: "Too many negative marks. Stop guessing and focus on accuracy.", color: "text-red-400" };
    if (score < 0) return { title: "Critical Condition", msg: "Concepts are weak. Revisit your basics immediately.", color: "text-red-600" };
    return { title: "Balanced Effort", msg: "Good start, but there is room for improvement in both speed and accuracy.", color: "text-blue-400" };
  };

  const verdict = getVerdict();

  const handleShare = () => {
    const text = `JEE Genius Result 🚀\nScore: ${score}/${maxScore}\nAccuracy: ${accuracy}%\nPercentile: ${percentile}%ile\n\nTry it now! #JEEGenius`;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 overflow-y-auto text-slate-200 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6">
           <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-cyan-500/10 rounded-lg"><Trophy size={24} className="text-cyan-400"/></div>
                 <h1 className="text-3xl font-bold text-slate-100">Test Analysis</h1>
              </div>
              <p className="text-slate-400 ml-11">Review your performance insights and detailed solutions.</p>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 flex-1 md:flex-none">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'analysis' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <BarChart2 size={18} /> Analysis
                </button>
                <button
                  onClick={() => setActiveTab('solutions')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'solutions' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <BookOpen size={18} /> Solutions
                </button>
             </div>

             <button 
                onClick={handleShare}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all"
                title="Share Result"
             >
                {isCopied ? <CheckCircle size={20} className="text-green-400"/> : <Share2 size={20} />}
             </button>

             <button 
                onClick={onRestart}
                className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-lg shadow-cyan-900/40 transition-all hover:scale-105"
                title="Restart Test"
             >
                <RefreshCw size={20} />
             </button>
           </div>
        </header>

        {activeTab === 'analysis' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Score Card */}
               <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={80}/></div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Score</p>
                  <div className="flex items-end gap-2">
                     <span className="text-4xl font-bold text-white">{score}</span>
                     <span className="text-lg text-slate-500 mb-1">/ {maxScore}</span>
                  </div>
                  <div className="mt-3 text-xs font-medium px-2 py-1 bg-slate-800 rounded w-fit text-cyan-400 border border-slate-700/50">
                     Top {percentile}%ile Simulated
                  </div>
               </div>

               {/* Accuracy Card */}
               <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={80}/></div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Accuracy</p>
                  <div className="flex items-end gap-2">
                     <span className={`text-4xl font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                     <CheckCircle size={14} className="text-green-500"/> {correct} Correct
                     <XCircle size={14} className="text-red-500"/> {incorrect} Wrong
                  </div>
               </div>

               {/* Time Card */}
               <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Timer size={80}/></div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Time Efficiency</p>
                  <div className="flex items-end gap-2">
                     <span className="text-4xl font-bold text-blue-400">{formatTime(totalTime)}</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                     <Clock size={14}/> Avg. <span className="text-slate-200 font-medium">{avgTimePerQ}s</span> / question
                  </div>
               </div>

               {/* Verdict Card */}
               <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-xl"></div>
                  <div className="flex items-center gap-2 mb-2">
                     <Brain size={18} className={verdict.color}/>
                     <span className={`font-bold ${verdict.color}`}>{verdict.title}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                     "{verdict.msg}"
                  </p>
               </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Subject Balance (Radar) */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 lg:col-span-1 shadow-lg">
                  <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><Target size={18} className="text-purple-400"/> Skill Balance</h3>
                  <div className="h-[250px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                           <PolarGrid stroke="#334155" />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                           <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                           <Radar name="Accuracy" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                           <ReTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}/>
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Performance Stack (Bar) */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 lg:col-span-2 shadow-lg">
                  <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-blue-400"/> Subject-wise Breakdown</h3>
                  <div className="h-[250px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={80} tick={{fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                           <ReTooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc'}} />
                           <Legend />
                           <Bar dataKey="Correct" stackId="a" fill="#22c55e" barSize={30} radius={[0, 4, 4, 0]} />
                           <Bar dataKey="Wrong" stackId="a" fill="#ef4444" barSize={30} />
                           <Bar dataKey="Skipped" stackId="a" fill="#334155" barSize={30} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Question Heatmap */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Zap size={18} className="text-yellow-400"/> Question Map</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Correct</div>
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Wrong</div>
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-700 rounded-sm"></div> Skipped</div>
                  </div>
               </div>
               
               <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-2">
                  {analyzedQuestions.map((q, idx) => (
                     <div 
                        key={q.id}
                        className={`
                           aspect-square rounded-md flex flex-col items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-110 relative group
                           ${q.status === 'correct' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
                             q.status === 'wrong' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
                             'bg-slate-800 text-slate-500 border border-slate-700'}
                        `}
                     >
                        <span>{idx + 1}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                           {q.timeSpent}s • {q.subject}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

          </div>
        ) : (
          /* Solutions Tab */
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
               <div className="p-6 border-b border-slate-800 bg-slate-900">
                  <h3 className="font-semibold text-slate-200">Detailed Solutions</h3>
               </div>
               <div className="divide-y divide-slate-800">
                  {analyzedQuestions.map((q, idx) => (
                     <div key={q.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                        <div className="flex gap-4">
                           <div className={`shrink-0 w-8 h-8 flex items-center justify-center font-bold rounded-lg border text-sm
                              ${q.status === 'correct' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 
                                q.status === 'wrong' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
                                'bg-slate-800 text-slate-400 border-slate-700'}
                           `}>
                              {idx + 1}
                           </div>
                           <div className="flex-1 space-y-4">
                              {/* Metadata */}
                              <div className="flex flex-wrap items-center gap-2">
                                 <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-medium">{q.subject}</span>
                                 <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{q.chapter}</span>
                                 <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-500 border border-slate-700">{q.year}</span>
                                 <span className="text-xs text-slate-500 ml-auto flex items-center gap-1"><Clock size={12}/> Time: {q.timeSpent}s</span>
                              </div>

                              {/* Question Text */}
                              <div className="text-slate-200 text-lg leading-relaxed font-medium">
                                 <MathRenderer text={q.text} />
                              </div>

                              {/* SVG Diagram */}
                              {q.diagramSvg && (
                                 <div className="mt-2 p-4 bg-white rounded-lg w-fit border border-slate-700/50 text-black">
                                    <MathRenderer svg={q.diagramSvg} />
                                 </div>
                              )}

                              {/* Comparison Box */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                 <div className={`p-3 rounded-lg border ${q.status === 'correct' ? 'bg-green-900/10 border-green-900/30' : q.status === 'wrong' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900 border-slate-800'}`}>
                                    <span className="text-xs uppercase font-bold text-slate-500 mb-1 block">Your Answer</span>
                                    <div className={`font-medium ${q.status === 'correct' ? 'text-green-400' : q.status === 'wrong' ? 'text-red-400' : 'text-slate-500'}`}>
                                       {q.userAnswer ? (
                                          q.type === QuestionType.MCQ && q.options 
                                             ? <span>({String.fromCharCode(65 + parseInt(q.userAnswer))}) <MathRenderer text={q.options[parseInt(q.userAnswer)]} /></span>
                                             : q.userAnswer
                                       ) : "Not Attempted"}
                                    </div>
                                 </div>
                                 <div className="p-3 rounded-lg border bg-slate-900 border-slate-800">
                                    <span className="text-xs uppercase font-bold text-slate-500 mb-1 block">Correct Answer</span>
                                    <div className="font-medium text-green-400">
                                       {q.type === QuestionType.MCQ && q.options 
                                          ? <span>({String.fromCharCode(65 + parseInt(q.correctAnswer))}) <MathRenderer text={q.options[parseInt(q.correctAnswer)]} /></span>
                                          : q.correctAnswer}
                                    </div>
                                 </div>
                              </div>

                              {/* Explanation */}
                              <div className="pt-4 border-t border-slate-800/50">
                                 <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-1 bg-cyan-500/20 text-cyan-400 p-1 rounded"><Brain size={14}/></span>
                                    <div>
                                       <span className="text-sm font-bold text-slate-400 block mb-1">Concept & Solution</span>
                                       <div className="text-slate-300 leading-relaxed text-sm">
                                          <MathRenderer text={q.explanation} />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
