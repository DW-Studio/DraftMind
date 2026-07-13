"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { StyleMemory } from "@/types/store";

const PRESET_STYLES: StyleMemory[] = [
  {
    id: "style_naval", name: "Naval 认知哲学", isCustom: false,
    systemPrompt: '你的文风极简、克制、充满逻辑张力。喜欢使用短句和断言，摒弃所有多余的过渡词。强调第一性原理、长期主义和复利效应。通过反直觉的洞察打破常规认知。',
    fewShots: ['用头脑赚钱，而不是用时间赚钱。', '如果你很难决定，那答案就是否定的。']
  },
  {
    id: "style_indie_hacker", name: "硬核技术与独立开发", isCustom: false,
    systemPrompt: '你的文风充满极客精神与 Builder 气质。句式短促有力，多用主动语态。逻辑递进采取「痛点 → 底层机制拆解 → 杠杆效应」的模型。拒绝任何无信息熵的废话。',
    fewShots: ['传统的开发模式需要庞大的团队。但有了 AI 辅助编程，代码不再是阻碍，而是零边际成本的杠杆。', '这个工具的核心在于通过纯前端本地存储，彻底砍掉了后端维护成本。']
  },
  {
    id: "style_system_review", name: "系统复盘与原子习惯", isCustom: false,
    systemPrompt: '你的文风极其客观、严谨，像外科医生解剖系统一样解剖学习习惯。注重因果关系和数据反馈。情感温度极低，认为动机是不可靠的，只有环境设计和系统机制才是长效的。',
    fewShots: ['动机是极其不可靠的系统变量，而环境是恒定的。', '降低启动阻力，是养成任何习惯的唯一解。']
  },
  {
    id: "style_wild_nomad", name: "旷野游牧与生活纪实", isCustom: false,
    systemPrompt: '你的文风充满「在路上」的生命力与松弛感。富有极强的画面感和现场感。情感温度中高，真实不做作，善于捕捉微小的环境细节来烘托氛围。',
    fewShots: ['海风把键盘吹得发烫，旁边的冰美式刚融化一半。生活不是在一个固定的工位上死磕，而是在不同的旷野里寻找自己。', '清晨的校园带着一种凌冽的自由感。追求极致的画质往往会让人错过真实的颗粒感。']
  }
];

