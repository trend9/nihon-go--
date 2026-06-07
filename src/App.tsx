import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Newspaper, Calendar, Award, RotateCcw, ShieldCheck, 
  Search, BookOpen, Clock, Heart, Volume2, HelpCircle, 
  Menu, Sparkles, AlertCircle, Compass, CheckCircle2, Lock, BookOpenText
} from "lucide-react";

import { Article, LearningState } from "./types";
import { PostItNote } from "./components/PostItNote";
import { CmsDashboard } from "./components/CmsDashboard";
import { AboutModal } from "./components/AboutModal";
import { PrivacyModal } from "./components/PrivacyModal";
import { initialArticles } from "./data/initialArticles";

export default function App() {
  // Navigation states
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  
  // Articles catalog states
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(initialArticles[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(null);

  // Completed articles and learning transcripts
  const [learningState, setLearningState] = useState<LearningState>(() => {
    try {
      const saved = localStorage.getItem("nihongo_learning_progress");
      return saved ? JSON.parse(saved) : { completedArticles: [], currentLevel: 1 };
    } catch {
      return { completedArticles: [], currentLevel: 1 };
    }
  });

  // Quiz active answers state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);

  // Premium modal states (EEAT)
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);

  // Layout states
  const [toastMessage, setToastMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize routing popstates (enables typing /host directly in URL)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch articles database from Express backend
  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = (await res.json()) as Article[];
        if (data && data.length > 0) {
          setArticles(data);
          // If previous selected ID is no longer in the list, default to first item
          const stillExists = data.some((a) => a.id === selectedArticleId);
          if (!stillExists) {
            setSelectedArticleId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.warn("Express backend articles endpoint offline, falling back to local client seed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run catalog fetch at mount
  useEffect(() => {
    fetchArticles();
  }, []);

  // Save learning states
  useEffect(() => {
    localStorage.setItem("nihongo_learning_progress", JSON.stringify(learningState));
  }, [learningState]);

  // Current formatted date in UK/London style for newspaper masthead
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-GB', options);
  };

  const activeArticle = articles.find((a) => a.id === selectedArticleId) || articles[0];

  useEffect(() => {
    // Reset quiz options whenever selected article shifts
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);
  }, [selectedArticleId]);

  // Mark/unmark current lesson completion
  const handleToggleLessonComplete = (articleId: string) => {
    const isCompleted = learningState.completedArticles.includes(articleId);
    let updatedList: string[];

    if (isCompleted) {
      updatedList = learningState.completedArticles.filter((id) => id !== articleId);
      triggerToast("Lesson removed from completed list!");
    } else {
      updatedList = [...learningState.completedArticles, articleId];
      triggerToast("おめでとう！ Lesson mastered and cataloged.");
    }

    setLearningState({
      ...learningState,
      completedArticles: updatedList,
      currentLevel: Math.max(learningState.currentLevel, activeArticle.level)
    });
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Text-to-speech for speaking target headlines / grammar pieces
  const handleSpeakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filtered issue list based on filters and search
  const filteredArticles = articles.filter((art) => {
    const matchesLevel = selectedLevelFilter === null || art.level === selectedLevelFilter;
    const matchesQuery = 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.introduction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.grammarExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.postIts.some((p) => p.japanese.includes(searchQuery) || p.english.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesQuery;
  });

  // Calculate stats
  const masteredPercentage = articles.length > 0
    ? Math.round((learningState.completedArticles.length / articles.length) * 100)
    : 0;

  const getFluencyRank = (completedCount: number) => {
    if (completedCount >= 5) return "Shogun of Linguistics 🎌";
    if (completedCount >= 3) return "Samurai Scholar ⚔️";
    if (completedCount >= 1) return "Ronin Student 🌾";
    return "Nihon-go Novice 🎋";
  };

  // Morning to Night Timely Cycle Schedule definition
  const dailyTimelineUpdates = [
    { title: "Morning (☀️)", level: 1, label: "Beginner Greetings", icon: "☀️", color: "text-amber-600 bg-amber-50" },
    { title: "Late-Morning (🍜)", level: 2, label: "Diner & Ordering", icon: "🍜", color: "text-rose-600 bg-rose-50" },
    { title: "Afternoon (⛩️)", level: 3, label: "Travel & Intention", icon: "⛩️", color: "text-emerald-600 bg-emerald-50" },
    { title: "Evening (☔)", level: 4, label: "Office conditional", icon: "☔", color: "text-indigo-600 bg-indigo-50" },
    { title: "Night (🌙)", level: 5, label: "Aesthetics & Zen", icon: "🌙", color: "text-violet-600 bg-violet-50" },
  ];

  // Render CMS Dashboard when URL path matches /host
  if (currentPath === "/host") {
    return (
      <CmsDashboard
        onBackToFeed={() => navigateTo("/")}
        articles={articles}
        onRefreshArticles={fetchArticles}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf7] font-serif text-[#1a1a1a] select-text border-[12px] border-[#222] flex flex-col justify-between selection:bg-rose-100">
      
      <div className="px-4 sm:px-8 py-6 flex-1 flex flex-col justify-between">
        {/* 1. BRAND HEADER MASTHEAD (Artistic Flair inspired) */}
        <header className="border-b-2 border-black pb-4 mb-4 flex flex-col md:flex-row justify-between items-stretch md:items-end gap-4">
          
          {/* Left area: Brand, Edition tag and Title */}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] font-sans font-bold text-gray-700">
              London & Tokyo Edition • Established 2024
            </span>
            <h1 
              onClick={() => { setSelectedLevelFilter(null); setSearchQuery(""); }}
              className="text-5xl sm:text-7xl font-black italic leading-none tracking-tighter uppercase cursor-pointer select-none hover:opacity-80 transition-opacity"
            >
              nihon-go!!
            </h1>
          </div>

          {/* Right area: Levels and subtitle tag */}
          <div className="text-left md:text-right flex flex-col items-start md:items-end gap-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-sans font-bold uppercase border-b border-black pb-1 w-full md:w-auto">
              <span className={`cursor-pointer hover:underline ${selectedLevelFilter === 1 ? 'text-red-700 font-extrabold' : 'text-gray-500'}`} onClick={() => setSelectedLevelFilter(1)}>L1: Greetings</span>
              <span className={`cursor-pointer hover:underline ${selectedLevelFilter === 2 ? 'text-red-700 font-extrabold' : 'text-gray-500'}`} onClick={() => setSelectedLevelFilter(2)}>L2: Ramen</span>
              <span className={`cursor-pointer hover:underline ${selectedLevelFilter === 3 ? 'text-red-700 font-extrabold' : 'text-gray-500'}`} onClick={() => setSelectedLevelFilter(3)}>L3: Intent</span>
              <span className={`cursor-pointer hover:underline ${selectedLevelFilter === 4 ? 'text-red-700 font-extrabold' : 'text-gray-500'}`} onClick={() => setSelectedLevelFilter(4)}>L4: Office</span>
              <span className={`cursor-pointer hover:underline ${selectedLevelFilter === 5 ? 'text-red-700 font-extrabold' : 'text-gray-500'}`} onClick={() => setSelectedLevelFilter(5)}>L5: Zen</span>
            </div>
            <p className="text-xs sm:text-sm italic font-medium text-gray-700 max-w-md">
              "Your Daily Dose of Japanese Mastery, Delivered Every 3 Hours."
            </p>
          </div>

        </header>

        {/* Double Border Gazette Masthead Details */}
        <div className="border-y-2 border-dashed border-black py-3 mb-6 flex flex-col sm:flex-row justify-between items-center text-xs tracking-tight gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-red-700" />
            <strong className="uppercase">{getFormattedDate()}</strong>
          </div>
          
          {/* Quick study transcript statistics */}
          <div className="flex items-center gap-6 flex-wrap justify-center text-center">
            <span className="font-mono text-[11px] bg-white border border-black p-1 px-2.5">
              Archive Issues: <strong>{articles.length} Issues</strong>
            </span>
            <span className="font-mono text-[11px] bg-white border border-black p-1 px-2.5">
              Mastery Transcripts: <strong>{masteredPercentage}% Complete</strong> ({learningState.completedArticles.length}/{articles.length})
            </span>
            <span className="font-mono text-[11px] font-bold text-white bg-black border border-black px-2.5 py-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> {getFluencyRank(learningState.completedArticles.length)}
            </span>
          </div>

          <div className="font-sans font-bold uppercase text-gray-600 tracking-wider text-[11px]">
            Price: Five Minutes Daily
          </div>
        </div>

      {/* 2. LEVEL CHOOSE NAV & FILTER SEGMENT */}
      <section className="mb-8 pt-2">
        <div className="text-center mb-4">
          <span className="font-mono text-[10px] tracking-widest text-red-700 uppercase font-bold block mb-1">
            EXPRESS CLASSIFICATION CHANNELS
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-extrabold text-black uppercase">
            Select Your Learning Difficulty Level
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const levelNamesMap: Record<number, string> = {
              1: "L1: Greetings ☀️",
              2: "L2: Ramen/Diners 🍜",
              3: "L3: Intentions ⛩️",
              4: "L4: Office Conditional ☔",
              5: "L5: Zen/Aesthetics 🌙"
            };
            const isSelected = selectedLevelFilter === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevelFilter(isSelected ? null : lvl)}
                className={`py-2 px-3 border border-black font-serif text-xs font-bold transition-all duration-150 flex flex-col justify-center items-center ${
                  isSelected 
                    ? "bg-black text-white" 
                    : "bg-white hover:bg-gray-100 text-[#1a1a1a]"
                }`}
              >
                <span className="block font-sans font-bold text-xs uppercase">Level {lvl}</span>
                <span className="opacity-80 font-serif font-bold text-[11px] mt-0.5">
                  {levelNamesMap[lvl]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Keyword Archive Search Input */}
        <div className="max-w-md mx-auto mt-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search grammar indices, Japanese scripts or vocabularies..."
              className="w-full bg-white border border-black px-9 py-2.5 text-xs font-sans tracking-wide focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-2.5 text-xs text-red-700 font-mono font-bold hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. CORE NEWSPAPER LAYOUT (3 columns grid for desktop) */}
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-0 border-t border-black pt-4 mb-12">
        
        {/* ======================================= */}
        {/* LEFT COLUMN: DAILY TIMELINE SCHEDULE SLOTS */}
        {/* ======================================= */}
        <aside className="lg:col-span-1 p-4 flex flex-col gap-4 lg:border-r border-black lg:pr-6">
          
          <div className="border border-black p-3 bg-white">
            <h2 className="text-xl font-bold border-b border-black mb-3 pb-1 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-700" /> Today's Schedule
            </h2>
            
            <div className="space-y-3 text-sm">
              {dailyTimelineUpdates.map((t) => {
                // Find first article that matches this timing/level
                const matchArt = articles.find((a) => a.timeOfDay === t.title.split(" ")[0]);
                const isSelected = matchArt && activeArticle && matchArt.id === activeArticle.id;
                const hasCompleted = matchArt && learningState.completedArticles.includes(matchArt.id);

                const borderMap: Record<number, string> = {
                  1: "border-green-600",
                  2: "border-yellow-500",
                  3: "border-orange-500",
                  4: "border-red-500",
                  5: "border-black"
                };

                return (
                  <button
                    key={t.title}
                    onClick={() => {
                      if (matchArt) {
                        setSelectedArticleId(matchArt.id);
                      } else {
                        triggerToast(`No publication live or loaded for Level ${t.level} yet. Try creating one in the CMS!`);
                      }
                    }}
                    className={`w-full text-left pl-3 py-1.5 border-l-4 transition-all flex flex-col justify-center ${borderMap[t.level]} ${
                      isSelected 
                        ? "bg-yellow-50 font-bold" 
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className="font-sans font-bold text-[10px] sm:text-xs block">
                      {t.title.split(" ")[0]} • LVL {t.level} {hasCompleted && "✓"}
                    </span>
                    <span className={`italic text-xs block leading-tight ${isSelected ? 'underline' : ''}`}>
                      {matchArt ? matchArt.title : `Awaiting Level ${t.level} print...`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAST ARCHIVES SELECTION LIST */}
          <div className="pt-2">
            <h4 className="font-serif font-extrabold text-[#1a1a1a] text-xs uppercase tracking-wider border-b border-black pb-1 mb-2">
              Gazette Archives
            </h4>
            
            {filteredArticles.length === 0 ? (
              <div className="p-3 border border-dashed border-black/30 font-serif text-xs text-gray-500 italic text-center">
                No articles matched.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                {filteredArticles.map((art) => {
                  const isCurrent = art.id === activeArticle.id;
                  const completes = learningState.completedArticles.includes(art.id);
                  return (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left p-2 text-xs transition-colors border block ${
                        isCurrent 
                          ? "bg-black text-white border-transparent font-bold" 
                          : "bg-white hover:bg-gray-50 border-black"
                      }`}
                    >
                      <div className="flex justify-between items-baseline gap-1">
                        <span className={`font-mono font-semibold text-[8px] uppercase ${isCurrent ? 'text-gray-300' : 'text-gray-500'}`}>
                          LVL {art.level} UPDATE
                        </span>
                        <span className="font-mono text-[8.5px] opacity-60 font-semibold uppercase">
                          {art.timeOfDay}
                        </span>
                      </div>
                      <span className="font-serif truncate block mt-0.5 text-[11.5px]">
                        {art.title} {completes && "✓"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-auto pt-2">
            <div className="bg-[#222] text-white p-4">
              <h3 className="text-[10px] uppercase tracking-widest mb-1.5 font-sans font-bold">Editor's Note</h3>
              <p className="text-[11px] leading-relaxed italic text-gray-300">
                "We focus on EEAT principles to ensure your learning path is accurate and professional. Master the nuance, not just the word."
              </p>
            </div>
          </div>

        </aside>

        {/* ======================================= */}
        {/* CENTER + RIGHT COLUMNS: MAIN ARTICLE SHOWCASE */}
        {/* ======================================= */}
        <section className="lg:col-span-3 space-y-8 lg:pl-8">
          
          {/* Main Story Paper Container */}
          <article className="border-b border-black pb-8 space-y-6">
            
            {/* 1. Article Front details */}
            <div className="space-y-3 pb-3 border-b border-black/20">
              <div className="flex justify-between items-center mb-2 text-xs font-sans uppercase font-bold text-red-700">
                <span>Featured Lesson: {activeArticle.levelName}</span>
                
                {/* Mark Lesson Complete Button */}
                <button
                  onClick={() => handleToggleLessonComplete(activeArticle.id)}
                  id="btn-toggle-master"
                  className={`flex items-center gap-1.5 border px-2.5 py-1 transition-colors font-sans text-[11px] font-bold uppercase tracking-wider ${
                    learningState.completedArticles.includes(activeArticle.id)
                      ? "bg-black text-white border-black"
                      : "bg-white hover:bg-gray-100 border-black"
                  }`}
                >
                  {learningState.completedArticles.includes(activeArticle.id) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Complete
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 text-red-700" /> Mark Mastered
                    </>
                  )}
                </button>
              </div>

              <h2 className="font-serif text-3xl sm:text-5xl font-black italic leading-[1.1] mb-2 tracking-tight text-[#1a1a1a]">
                {activeArticle.title}
              </h2>
              
              {activeArticle.subtitle && (
                <p className="font-serif italic text-base sm:text-lg text-gray-700 leading-relaxed max-w-3xl">
                  {activeArticle.subtitle}
                </p>
              )}

              <div className="flex justify-between items-center text-[11px] font-sans font-bold uppercase text-gray-500 pt-1">
                <span>Author Desk: <strong>{activeArticle.byline}</strong></span>
                <span>Edition slot: <strong>{activeArticle.timeOfDay} update</strong></span>
              </div>
            </div>

            {/* 2. Headline Image with Caption Section */}
            {activeArticle.thumbnailUrl && (
              <div className="space-y-2 max-w-4xl mx-auto">
                <div className="border-2 border-black p-2 bg-white relative overflow-hidden group shadow-sm">
                  <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                  <img
                    src={activeArticle.thumbnailUrl}
                    alt={activeArticle.thumbnailAlt || "Japanese lesson visual illustration"}
                    referrerPolicy="no-referrer"
                    className="w-full object-cover max-h-96 filter grayscale contrast-125 sepia-[15%] transition-transform hover:grayscale-0 duration-500"
                  />
                  <div className="absolute bottom-4 left-4 bg-white text-[9px] px-2 py-0.5 font-sans font-bold border border-black uppercase select-none tracking-wider">
                    Fig. {activeArticle.level} — Plate Engraving
                  </div>
                </div>
                <p className="font-serif text-[11px] text-gray-500 tracking-normal text-center italic">
                  Plate details: {activeArticle.thumbnailAlt || "Curriculum illustrative scene."}
                </p>
              </div>
            )}

            {/* 3. Newspaper Article Lead (Drop Cap Column) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
              <div className="md:col-span-7 font-serif text-sm sm:text-base text-gray-900 leading-relaxed text-justify space-y-4">
                <div className="first-letter:text-5xl first-letter:font-black first-letter:italic first-letter:float-left first-letter:mr-2.5 first-letter:text-black first-letter:leading-none select-text">
                  {activeArticle.introduction}
                </div>
                
                <h3 className="font-serif font-black italic text-lg text-black border-b border-black pb-1 pt-4 uppercase">
                  Grammar Blueprint Analysis
                </h3>
                <p className="text-justify indent-4 leading-relaxed whitespace-pre-line text-sm sm:text-md text-[#1a1a1a]">
                  {activeArticle.grammarExplanation}
                </p>
              </div>

              {/* 4. Cultural Mini-Column Sidebar */}
              {activeArticle.culturalInsight && (
                <div className="md:col-span-5 bg-white border border-black p-5 rounded-none font-sans relative">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-red-700 font-bold block mb-2 border-b border-black/10 pb-1">
                    THE JAPANESE CUSTOM COLUMN
                  </span>
                  <h4 className="font-serif font-extrabold text-base text-black mb-2 leading-tight">
                    Cultural Retrospective & Insights
                  </h4>
                  <p className="font-serif text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line text-justify">
                    {activeArticle.culturalInsight}
                  </p>
                </div>
              )}
            </div>
            {/* 5. INTERACTIVE POST-IT NOTES FOR VOCABULARY */}
            <div className="pt-8 border-t border-black/25 space-y-4">
              <div className="text-center md:text-left">
                <span className="font-mono text-[10px] tracking-widest text-[#1a1a1a]/60 uppercase font-black block mb-1">
                  TACTILE STUDY ACCENTS
                </span>
                <h3 className="font-serif text-2xl font-black text-black uppercase tracking-tight">
                  Interactive Pin-Up Post-It Sheets
                </h3>
                <p className="font-serif italic text-xs text-gray-600 leading-relaxed">
                  Understand individual vocab elements. Click the speaker icon to listen to authentic text-to-speech pronunciation tracks!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {activeArticle.postIts.map((p, pIdx) => (
                  <PostItNote key={p.id} data={p} index={pIdx} />
                ))}
              </div>
            </div>

            {/* ======================================= */}
            {/* 6. WEEKEND EDITION COMPREHENSION QUIZ */}
            {/* ======================================= */}
            {activeArticle.quiz && (
              <section className="pt-10 border-t border-black/25 max-w-3xl mx-auto">
                <div className="border-4 border-double border-black p-6 bg-white shadow-md">
                  <div className="text-center border-b border-black/10 pb-3 mb-4">
                    <span className="font-mono text-[10px] tracking-widest text-red-700 font-bold uppercase block mb-1">
                      INTELLIGENCE COMPREHENSION QUIZ
                    </span>
                    <h3 className="font-serif font-black text-lg text-black uppercase tracking-tight">
                      Japanese Linguistic Proficiency Check
                    </h3>
                  </div>

                  <p className="font-serif font-bold text-sm sm:text-base text-black mb-6 text-center">
                    {activeArticle.quiz.question}
                  </p>

                  <div className="space-y-2.5">
                    {activeArticle.quiz.options.map((opt, oIdx) => {
                      const isSelected = selectedQuizOption === oIdx;
                      const isCorrect = oIdx === activeArticle.quiz.answerIndex;
                      
                      let optionBg = "bg-white hover:bg-gray-50 border-black";
                      if (isQuizSubmitted) {
                        if (isCorrect) {
                          optionBg = "bg-green-100 border-green-600 text-green-950 font-bold";
                        } else if (isSelected) {
                          optionBg = "bg-red-100 border-red-600 text-red-950";
                        }
                      } else if (isSelected) {
                        optionBg = "bg-black text-white border-transparent";
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={isQuizSubmitted}
                          onClick={() => setSelectedQuizOption(oIdx)}
                          className={`w-full text-left p-3 border text-xs select-none transition-colors font-serif font-semibold leading-relaxed flex items-center gap-2 ${optionBg}`}
                        >
                          <span className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 ${isSelected ? 'bg-white/10' : 'bg-black/5'} rounded-none`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-black/15 flex flex-col items-center gap-3">
                    {!isQuizSubmitted ? (
                      <button
                        disabled={selectedQuizOption === null}
                        onClick={() => setIsQuizSubmitted(true)}
                        id="btn-quiz-submit"
                        className="px-6 py-2 bg-black text-white hover:bg-gray-800 font-serif font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors border border-black"
                      >
                        Submit Response Proof
                      </button>
                    ) : (
                      <div className="w-full text-center space-y-4">
                        <div className="flex items-center gap-2 justify-center">
                          {selectedQuizOption === activeArticle.quiz.answerIndex ? (
                            <span className="text-green-800 font-bold font-serif text-sm flex items-center gap-1 uppercase tracking-tight">
                              <CheckCircle2 className="w-5 h-5 text-green-700" /> Correct assertion!
                            </span>
                          ) : (
                            <span className="text-red-800 font-bold font-serif text-sm flex items-center gap-1 uppercase tracking-tight">
                              <AlertCircle className="w-5 h-5 text-red-700" /> Incorrect claim.
                            </span>
                          )}
                        </div>

                        <p className="font-serif text-xs text-gray-800 italic leading-relaxed text-justify max-w-xl mx-auto bg-gray-50 p-3 rounded-none border border-black/20">
                          <strong>Explanatory review:</strong> {activeArticle.quiz.explanation}
                        </p>

                        <button
                          onClick={() => {
                            setSelectedQuizOption(null);
                            setIsQuizSubmitted(false);
                          }}
                          className="px-4 py-1.5 border border-black text-[11px] font-sans font-bold hover:bg-gray-50 text-black uppercase tracking-wider transition-colors flex items-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-trial Exam
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

          </article>
          
        </section>

      </main>

      </div>

      {/* 4. BRAND FOOTER (EEAT & LEGAL COMPLIANT LINKS) */}
      <footer className="bg-[#111111] text-white/90 px-6 sm:px-10 py-10 mt-12 space-y-8 select-text border-t-8 border-double border-white">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-neutral-300 leading-relaxed font-serif text-xs max-w-7xl mx-auto">
          
          <div className="md:col-span-5 space-y-3">
            <h4 className="font-serif font-black text-sm text-white uppercase tracking-widest border-b border-white/20 pb-1">
              nihon-go!! Publication Desk
            </h4>
            <p className="text-justify text-[11.5px]">
              Our daily electronic columns are distributed in absolute accordance with rigorous peer-reviewed academic linguistics structures. All materials undergo an automated proofreading verification (検品) check cycle to secure correct pronunciation profiles and typographic synchronization.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="font-serif font-black text-sm text-white uppercase tracking-widest border-b border-white/20 pb-1">
              Editorial Advisors
            </h4>
            <p className="text-justify text-[11px] italic">
              Prof. Kenji Sato • Sarah Jenkins, Senior Culinary Desk • Dr. Hiroshi Watanabe • Chief Webmaster representative
            </p>
          </div>

          <div className="md:col-span-4 space-y-3 text-center md:text-left">
            <h4 className="font-serif font-black text-sm text-white uppercase tracking-widest border-b border-white/20 pb-1">
              AdSense Regulatory Disclosures
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center md:justify-start pt-1 font-sans font-bold">
              <button
                onClick={() => setIsAboutOpen(true)}
                id="footer-about-link"
                className="hover:underline text-white"
              >
                About Us (EEAT)
              </button>
              <span>•</span>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                id="footer-privacy-link"
                className="hover:underline text-white"
              >
                Privacy Policy & Cookies
              </button>
            </div>
          </div>

        </div>

        {/* Newspaper Bottom Copyright bar */}
        <div className="border-t border-white/10 pt-6 text-center font-mono text-[10px] text-white/40 uppercase font-semibold">
          © 2026 nihon-go!! Educational Press Syndicate. All rights reserved. Web Platform registered.
        </div>

      </footer>

      {/* AA. GLOBAL TOAST ALERTS */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 35 }}
            className="fixed bottom-6 right-6 z-50 bg-cream-950 text-cream-50 border-2 border-cream-200 px-5 py-3 shadow-2xl rounded text-xs font-mono max-w-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AB. EEAT SYSTEM MODAL OVERLAYS */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

    </div>
  );
}
