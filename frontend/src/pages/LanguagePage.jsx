import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/StateContext';
import { changeGoogleLanguage, getSelectedLanguageFromCookie } from '../utils/googleTranslate';
import { Check } from 'lucide-react';

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', label: 'English' },
  { code: 'hi', name: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'sat', name: 'Santali', label: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)' },
  { code: 'te', name: 'Telugu', label: 'Telugu (తెలుగు)' },
  { code: 'mr', name: 'Marathi', label: 'Marathi (मराठी)' },
  { code: 'ta', name: 'Tamil', label: 'Tamil (தமிழ்)' },
  { code: 'ur', name: 'Urdu', label: 'Urdu (اردو)' },
  { code: 'gu', name: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'or', name: 'Odia', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'ml', name: 'Malayalam', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'as', name: 'Assamese', label: 'Assamese (অসমীয়া)' },
  { code: 'mai', name: 'Maithili', label: 'Maithili (मैथिली)' },
  { code: 'ho', name: 'Ho', label: 'Ho (ᱦᱳ)' },
  { code: 'unr', name: 'Mundari', label: 'Mundari (ᱢᱩᱱᱰᱟᱨᱤ)' },
  { code: 'kru', name: 'Kurukh', label: 'Kurukh (कुड़ुख़)' },
  { code: 'kht', name: 'Khortha', label: 'Khortha (खोरठा)' },
  { code: 'sck', name: 'Nagpuri', label: 'Nagpuri (नागपुरी)' },
  { code: 'ks', name: 'Kashmiri', label: 'Kashmiri (کٲشُر)' },
  { code: 'ne', name: 'Nepali', label: 'Nepali (नेपाली)' },
  { code: 'sd', name: 'Sindhi', label: 'Sindhi (سنڌي)' },
  { code: 'kok', name: 'Konkani', label: 'Konkani (कोंकणी)' },
  { code: 'doi', name: 'Dogri', label: 'Dogri (डोगरी)' },
  { code: 'mni', name: 'Manipuri', label: 'Manipuri (ꯃꯩꯇꯩ)' },
  { code: 'brx', name: 'Bodo', label: 'Bodo (बर’)' },
  { code: 'sa', name: 'Sanskrit', label: 'Sanskrit (संस्कृतम्)' }
];

export default function LanguagePage() {
  const navigate = useNavigate();
  const { lang, setLang } = useAppState() || {};
  const [selectedCode, setSelectedCode] = useState(() => {
    return getSelectedLanguageFromCookie() || lang || 'en';
  });

  // Ensure Google Translate completely ignores the language selection page
  useEffect(() => {
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');

    return () => {
      document.documentElement.removeAttribute('translate');
      document.documentElement.classList.remove('notranslate');
    };
  }, []);

  const handleSelectLanguage = (code) => {
    setSelectedCode(code);
  };

  const handleContinue = () => {
    if (setLang) setLang(selectedCode);
    changeGoogleLanguage(selectedCode);
    navigate('/');
  };

  const selectedLangObj = INDIAN_LANGUAGES.find((l) => l.code === selectedCode) || INDIAN_LANGUAGES[0];

  return (
    <div 
      className="min-h-screen w-full bg-white text-slate-900 flex flex-col relative selection:bg-emerald-600 selection:text-white notranslate"
      translate="no"
    >
      {/* Background White Square Grid Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-16 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0e4d61] tracking-tight">
          Select Language
        </h1>
      </section>

      {/* Main Buttons List: Full-screen Horizontal Grid in Desktop, Vertical in Mobile */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-2 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5 max-w-sm sm:max-w-none mx-auto">
          {INDIAN_LANGUAGES.map((item) => {
            const isSelected = selectedCode === item.code;

            return (
              <button
                key={item.code}
                onClick={() => handleSelectLanguage(item.code)}
                className={`w-full py-3 px-5 rounded-full border transition-all duration-150 flex items-center justify-between text-sm font-semibold cursor-pointer select-none ${
                  isSelected
                    ? 'bg-white border-emerald-600 shadow-md text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-md hover:text-slate-900 active:scale-[0.99]'
                }`}
              >
                <span className="flex-1 text-center font-medium truncate">
                  {item.label}
                </span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center -mr-1 flex-shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Floating Sticky Bottom Bar for Continue */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-xs text-slate-500 font-medium mr-1.5">
              Selected:
            </span>
            <span className="text-sm font-bold text-slate-900">
              {selectedLangObj.label}
            </span>
          </div>

          <button
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer"
          >
            Continue with {selectedLangObj.name}
          </button>
        </div>
      </footer>
    </div>
  );
}
