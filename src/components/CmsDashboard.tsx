import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, KeyRound, ArrowLeft, Newspaper, Sparkles, BookOpen, 
  Trash2, Edit, CheckCircle, RefreshCcw, Save, X, Plus, AlertCircle, FileCheck
} from "lucide-react";
import { Article, PostItData } from "../types";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

let firebaseApp: any = null;
let firebaseAuth: any = null;

if (firebaseConfig.apiKey) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    console.error("Firebase client initialization failed:", err);
  }
}

interface CmsDashboardProps {
  onBackToFeed: () => void;
  articles: Article[];
  onRefreshArticles: () => Promise<void>;
}

export function CmsDashboard({ onBackToFeed, articles, onRefreshArticles }: CmsDashboardProps) {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("nihongo_admin_token");
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem("nihongo_admin_token");
  });
  const [authError, setAuthError] = useState<string>("");

  // Article creation/edit states
  const [activeTab, setActiveTab] = useState<"generator" | "manager">("generator");
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("Morning");

  // Editorial modal states
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSteps, setGenerationSteps] = useState<string>("");

  // Loading/Operation feedback
  const [editorialFeedback, setEditorialFeedback] = useState<string>("");

  const handleGoogleLogin = async () => {
    if (!firebaseAuth) {
      setAuthError("Firebase is not initialized. Please configure VITE_FIREBASE_API_KEY and other client keys in your .env file.");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = await result.user.getIdToken();
      
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });
      if (res.ok) {
        localStorage.setItem("nihongo_admin_token", credential);
        setToken(credential);
        setIsAdminLoggedIn(true);
        setAuthError("");
      } else {
        const errData = await res.json();
        setAuthError(errData.error || "Authentication failed.");
      }
    } catch (err: any) {
      setAuthError(`Sign-in failed: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setToken(null);
    localStorage.removeItem("nihongo_admin_token");
  };

  const getAuthHeaders = () => {
    const savedToken = localStorage.getItem("nihongo_admin_token") || token || "";
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${savedToken}`,
    };
  };

  // Trigger server-side content writing
  const handleAiAutoGeneration = async () => {
    setIsGenerating(true);
    setEditorialFeedback("");
    
    const steps = [
      "📜 Drafting pedagogical curriculum outline and custom grammar...",
      "🖌️ Composing situational dialogue and thumbtack post-its...",
      "🎨 Generating vintage charcoal plate illustrations...",
      "🔍 Executing spelling verification and unicode corruption scan...",
      "📰 Proofing and packing column layout metadata..."
    ];

    let stepIndex = 0;
    setGenerationSteps(steps[0]);
    
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setGenerationSteps(steps[stepIndex]);
      }
    }, 1800);

    try {
      const res = await fetch("/api/generate-article", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          level: selectedLevel,
          topic: customTopic,
          timeOfDay: customTime,
        }),
      });

      clearInterval(interval);

      if (res.ok) {
        setCustomTopic("");
        setEditorialFeedback("Article successfully registered into daily Gazette catalog!");
        await onRefreshArticles();
        setActiveTab("manager");
      } else {
        const errData = await res.json();
        setEditorialFeedback(`Error: ${errData.error || "Unable to write article."}`);
      }
    } catch (err: any) {
      clearInterval(interval);
      setEditorialFeedback(`Connection error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger server-side Proofreading check (検品)
  const handleAiProofreadCheck = async (article: Article) => {
    try {
      setEditorialFeedback(`Proofreading '${article.title}' for character issues...`);
      const res = await fetch("/api/check-article", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(article),
      });

      if (res.ok) {
        const corrected = await res.json();
        // Save corrected article
        const saveRes = await fetch(`/api/articles/${article.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(corrected),
        });

        if (saveRes.ok) {
          setEditorialFeedback(`Verification complete! '${article.title}' corrected and verified on disk!`);
          await onRefreshArticles();
        } else {
          setEditorialFeedback("Failed to update corrected article on disk.");
        }
      } else {
        setEditorialFeedback("Verify check failed.");
      }
    } catch (err: any) {
      setEditorialFeedback(`Error: ${err.message}`);
    }
  };

  // Submit manual editing corrections (CMS)
  const saveManualEditChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    try {
      const res = await fetch(`/api/articles/${editingArticle.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(editingArticle),
      });

      if (res.ok) {
        setEditingArticle(null);
        setEditorialFeedback("Printers informed: Manual edits published successfully!");
        await onRefreshArticles();
      } else {
        const data = await res.json();
        setEditorialFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setEditorialFeedback(`Error: ${err.message}`);
    }
  };

  // Delete article
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${title}' from archives?`)) return;

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": getAuthHeaders()["Authorization"],
        },
      });

      if (res.ok) {
        setEditorialFeedback(`Deleted article successfully.`);
        await onRefreshArticles();
      } else {
        setEditorialFeedback("Unable to archive article.");
      }
    } catch (err: any) {
      setEditorialFeedback(`Error: ${err.message}`);
    }
  };

  // Helper to handle form field editing nested state
  const handleArticleFieldChange = (key: keyof Article, value: any) => {
    if (!editingArticle) return;
    setEditingArticle({
      ...editingArticle,
      [key]: value
    });
  };

  const handlePostItFieldChange = (index: number, key: keyof PostItData, value: string) => {
    if (!editingArticle) return;
    const copiedPostIts = [...editingArticle.postIts];
    copiedPostIts[index] = {
      ...copiedPostIts[index],
      [key]: value
    };
    handleArticleFieldChange("postIts", copiedPostIts);
  };

  return (
    <div className="container mx-auto px-4 max-w-5xl py-8 min-h-screen newspaper-grid font-sans text-cream-900 selection:bg-rose-100">
      
      {/* Newspaper Top Navigation Strip */}
      <div className="flex justify-between items-center border-b border-cream-900 pb-3 mb-6">
        <button
          onClick={onBackToFeed}
          id="btn-back-feed"
          className="flex items-center gap-2 font-serif font-semibold text-sm border border-cream-900 px-3 py-1.5 hover:bg-cream-900 hover:text-cream-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to front page
        </button>
        <span className="font-mono text-xs uppercase tracking-widest text-cream-900/60 font-semibold">
          Restricted Area - Editorial desk
        </span>
      </div>

      {/* 1. AUTH SCREEN */}
      <AnimatePresence mode="wait">
        {!isAdminLoggedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto bg-cream-50 border-4 border-cream-900 p-8 shadow-xl mt-12 rounded-lg text-center"
          >
            <div className="w-16 h-16 bg-cream-200 border-2 border-cream-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-cream-900" />
            </div>

            <h2 className="font-serif text-2xl font-bold text-cream-900 mb-2">
              Editor in Chief Access
            </h2>
            <p className="text-sm text-cream-900/60 font-serif mb-6 leading-relaxed">
              Authenticate via Google Identity account. Access is restricted to authorized editors.
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded text-rose-950 text-xs font-sans flex items-center gap-2 text-left justify-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {!(import.meta as any).env.VITE_FIREBASE_API_KEY && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-amber-950 text-xs font-sans text-left">
                <strong>Config Required:</strong> Please set <code>VITE_FIREBASE_API_KEY</code> and other Firebase variables in your <code>.env</code> file.
              </div>
            )}

            <div className="flex justify-center py-4">
              <button
                onClick={handleGoogleLogin}
                id="btn-google-login"
                className="py-2.5 px-5 bg-white border border-cream-900 text-cream-900 font-serif font-bold text-sm hover:bg-cream-900 hover:text-white transition-colors flex items-center justify-center gap-2 shadow"
              >
                Sign In with Google Account
              </button>
            </div>
          </motion.div>
        ) : (
          
          /* 2. MAIN CMS AREA */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Admin Header Masthead */}
            <div className="text-center py-6 border-b-4 border-double border-cream-900 mb-6">
              <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2 text-xs font-mono font-bold text-cream-900/50">
                <span>PRESS OFFICE: TOKYO-LONDON MATRIX</span>
                <span>CHIEF WRITER: Authorized Editor</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-extrabold tracking-tight text-cream-950">
                nihon-go!! Editorial Suite
              </h1>
              <div className="flex justify-between items-center mt-3 pt-2 text-xs font-serif border-t border-cream-900/10">
                <span>Issue Dispatch Operator Desk</span>
                <button
                  onClick={handleLogout}
                  id="btn-admin-logout"
                  className="font-mono font-bold text-rose-800 hover:underline hover:scale-105 transition-transform"
                >
                  [Log Out Editor]
                </button>
              </div>
            </div>

            {/* Notification Bar */}
            {editorialFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 border-2 border-emerald-900 rounded font-serif text-sm text-emerald-950 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-800" />
                  <span>{editorialFeedback}</span>
                </div>
                <button onClick={() => setEditorialFeedback("")} className="opacity-60 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b-2 border-cream-900">
              <button
                onClick={() => setActiveTab("generator")}
                className={`px-6 py-2.5 font-serif font-bold text-base mr-1 border-t-2 border-x-2 rounded-t transition-colors ${
                  activeTab === "generator"
                    ? "bg-cream-100 border-cream-900 text-cream-950 translate-y-[2px]"
                    : "bg-cream-200/50 border-transparent text-cream-900/50 hover:bg-cream-200/80"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-700 font-bold" /> Automated Columnist
                </span>
              </button>
              <button
                onClick={() => setActiveTab("manager")}
                className={`px-6 py-2.5 font-serif font-bold text-base border-t-2 border-x-2 rounded-t transition-colors ${
                  activeTab === "manager"
                    ? "bg-cream-100 border-cream-900 text-cream-950 translate-y-[2px]"
                    : "bg-cream-200/50 border-transparent text-cream-900/50 hover:bg-cream-200/80"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-sky-800" /> Active Archives ({articles.length})
                </span>
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-cream-100 border-x border-b border-cream-900/20 p-6 sm:p-8 rounded-b-md shadow-inner">
              
              {/* TAB 1: AUTOMATED GENERATOR */}
              {activeTab === "generator" && (
                <div className="space-y-6">
                  <div className="max-w-2xl">
                    <h3 className="font-serif font-bold text-xl text-cream-950 mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" /> Deploy Automated Japanese Learning Article
                    </h3>
                    <p className="text-sm font-serif text-cream-900/60 leading-relaxed mb-6">
                      Trigger our server-side curriculum generator. It automatically structures a pedagogical Japanese lesson matching the target level, frames post-it notes with spoken pronunciation vectors, crafts interactive quizzes, and etches a thematic newsprint illustration.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs uppercase tracking-wide font-bold text-cream-900">
                        Target Lesson Level
                      </label>
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(parseInt(e.target.value, 10))}
                        className="w-full bg-white border border-cream-900/30 px-3 py-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-cream-900"
                      >
                        <option value={1}>Level 1: Absolute Beginner (Morning)</option>
                        <option value={2}>Level 2: Basic Words (Late-Morning)</option>
                        <option value={3}>Level 3: Intermediate Sentences (Afternoon)</option>
                        <option value={4}>Level 4: Upper-Intermediate Grammar (Evening)</option>
                        <option value={5}>Level 5: Advanced Aesthetics (Night)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-xs uppercase tracking-wide font-bold text-cream-900">
                        TIMELINE UPDATE SLUR
                      </label>
                      <select
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full bg-white border border-cream-900/30 px-3 py-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-cream-900"
                      >
                        <option value="Morning">Morning Edition (☀️)</option>
                        <option value="Late-Morning">Late-Morning Edition (🍜)</option>
                        <option value="Afternoon">Afternoon Edition (⛩️)</option>
                        <option value="Evening">Evening Edition (☔)</option>
                        <option value="Night">Night Edition (🌙)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-xs uppercase tracking-wide font-bold text-cream-900">
                        Custom topic (OPTIONAL hint)
                      </label>
                      <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g., ordering coffee, business bow, tea-ceremony"
                        className="w-full bg-white border border-cream-900/30 px-3 py-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-cream-900"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-cream-900/10">
                    {isGenerating ? (
                      <div className="space-y-4 max-w-md bg-white border-2 border-cream-900 p-6 rounded shadow-lg text-center mx-auto animate-pulse">
                        <RefreshCcw className="w-8 h-8 text-amber-700 animate-spin mx-auto" />
                        <h4 className="font-serif font-bold text-lg text-cream-950">
                          Engraving Daily Issue
                        </h4>
                        <p className="font-mono text-xs text-cream-900/60 leading-relaxed font-semibold italic">
                          {generationSteps}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleAiAutoGeneration}
                        id="btn-ai-generate"
                        className="px-6 py-3 bg-cream-900 text-cream-50 font-serif font-extrabold text-sm hover:bg-cream-950 transition-transform hover:scale-[1.02] flex items-center gap-2 shadow-md"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" /> Publish Automated Issue
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ARTICLE ARCHIVE MANAGER */}
              {activeTab === "manager" && (
                <div className="space-y-4">
                  <div className="border-b border-cream-900/10 pb-3 mb-4 flex justify-between items-center">
                    <h3 className="font-serif font-bold text-lg text-cream-950">
                      Active Archives Dashboard
                    </h3>
                    <span className="font-mono text-xs text-cream-900/60 font-semibold uppercase">
                      Printers state: Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {articles.map((art) => (
                      <div
                        key={art.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-cream-900/20 rounded shadow-xs hover:border-cream-900 transition-colors gap-4"
                      >
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                              Level {art.level}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                              {art.timeOfDay} update
                            </span>
                            {art.isVerified ? (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Checked
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/50 text-amber-800">
                                Unchecked Draft
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif font-bold text-base text-cream-950 leading-snug">
                            {art.title}
                          </h4>
                          <p className="font-serif text-xs text-cream-900/50 italic">
                            Byline: {art.byline} • Published update slot: {art.publishedAt}
                          </p>
                        </div>

                        {/* CMS Operators Buttons */}
                        <div className="flex flex-wrap gap-2 items-center sm:self-center">
                          <button
                            onClick={() => handleAiProofreadCheck(art)}
                            title="Perform Proofread Check for Typos"
                            className="p-2 border border-emerald-900/20 text-emerald-800 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1.5 font-sans font-bold text-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Verify Draft (検品)
                          </button>
                          
                          <button
                            onClick={() => setEditingArticle(art)}
                            title="Edit Article Content"
                            className="p-2 border border-blue-900/20 text-blue-800 rounded hover:bg-blue-50 transition-colors flex items-center gap-1.5 font-sans font-bold text-xs"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Details
                          </button>

                          <button
                            onClick={() => handleDeleteArticle(art.id, art.title)}
                            title="Archive Delete Content"
                            className="p-2 border border-rose-900/20 text-rose-800 rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MANUALLY EDIT MODAL (Rich Inline Editor) */}
      <AnimatePresence>
        {editingArticle && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-cream-50 max-w-4xl w-full border-4 border-cream-900 rounded-lg p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto font-sans"
            >
              <button
                onClick={() => setEditingArticle(null)}
                className="absolute top-4 right-4 text-cream-900 hover:opacity-75"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center border-b-2 border-cream-900 pb-4 mb-6">
                <span className="font-mono text-xs tracking-widest text-[#100f0d]/50 uppercase block">
                  MANUAL INK ROOM
                </span>
                <h2 className="font-serif text-2xl font-extrabold text-cream-950">
                  Editing: {editingArticle.title}
                </h2>
              </div>

              <form onSubmit={saveManualEditChanges} className="space-y-6">
                
                {/* Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Article ID / URL Slug
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingArticle.id}
                      className="w-full bg-cream-100 border border-cream-900/20 px-3 py-1.5 text-xs rounded opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Newspaper Header Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editingArticle.title}
                      onChange={(e) => handleArticleFieldChange("title", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 px-3 py-1.5 text-xs rounded focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Subtitle / Deck
                    </label>
                    <input
                      type="text"
                      value={editingArticle.subtitle || ""}
                      onChange={(e) => handleArticleFieldChange("subtitle", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 px-3 py-1.5 text-xs rounded focus:outline-none"
                    />
                  </div>
                </div>

                {/* Subheadings and Column pieces */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Byline
                    </label>
                    <input
                      type="text"
                      value={editingArticle.byline}
                      onChange={(e) => handleArticleFieldChange("byline", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 px-3 py-1.5 text-xs rounded focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Meta Description (SEO)
                    </label>
                    <input
                      type="text"
                      value={editingArticle.description}
                      onChange={(e) => handleArticleFieldChange("description", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 px-3 py-1.5 text-xs rounded focus:outline-none"
                    />
                  </div>
                </div>

                {/* Main Text areas */}
                <div className="space-y-4 pt-2 border-t border-cream-900/10">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Introduction (First Newspaper column)
                    </label>
                    <textarea
                      rows={3}
                      value={editingArticle.introduction}
                      onChange={(e) => handleArticleFieldChange("introduction", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 p-3 text-xs rounded font-serif focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                      Grammar Explanatory Prose
                    </label>
                    <textarea
                      rows={3}
                      value={editingArticle.grammarExplanation}
                      onChange={(e) => handleArticleFieldChange("grammarExplanation", e.target.value)}
                      className="w-full bg-white border border-cream-900/20 p-3 text-xs rounded font-serif focus:outline-none leading-relaxed"
                    />
                  </div>

                  {editingArticle.culturalInsight && (
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase font-bold text-cream-900/60 block">
                        Cultural Editorial Segment (Cultural Sidebar)
                      </label>
                      <textarea
                        rows={3}
                        value={editingArticle.culturalInsight}
                        onChange={(e) => handleArticleFieldChange("culturalInsight", e.target.value)}
                        className="w-full bg-white border border-cream-900/20 p-3 text-xs rounded font-serif focus:outline-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Vocabulary Cards (Post-it notes data edit) */}
                <div className="space-y-4 pt-4 border-t border-cream-900/10">
                  <h4 className="font-serif font-bold text-sm text-cream-950 uppercase tracking-wider">
                    Post-it Vocabulary Sheets (📌)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {editingArticle.postIts.map((p, pIdx) => (
                      <div key={p.id} className="p-4 border border-cream-900/20 bg-cream-100 rounded space-y-3 relative">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-cream-900 text-cream-50 rounded uppercase font-bold self-start inline-block">
                          Card #{pIdx + 1} ({p.color})
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Japanese Kan/Kana</label>
                            <input
                              type="text"
                              value={p.japanese}
                              onChange={(e) => handlePostItFieldChange(pIdx, "japanese", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Hiragana/Katakana</label>
                            <input
                              type="text"
                              value={p.kana}
                              onChange={(e) => handlePostItFieldChange(pIdx, "kana", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Romaji Phonology</label>
                            <input
                              type="text"
                              value={p.romaji}
                              onChange={(e) => handlePostItFieldChange(pIdx, "romaji", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">English Definition</label>
                            <input
                              type="text"
                              value={p.english}
                              onChange={(e) => handlePostItFieldChange(pIdx, "english", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Detailed Explanation</label>
                          <textarea
                            rows={2}
                            value={p.explanation}
                            onChange={(e) => handlePostItFieldChange(pIdx, "explanation", e.target.value)}
                            className="w-full bg-white border border-cream-900/10 p-2 text-xs rounded focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Japanese Example</label>
                            <input
                              type="text"
                              value={p.exampleJp}
                              onChange={(e) => handlePostItFieldChange(pIdx, "exampleJp", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none font-serif"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-mono text-[8px] uppercase font-bold block text-cream-900/60">Example English Translation</label>
                            <input
                              type="text"
                              value={p.exampleEn}
                              onChange={(e) => handlePostItFieldChange(pIdx, "exampleEn", e.target.value)}
                              className="w-full bg-white border border-cream-900/10 px-2 py-1 text-xs rounded focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit Action buttons */}
                <div className="mt-8 pt-4 border-t-2 border-cream-900 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingArticle(null)}
                    className="px-5 py-2 border border-cream-900/45 text-cream-900 font-serif font-bold text-sm"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    id="btn-manual-save"
                    className="px-6 py-2 bg-cream-900 text-cream-50 font-serif font-bold text-sm tracking-wide shadow transition-transform hover:scale-102 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save & Publish
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
