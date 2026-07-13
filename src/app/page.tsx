"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/store";
import { MainLayout } from "@/components/layout/MainLayout";
import { WelcomeModal } from "@/components/WelcomeModal";

// ============================================================
// DraftMind 首页 - 水合守卫 + 主题应用 + 主布局
// ============================================================

/**
 * ThemeProvider — 根据 Store 中的 theme 设置，将 dark class 应用到 <html>。
 * 支持 light / dark / system 三种模式。
 */
function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: "light" | "dark") => {
      if (mode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) =>
        applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

/**
 * StoreHydrationGuard — 等待 Zustand persist 从 LocalStorage 恢复数据后再渲染子组件。
 * 避免 SSR/CSR 之间的内容闪烁和不一致。
 */
function StoreHydrationGuard({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubFinishHydration =
      useStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });

    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-300" />
          <span className="text-sm text-zinc-400 dark:text-zinc-500">加载中...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HomePage — 首页
 * StoreHydrationGuard → ThemeProvider → WelcomeModal Check → MainLayout
 */
export default function HomePage() {
  const [showWelcome, setShowWelcome] = useState(false);
  
  // 检查是否已有 API Key
  useEffect(() => {
    const checkApiKey = () => {
      // 等待状态水合完成
      if (useStore.persist.hasHydrated()) {
        const state = useStore.getState();
        const hasAnyApiKey = state.userSettings.providers.openrouter.apiKey ||
                            state.userSettings.providers.aihubmix.apiKey ||
                            state.userSettings.providers.openai.apiKey;
                            
        // 只有当所有 API Key 都为空时才显示欢迎模态框
        if (!hasAnyApiKey) {
          setShowWelcome(true);
        }
      } else {
        // 如果还没有水合完成，订阅水合完成事件
        const unsubFinishHydration = useStore.persist.onFinishHydration(() => {
          const state = useStore.getState();
          const hasAnyApiKey = state.userSettings.providers.openrouter.apiKey ||
                              state.userSettings.providers.aihubmix.apiKey ||
                              state.userSettings.providers.openai.apiKey;
                              
          // 只有当所有 API Key 都为空时才显示欢迎模态框
          if (!hasAnyApiKey) {
            setShowWelcome(true);
          }
        });
        
        return () => unsubFinishHydration();
      }
    };
    
    checkApiKey();
  }, []);

  return (
    <StoreHydrationGuard>
      <ThemeProvider>
        <div className="relative">
          <MainLayout />
          <WelcomeModal
            isOpen={showWelcome}
            onClose={() => setShowWelcome(false)}
          />
        </div>
      </ThemeProvider>
    </StoreHydrationGuard>
  );
}
