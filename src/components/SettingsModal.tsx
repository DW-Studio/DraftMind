"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore, MODEL_PRESETS, DEFAULT_BASE_URLS } from "@/store";
import type { ProviderType } from "@/store";

// ============================================================
// SettingsModal — 多服务商配置面板
// 成熟商业风格，支持 light/dark mode
// 支持：Proxy 和 Official 连接模式切换
// ============================================================

// ---- Provider 显示名称映射 ----
const PROVIDER_LABELS: Record<ProviderType, string> = {
  openrouter: "OpenRouter",
  aihubmix: "AIHubMix",
  openai: "OpenAI 官方",
};

// ---- Provider 选项排序 ----
const PROVIDER_OPTIONS: ProviderType[] = [
  "aihubmix",
  "openrouter",
  "openai",
];

interface SettingsModalProps {
  /** 是否显示模态框 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // ============================================================
  // Store 订阅
  // ============================================================
  const configMode = useStore((s) => s.configMode);
  const setConfigMode = useStore((s) => s.setConfigMode);
  
  // Proxy 配置相关
  const proxyConfig = useStore((s) => s.proxyConfig);
  const updateProxyConfig = useStore((s) => s.updateProxyConfig);
  const activeProvider = useStore((s) => s.userSettings.activeProvider);
  const activeModel = useStore((s) => s.userSettings.activeModel);
  const providers = useStore((s) => s.userSettings.providers);
  const switchProvider = useStore((s) => s.switchProvider);
  const switchModel = useStore((s) => s.switchModel);
  const setProviderKeys = useStore((s) => s.setProviderKeys);
  
  // Official 配置相关
  const officialConfig = useStore((s) => s.officialConfig);
  const updateOfficialConfig = useStore((s) => s.updateOfficialConfig);

  // ============================================================
  // 本地表单状态（与 Store 双向同步）
  // ============================================================
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // 官方配置本地状态
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState("");
  const [moonshotApiKey, setMoonshotApiKey] = useState("");
  const [moonshotBaseUrl, setMoonshotBaseUrl] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showMoonshotKey, setShowMoonshotKey] = useState(false);

  // 当 activeProvider 变化时，同步本地表单
  useEffect(() => {
    const cfg = providers[activeProvider];
    setApiKey(cfg.apiKey);
    setBaseUrl(cfg.baseUrl);
    setShowKey(false);
  }, [activeProvider, providers]);

  // 当 configMode 变化时，同步官方配置本地状态
  useEffect(() => {
    setOpenaiApiKey(officialConfig.openai.apiKey);
    setOpenaiBaseUrl(officialConfig.openai.baseUrl);
    setAnthropicApiKey(officialConfig.anthropic.apiKey);
    setAnthropicBaseUrl(officialConfig.anthropic.baseUrl);
    setMoonshotApiKey(officialConfig.moonshot.apiKey);
    setMoonshotBaseUrl(officialConfig.moonshot.baseUrl);
    setShowOpenaiKey(false);
    setShowAnthropicKey(false);
    setShowMoonshotKey(false);
  }, [officialConfig]);

  // ============================================================
  // 当前 Provider 的模型列表
  // ============================================================
  const currentModels = MODEL_PRESETS[activeProvider] ?? [];
  const currentBaseUrlPlaceholder = DEFAULT_BASE_URLS[activeProvider];

  // ============================================================
  // 事件处理
  // ============================================================

  const handleProviderChange = useCallback(
    (provider: ProviderType) => {
      switchProvider(provider);
    },
    [switchProvider],
  );

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setApiKey(value);
      setProviderKeys(activeProvider, value, baseUrl);
    },
    [activeProvider, baseUrl, setProviderKeys],
  );

  const handleBaseUrlChange = useCallback(
    (value: string) => {
      setBaseUrl(value);
      setProviderKeys(activeProvider, apiKey, value);
    },
    [activeProvider, apiKey, setProviderKeys],
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      switchModel(modelId);
    },
    [switchModel],
  );

  const handleConfigModeChange = useCallback(
    (mode: 'proxy' | 'official') => {
      setConfigMode(mode);
    },
    [setConfigMode]
  );

  const handleProxyProviderChange = useCallback(
    (provider: 'aihubmix' | 'openrouter') => {
      updateProxyConfig({ ...proxyConfig, provider });
    },
    [updateProxyConfig, proxyConfig]
  );

  const handleOpenaiApiKeyChange = useCallback(
    (value: string) => {
      setOpenaiApiKey(value);
      updateOfficialConfig('openai', { apiKey: value, baseUrl: openaiBaseUrl });
    },
    [updateOfficialConfig, openaiBaseUrl]
  );

  const handleOpenaiBaseUrlChange = useCallback(
    (value: string) => {
      setOpenaiBaseUrl(value);
      updateOfficialConfig('openai', { apiKey: openaiApiKey, baseUrl: value });
    },
    [updateOfficialConfig, openaiApiKey]
  );

  const handleAnthropicApiKeyChange = useCallback(
    (value: string) => {
      setAnthropicApiKey(value);
      updateOfficialConfig('anthropic', { apiKey: value, baseUrl: anthropicBaseUrl });
    },
    [updateOfficialConfig, anthropicBaseUrl]
  );

  const handleAnthropicBaseUrlChange = useCallback(
    (value: string) => {
      setAnthropicBaseUrl(value);
      updateOfficialConfig('anthropic', { apiKey: anthropicApiKey, baseUrl: value });
    },
    [updateOfficialConfig, anthropicApiKey]
  );

  const handleMoonshotApiKeyChange = useCallback(
    (value: string) => {
      setMoonshotApiKey(value);
      updateOfficialConfig('moonshot', { apiKey: value, baseUrl: moonshotBaseUrl });
    },
    [updateOfficialConfig, moonshotBaseUrl]
  );

  const handleMoonshotBaseUrlChange = useCallback(
    (value: string) => {
      setMoonshotBaseUrl(value);
      updateOfficialConfig('moonshot', { apiKey: moonshotApiKey, baseUrl: value });
    },
    [updateOfficialConfig, moonshotApiKey]
  );

  const handleSave = useCallback(() => {
    // 更新 proxy 配置
    updateProxyConfig({
      provider: proxyConfig.provider,
      apiKey: apiKey,
      baseUrl: baseUrl
    });

    // Zustand persist 已自动写入 LocalStorage
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  }, [apiKey, baseUrl, proxyConfig.provider, updateProxyConfig, onClose]);

  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ============================================================
  // 未打开时不渲染
  // ============================================================
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // 点击遮罩关闭
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ---- 面板主体 ---- */}
      <div className="w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
        {/* ---- Header ---- */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              设置
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              AI 服务商 & 模型配置
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="关闭设置"
          >
            <CloseIcon />
          </button>
        </header>

        {/* ---- Tab 切换 ---- */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 pt-4">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              configMode === 'proxy'
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
            onClick={() => handleConfigModeChange('proxy')}
          >
            中转站
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              configMode === 'official'
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
            onClick={() => handleConfigModeChange('official')}
          >
            官方直连
          </button>
        </div>

        {/* ---- 表单主体 ---- */}
        <div className="space-y-5 px-6 py-5 max-h-[60vh] overflow-y-auto">
          {configMode === 'proxy' ? (
            // ======== 中转站配置页面 ========
            <>
              {/* ======== Provider 下拉 ======== */}
              <FormField label="服务商">
                <select
                  value={proxyConfig.provider}
                  onChange={(e) =>
                    handleProxyProviderChange(e.target.value as 'aihubmix' | 'openrouter')
                  }
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                    px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                    transition-colors appearance-none
                    bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m2%204%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
                    dark:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m2%204%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
                    bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10"
                >
                  <option value="aihubmix" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">AIHubMix</option>
                  <option value="openrouter" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">OpenRouter</option>
                </select>
              </FormField>

              {/* ======== API Key 输入 ======== */}
              <FormField label="API Key">
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="请输入 API Key…"
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                      px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100
                      placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                      focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                      transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1
                      text-zinc-400 dark:text-zinc-500 transition-colors
                      hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
                    aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showKey ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </FormField>

              {/* ======== Base URL 输入 ======== */}
              <FormField label="Base URL（可选）">
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder={currentBaseUrlPlaceholder}
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                    px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
                    placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                    transition-colors"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  留空则使用官方默认域名
                </p>
              </FormField>

              {/* ======== 固定模型说明 ======== */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">模型选择</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                  中转站模式使用固定模型组合：
                  <br />
                  • 素材收集：{proxyConfig.provider === 'aihubmix' ? 'moonshot-v1-8k' : 'moonshotai/moonshot-v1-8k'}
                  <br />
                  • 初稿润色：{proxyConfig.provider === 'aihubmix' ? 'claude-3-5-sonnet-20241022' : 'anthropic/claude-3.5-sonnet'}
                  <br />
                  • 红队教练：gpt-4o
                </p>
              </div>
            </>
          ) : (
            // ======== 官方直连配置页面 ========
            <div className="space-y-6">
              {/* ======== OpenAI 配置区块 ======== */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">OpenAI 官方配置</h3>
                <div className="space-y-4">
                  <FormField label="API Key">
                    <div className="relative">
                      <input
                        type={showOpenaiKey ? "text" : "password"}
                        value={openaiApiKey}
                        onChange={(e) => handleOpenaiApiKeyChange(e.target.value)}
                        placeholder="请输入 OpenAI API Key…"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                          px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100
                          placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                          transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenaiKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1
                          text-zinc-400 dark:text-zinc-500 transition-colors
                          hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label={showOpenaiKey ? "隐藏 API Key" : "显示 API Key"}
                      >
                        {showOpenaiKey ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Base URL">
                    <input
                      type="text"
                      value={openaiBaseUrl}
                      onChange={(e) => handleOpenaiBaseUrlChange(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                        px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
                        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                        focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                        transition-colors"
                    />
                  </FormField>
                </div>
              </div>

              {/* ======== Anthropic 配置区块 ======== */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Anthropic 官方配置</h3>
                <div className="space-y-4">
                  <FormField label="API Key">
                    <div className="relative">
                      <input
                        type={showAnthropicKey ? "text" : "password"}
                        value={anthropicApiKey}
                        onChange={(e) => handleAnthropicApiKeyChange(e.target.value)}
                        placeholder="请输入 Anthropic API Key…"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                          px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100
                          placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                          transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnthropicKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1
                          text-zinc-400 dark:text-zinc-500 transition-colors
                          hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label={showAnthropicKey ? "隐藏 API Key" : "显示 API Key"}
                      >
                        {showAnthropicKey ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Base URL">
                    <input
                      type="text"
                      value={anthropicBaseUrl}
                      onChange={(e) => handleAnthropicBaseUrlChange(e.target.value)}
                      placeholder="https://api.anthropic.com/v1"
                      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                        px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
                        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                        focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                        transition-colors"
                    />
                  </FormField>
                </div>
              </div>

              {/* ======== Moonshot 配置区块 ======== */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Moonshot 官方配置</h3>
                <div className="space-y-4">
                  <FormField label="API Key">
                    <div className="relative">
                      <input
                        type={showMoonshotKey ? "text" : "password"}
                        value={moonshotApiKey}
                        onChange={(e) => handleMoonshotApiKeyChange(e.target.value)}
                        placeholder="请输入 Moonshot API Key…"
                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                          px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100
                          placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                          transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMoonshotKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1
                          text-zinc-400 dark:text-zinc-500 transition-colors
                          hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label={showMoonshotKey ? "隐藏 API Key" : "显示 API Key"}
                      >
                        {showMoonshotKey ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Base URL">
                    <input
                      type="text"
                      value={moonshotBaseUrl}
                      onChange={(e) => handleMoonshotBaseUrlChange(e.target.value)}
                      placeholder="https://api.moonshot.cn/v1"
                      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                        px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100
                        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                        focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                        transition-colors"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Footer：保存按钮 ---- */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
              saved
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
          >
            {saved ? "已保存" : "保存设置"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============================================================
// 子组件
// ============================================================

/** 表单字段包装器 */
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// ============================================================
// 内联图标组件
// ============================================================

/** 眼睛（显示密码） */
function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/** 眼睛斜线（隐藏密码） */
function EyeOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

/** 关闭 (X) */
function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
