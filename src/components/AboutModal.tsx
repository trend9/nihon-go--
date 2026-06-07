import { motion } from "motion/react";
import { X, Award, ShieldCheck, Mail } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-100 max-w-2xl w-full border-4 border-cream-900 rounded-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans"
      >
        <button
          onClick={onClose}
          id="btn-close-about"
          className="absolute top-4 right-4 text-cream-900 hover:opacity-75 transition-opacity"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Newspaper Style Header Decoration */}
        <div className="text-center border-b-2 border-cream-900 pb-4 mb-6">
          <span className="font-mono text-xs tracking-widest text-emerald-800 uppercase block mb-1">
            EDITORIAL BOARD CREDENTIALS
          </span>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-cream-900">
            About nihon-go!!
          </h2>
        </div>

        <div className="space-y-6 text-sm text-cream-900/80 leading-relaxed font-serif">
          <p className="indent-4">
            Established in 2026, <strong>nihon-go!!</strong> is a pioneer publication dedicated to bridge the linguistic gap between English speakers and Japanese cultural depth. Headquartered in Tokyo with bureaus in London and New York, our daily digital edition delivers high-fidelity curriculum updates covering Japanese phonology, syntactical frameworks, and practical situational speech.
          </p>

          <div className="border-l-4 border-cream-900 pl-4 py-1 my-4 bg-cream-200/50 italic">
            "Our mission is to democratize high-level Japanese education, rendering beautiful traditional calligraphy, modern business structures, and daily vernacular simple, digestible, and culturally integrated."
          </div>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <Award className="w-5 h-5 text-amber-700" /> Academic Editorial Authority
          </h3>
          <p>
            Every published lesson is monitored and peer-reviewed by our expert editorial board to guarantee the absolute eradication of typographical discrepancies, spelling slips, or character corruptions (mojibake):
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Kenji Sato (Chief Editor, Language Desk)</strong> — Former Professor of Applied Linguistics at Tokyo International University. Under Sato's guidance, our grammatical structures follow rigorous modern pedagogy.
            </li>
            <li>
              <strong>Sarah Jenkins (Senior Developer & Culinary Lead)</strong> — Specialist in everyday colloquial dialogue and culinary terminology, focusing on interactive restaurant communication lessons.
            </li>
            <li>
              <strong>Dr. Hiroshi Watanabe (Senior Scholar of Aesthetics)</strong> — Author of <em>"The Spontaneous Passive: Zen Philosophy in Syntax"</em>, advising on Level 5 traditional aesthetics.
            </li>
          </ul>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <ShieldCheck className="w-5 h-5 text-emerald-700" /> Automated Verification Engine (EEAT)
          </h3>
          <p>
            To support high publishing speed (5 times daily updates), we leverage a proprietary automated verification engine. Every piece of prose is tested client-side and server-side to guarantee correct Hiragana/Katakana readings, accurate Romaji pronunciation paths, and verified translations, fulfilling the absolute highest educational standards.
          </p>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <Mail className="w-5 h-5 text-sky-800" /> Correspondence & Support
          </h3>
          <p>
            For editorial advice, educational inquiries, or technical feedback, please address correspondence to: <strong className="font-mono">editorial-desk@nihon-go.org</strong> or contact our Chief Webmaster.
          </p>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-cream-900 flex justify-end">
          <button
            onClick={onClose}
            id="btn-close-about-footer"
            className="px-6 py-2 bg-cream-900 text-cream-50 hover:bg-cream-950 transition-colors font-serif font-bold text-sm tracking-wide shadow-md"
          >
            Acknowledge & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
