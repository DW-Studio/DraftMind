"use client";

import { useState } from "react";
import { ArticleSidebar } from "./ArticleSidebar";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { AIPanel } from "@/components/ai/AIPanel";
import { WelcomeModal } from "@/components/WelcomeModal";

export function MainLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);

  return (
    <div className="flex h-screen min-w-[1024px] overflow-hidden bg-white dark:bg-zinc-900">
      <ArticleSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex w-0 flex-1 min-w-0 min-h-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <MarkdownEditor />
      </div>
      <div className="flex w-2/5 min-w-0 min-h-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
        <AIPanel />
        {/* 工作流指南按钮 - 位于 AI 面板底部 */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={() => setShowWelcomeGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
            title="工作流指南"
          >
            <span>📖</span>
            <span>工作流指南</span>
          </button>
        </div>
      </div>
      
      {/* 欢迎指南模态框 */}
      <WelcomeModal
        isOpen={showWelcomeGuide}
        onClose={() => setShowWelcomeGuide(false)}
      />
    </div>
  );
}
