'use client';

import { useRef, useEffect } from 'react';
import { getLocalizedName } from '@/lib/utils';
import { getImageUrl } from '@/lib/api';

interface Category {
  id: number;
  name: Record<string, string>;
  icon?: string | null;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: number;
  onSelect: (id: number) => void;
  language: string;
}

// Legacy fallback for categories created before the per-category icon field
// existed. Once admins set their own icon via the menu admin page, that takes
// precedence and this map is unused.
const LEGACY_NAME_ICONS: Record<string, string> = {
  'Hot Drinks': '/category icon/hot drink.png',
  'Burgers': '/category icon/hamburger.png',
  'Pizza': '/category icon/pizza.png',
  'Salads': '/category icon/salads.png',
  'Desserts': '/category icon/cappucino.png',
  'Drinks': '/category icon/cappucino.png',
};

function resolveIcon(icon: string | null | undefined): string {
  // getImageUrl knows how to keep /category icon/ paths relative and route
  // server-uploaded icons through the backend host.
  return icon ? getImageUrl(icon) : '';
}

export function CategoryTabs({ categories, activeCategory, onSelect, language }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeEl = activeRef.current;
      const scrollLeft = activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 px-4 overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {categories.map((category) => {
        const iconPath = resolveIcon(category.icon) || LEGACY_NAME_ICONS[category.name.en] || '';
        const isActive = category.id === activeCategory;

        return (
          <button
            key={category.id}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(category.id)}
            className={`relative flex-shrink-0 flex items-center gap-2 pr-5 pl-1.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap group transition-colors duration-200
    ${isActive ? 'text-white' : ''}`}
            style={isActive
              ? { backgroundColor: 'var(--accent-color, #f97316)', boxShadow: '0 4px 6px -1px color-mix(in srgb, var(--accent-color, #f97316) 30%, transparent)' }
              : { backgroundColor: 'var(--accent-color-light, rgba(249,115,22,0.08))', color: 'var(--accent-color, #f97316)' }
            }
          >
            {/* Icon white circle */}
            <div className="relative z-10 w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
              {iconPath ? (
                <img src={iconPath} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <span className="text-base">🍽️</span>
              )}
            </div>

            <span className="relative z-10 font-bold">
              {getLocalizedName(category.name, language)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