interface WelcomeModalProps { isOpen: boolean; onClose: () => void; }

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  
  // Proxy 模式字段
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"aihubmix" | "openrouter">("aihubmix");
  const [baseUrl, setBaseUrl] = useState("");
  
  // 配置模式
  const [configMode, setConfigModeLocal] = useState<"proxy" | "official">("proxy");
  
  // Official 模式字段
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiUrl, setOpenaiUrl] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicUrl, setAnthropicUrl] = useState("");
  const [moonshotKey, setMoonshotKey] = useState("");
  const [moonshotUrl, setMoonshotUrl] = useState("");

  const setActiveStyle = useStore((s) => s.setActiveStyle);
  const setProviderKeys = useStore((s) => s.setProviderKeys);
  const updateProxyConfig = useStore((s) => s.updateProxyConfig);
  const updateOfficialConfig = useStore((s) => s.updateOfficialConfig);
  const setConfigMode = useStore((s) => s.setConfigMode);
  const proxyApiKey = useStore((s) => s.proxyConfig.apiKey);
  const isConfigured = !!proxyApiKey;

  if (!isOpen) return null;

  // 已配置 → 显示简洁信息卡片
  if (isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">DraftMind 工作流</h2>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <StepItem n={1} title="素材分析" desc="粘贴素材，AI 做施压测试找出薄弱点，给出加固建议。驱动：Kimi K2.6" />
            <StepItem n={2} title="逻辑框架" desc="基于分析结果，设计读者认知路径和文章结构。驱动：Claude Opus 4" />
            <StepItem n={3} title="段落展开" desc="按选定文风将框架段落展开为完整初稿。驱动：Claude Opus 4" />
            <StepItem n={4} title="红队教练" desc="从素材溯源、简洁性、风格一致性三维度审查。驱动：GPT-5.5" />
          </div>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">API 已配置 · AIHubMix</p>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    if (configMode === "proxy" && !apiKey) return;
    
    if (selectedStyle) setActiveStyle(selectedStyle);
    
    if (configMode === "proxy") {
      const defaultBaseUrl = provider === 'aihubmix' ? 'https://aihubmix.com/v1' : 'https://openrouter.ai/api/v1';
      const finalBaseUrl = baseUrl || defaultBaseUrl;
      setProviderKeys(provider, apiKey, finalBaseUrl);
      updateProxyConfig({ provider, apiKey, baseUrl: finalBaseUrl });
    } else {
      setConfigMode("official");
      if (openaiKey) updateOfficialConfig("openai", { apiKey: openaiKey, baseUrl: openaiUrl });
      if (anthropicKey) updateOfficialConfig("anthropic", { apiKey: anthropicKey, baseUrl: anthropicUrl });
      if (moonshotKey) updateOfficialConfig("moonshot", { apiKey: moonshotKey, baseUrl: moonshotUrl });
    }
    
    onClose();
  };

  const canComplete = configMode === "proxy" ? !!apiKey : !!(openaiKey || anthropicKey || moonshotKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-2xl mx-4 flex flex-col h-[520px]">
        {/* 步骤指示 + 跳过按钮 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex gap-2 flex-1 mr-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-1 flex-1 rounded-full transition-colors ${
                step <= currentStep ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"
              }`} />
            ))}
          </div>
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors whitespace-nowrap">
            跳过配置
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          {/* === Step 1: 介绍 === */}
          {currentStep === 1 && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">欢迎来到 DraftMind</h2>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 bg-zinc-50 dark:bg-zinc-800/50">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">AI 写作工作台</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    这不是一个代替你写作的工具。
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                    通过「素材分析 → 逻辑框架 → 段落展开 → 红队教练」四阶段管道，AI 辅助每一步——但每步输出你都可以编辑修改。你主导，AI 辅助。
                  </p>
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">核心理念</h4>
                    <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                      <li>• AI 不代笔，只做思维教练和审查员</li>
                      <li>• 四阶段管道式写作，每步可以人工介入编辑</li>
                      <li>• 从素材到终稿，过程完全由你掌控</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button onClick={() => setCurrentStep(2)} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">下一步</button>
              </div>
            </div>
          )}

          {/* === Step 2: 选风格 === */}
          {currentStep === 2 && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">选择预设文风</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">后续可在设置中随时修改或自定义。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRESET_STYLES.map((style) => (
                    <div key={style.id} onClick={() => setSelectedStyle(style.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedStyle === style.id
                          ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/10"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}>
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center justify-between">
                        {style.name}
                        {selectedStyle === style.id && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">{style.systemPrompt}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">示例: {style.fewShots[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
                <button onClick={() => setCurrentStep(1)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">上一步</button>
                <button onClick={() => selectedStyle && setCurrentStep(3)} disabled={!selectedStyle}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedStyle ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  }`}>下一步</button>
              </div>
            </div>
          )}

          {/* === Step 3: 配置 API === */}
          {currentStep === 3 && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">配置 AI 服务</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">选择连接方式并填入 API Key。</p>

                {/* Tab：中转站 / 官方直连 */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-5">
                  {["proxy", "official"].map((mode) => (
                    <button key={mode} onClick={() => setConfigModeLocal(mode as "proxy" | "official")}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        configMode === mode
                          ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}>
                      {mode === "proxy" ? "中转站" : "官方直连"}
                    </button>
                  ))}
                </div>

                {/* === 中转站模式 === */}
                {configMode === "proxy" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <TabBtn active={provider === "aihubmix"} onClick={() => setProvider("aihubmix")}>AIHubMix</TabBtn>
                      <TabBtn active={provider === "openrouter"} onClick={() => setProvider("openrouter")}>OpenRouter</TabBtn>
                    </div>
                    <Field label="API Key" pw value={apiKey} onChange={setApiKey} placeholder="sk-..." />
                    <Field label="Base URL（可选）" value={baseUrl} onChange={setBaseUrl}
                      placeholder={provider === 'aihubmix' ? 'https://aihubmix.com/v1' : 'https://openrouter.ai/api/v1'} />
                    <p className="text-xs text-zinc-400">留空则使用官方默认地址</p>
                  </div>
                )}

                {/* === 官方直连模式 === */}
                {configMode === "official" && (
                  <div className="space-y-5">
                    <ProviderBlock title="OpenAI" placeholder="https://api.openai.com/v1"
                      keyValue={openaiKey} onKeyChange={setOpenaiKey}
                      urlValue={openaiUrl} onUrlChange={setOpenaiUrl} />
                    <ProviderBlock title="Anthropic" placeholder="https://api.anthropic.com/v1"
                      keyValue={anthropicKey} onKeyChange={setAnthropicKey}
                      urlValue={anthropicUrl} onUrlChange={setAnthropicUrl} />
                    <ProviderBlock title="Moonshot" placeholder="https://api.moonshot.cn/v1"
                      keyValue={moonshotKey} onKeyChange={setMoonshotKey}
                      urlValue={moonshotUrl} onUrlChange={setMoonshotUrl} />
                    <p className="text-xs text-zinc-400">至少填写一个服务商的 API Key 即可开始</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
                <button onClick={() => setCurrentStep(2)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">上一步</button>
                <button onClick={handleComplete} disabled={!canComplete}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    canComplete ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  }`}>完成设置</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- 子组件 ----

function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex-shrink-0 mt-0.5">{n}</span>
      <span><strong className="text-zinc-900 dark:text-zinc-100">{title}</strong> — {desc}</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
        active ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-400"
          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
      }`}>{children}</button>
  );
}

function Field({ label, pw, value, onChange, placeholder }: { label: string; pw?: boolean; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">{label}</label>
      <div className="relative">
        <input type={pw && !show ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors" />
        {pw && (
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label={show ? "隐藏" : "显示"}>
            {show ? <EyeOffSm /> : <EyeSm />}
          </button>
        )}
      </div>
    </div>
  );
}

function ProviderBlock({ title, placeholder, keyValue, onKeyChange, urlValue, onUrlChange }: {
  title: string; placeholder: string;
  keyValue: string; onKeyChange: (v: string) => void;
  urlValue: string; onUrlChange: (v: string) => void;
}) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">{title} 官方配置</h3>
      <div className="space-y-3">
        <Field label="API Key" pw value={keyValue} onChange={onKeyChange} placeholder={`请输入 ${title} API Key…`} />
        <Field label="Base URL" value={urlValue} onChange={onUrlChange} placeholder={placeholder} />
      </div>
    </div>
  );
}

function EyeSm() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function EyeOffSm() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;
}
