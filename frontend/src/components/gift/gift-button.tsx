'use client';

import { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { GiftModal } from './gift-modal';

export function GiftButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-xl glass hover:bg-white/10 transition-colors"
      >
        <DotLottieReact src="/gift-animation.lottie" loop autoplay className="h-6 w-6" />
      </button>
      <GiftModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
