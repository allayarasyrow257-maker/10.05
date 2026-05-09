'use client';

import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cart-store';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'tk', name: 'Türkmen', flag: '🇹🇲' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

interface LanguageSelectorProps {
  onSelect: () => void;
}

export function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const { setLanguage } = useCartStore();

  const handleSelect = (code: string) => {
    setLanguage(code);
    onSelect();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center mb-12"
      >
        <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
          <Globe size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome</h1>
        <p className="text-muted-foreground">Select your language</p>
      </motion.div>

      <div className="space-y-4 w-full max-w-sm">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.code}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(lang.code)}
            className="w-full p-5 glass rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
          >
            <span className="text-3xl">{lang.flag}</span>
            <span className="text-lg font-medium">{lang.name}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
