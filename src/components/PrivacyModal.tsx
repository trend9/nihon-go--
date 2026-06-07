import { motion } from "motion/react";
import { X, Shield, Lock, Eye } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
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
          id="btn-close-privacy"
          className="absolute top-4 right-4 text-cream-900 hover:opacity-75 transition-opacity"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Newspaper Style Header Decoration */}
        <div className="text-center border-b-2 border-cream-900 pb-4 mb-6">
          <span className="font-mono text-xs tracking-widest text-emerald-800 uppercase block mb-1">
            LEGAL & REGULATORY DESK
          </span>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-cream-900">
            Privacy Policy & Disclosures
          </h2>
        </div>

        <div className="space-y-6 text-sm text-cream-900/80 leading-relaxed font-serif">
          <p className="indent-4">
            At <strong>nihon-go!!</strong>, accessible from our live domain, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by nihon-go!! and how we use it. We adhere strictly to general data privacy regulations (GDPR, CCPA) and are optimized for standard Google AdSense publisher validation.
          </p>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <Lock className="w-5 h-5 text-indigo-700" /> 1. Log Files & Data Preservation
          </h3>
          <p>
            nihon-go!! follows a standard procedure of using log files. These files log visitors when they visit websites. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
          </p>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <Eye className="w-5 h-5 text-amber-700" /> 2. Cookies & DoubleClick DART Cookies
          </h3>
          <p>
            Like any other website, nihon-go!! uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
          </p>
          <p>
            Google is one of our potential third-party vendors. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to our site and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy.
          </p>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            <Shield className="w-5 h-5 text-emerald-700" /> 3. Advertising Partners Privacy Policies
          </h3>
          <p>
            You may consult this list to find the Privacy Policy for each of the advertising partners of nihon-go!!.
          </p>
          <p>
            Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on nihon-go!!, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
          </p>
          <p className="border-l-4 border-amber-700 pl-4 py-1 italic hover:bg-cream-200/20 transition-colors">
            Note that nihon-go!! has no access to or control over these cookies that are used by third-party advertisers.
          </p>

          <h3 className="font-serif font-bold text-lg text-cream-900 flex items-center gap-2 border-b border-cream-900/10 pb-1 mt-6">
            4. Consent & Educational Data Protection
          </h3>
          <p>
            By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions. We do not store any personal study transcripts on our servers without your explicit permission, preserving student-client confidentiality in conformity with strict academic ethics.
          </p>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-cream-900 flex justify-end">
          <button
            onClick={onClose}
            id="btn-close-privacy-footer"
            className="px-6 py-2 bg-cream-900 text-cream-50 hover:bg-cream-950 transition-colors font-serif font-bold text-sm tracking-wide shadow-md"
          >
            Acknowledge Privacy Terms
          </button>
        </div>
      </motion.div>
    </div>
  );
}
