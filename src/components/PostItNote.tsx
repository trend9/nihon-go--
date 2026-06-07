import React, { MouseEvent } from "react";
import { motion } from "motion/react";
import { Volume2, Lightbulb, GraduationCap } from "lucide-react";
import { PostItData } from "../types";

interface PostItNoteProps {
  data: PostItData;
  index: number;
  key?: any;
}

export function PostItNote({ data, index }: PostItNoteProps): any {
  // Determine vintage styled colors & bold borders
  const colorSchemes = {
    yellow: "bg-[#fffdf0] hover:bg-[#fff9d0] border-2 border-black text-[#1a1a1a]",
    blue: "bg-[#f5faff] hover:bg-[#e0f0ff] border-2 border-black text-[#1a1a1a]",
    pink: "bg-[#fff4f6] hover:bg-[#ffe4e8] border-2 border-black text-[#1a1a1a]",
    green: "bg-[#f4fdf8] hover:bg-[#defdec] border-2 border-black text-[#1a1a1a]",
  };

  const selectedColor = colorSchemes[data.color] || colorSchemes.yellow;

  // Alternate tilts organically
  const tilts = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2"];
  const tiltClass = tilts[index % tilts.length];

  const handleSpeak = (e: MouseEvent) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.japanese);
      utterance.lang = "ja-JP";
      utterance.rate = 0.8; // friendly pacing for beginners
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSpeakExample = (e: MouseEvent) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.exampleJp);
      utterance.lang = "ja-JP";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: index % 2 === 0 ? -1 : 1 }}
      animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -1.5 : 1 }}
      whileHover={{ y: -4, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      id={`postit-${data.id}`}
      className={`relative p-6 sm:p-8 rounded-none shadow-[4px_4px_0px_#111] ${selectedColor} ${tiltClass} transition-shadow duration-300`}
    >
      {/* Decorative handcrafted pin */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 select-none">
        <svg
          width="32"
          height="32"
          viewBox="0 0 100 100"
          className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
        >
          {/* Black outline thumbtack style */}
          <line x1="50" y1="50" x2="35" y2="90" stroke="black" strokeWidth="10" strokeLinecap="round" />
          <circle cx="50" cy="40" r="28" fill="#e11d48" stroke="black" strokeWidth="6" />
          <circle cx="42" cy="32" r="8" fill="white" opacity="0.6" />
        </svg>
      </div>

      <div className="space-y-4">
        {/* Post-it Header */}
        <div className="flex justify-between items-start border-b border-black/10 pb-2">
          <span className="font-mono text-xs uppercase tracking-wider font-bold opacity-80 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-red-600" />
            {data.title}
          </span>
          <button
            onClick={handleSpeak}
            title="Listen Pronunciation"
            className="p-1 rounded-none border border-black bg-white hover:bg-gray-100 transition-transform flex items-center justify-center text-black"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Japanese Big Text */}
        <div className="text-center py-2">
          <h4 className="font-serif font-black text-4xl sm:text-5xl tracking-normal text-black mb-1 selection:bg-rose-200">
            {data.japanese}
          </h4>
          <span className="font-sans text-sm font-bold tracking-wide block text-gray-700">
            {data.kana} ({data.romaji})
          </span>
        </div>

        {/* Translation Card */}
        <div className="space-y-2">
          <div className="flex gap-1.5 items-baseline">
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-none bg-black/10 select-none">
              ENG
            </span>
            <span className="font-sans font-bold text-base text-black">
              {data.english}
            </span>
          </div>

          <p className="font-serif text-xs text-gray-800 leading-relaxed bg-white/50 p-2.5 rounded-none border border-black/10">
            {data.explanation}
          </p>
        </div>

        {/* Example Sentence Container */}
        {data.exampleJp && (
          <div className="pt-2 border-t border-black/10 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none">
                EXAMPLE SENTENCE
              </span>
              <button
                onClick={handleSpeakExample}
                title="Pronounce Example"
                className="p-1 rounded-none border border-black bg-white hover:bg-gray-150 text-black text-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-serif font-bold text-sm text-black leading-relaxed tracking-wide">
              {data.exampleJp}
            </p>
            <p className="font-serif text-[11px] text-gray-750 italic leading-relaxed">
              {data.exampleEn}
            </p>
          </div>
        )}

        {/* Tips footer */}
        {data.tip && (
          <div className="flex gap-1.5 items-start mt-2 text-[10px] text-red-900 font-sans border-t border-black/10 pt-2">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-700" />
            <span className="font-bold italic">{data.tip}</span>
          </div>
        )}
      </div>
    </motion.div>
  ) as any;
}
