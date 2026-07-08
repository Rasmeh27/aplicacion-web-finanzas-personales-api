'use client';

import { Bot } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useWallterStore } from '@/store/slices/wallter.store';
import { WallterChatDrawer } from './WallterChatDrawer';

/**
 * Global floating action button that opens the Wallter chat drawer. Mounted once
 * inside the authenticated app layout (DashboardLayout), so it appears on every
 * authenticated page but not on login/register/onboarding.
 */
export function WallterChatBubble() {
  const isOpen = useWallterStore((s) => s.isOpen);
  const open = useWallterStore((s) => s.open);

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={open}
          aria-label="Abrir Wallter"
          title="Abrir Wallter"
          className={cn(
            'fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition',
            'hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200',
          )}
        >
          <Bot className="h-6 w-6" />
        </button>
      ) : null}
      <WallterChatDrawer />
    </>
  );
}
