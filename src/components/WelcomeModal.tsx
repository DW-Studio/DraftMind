import { useState } from "react";
import { useStore } from "@/store";
import { StyleMemory } from "@/types/store";

// 预设的 4 个文风
const PRESET_STYLES: StyleMemory[] = [
  {
    id: "style_naval",
    name: "Naval 认知哲学",
    isCustom: false,
    systemPrompt: '你的文风极简、克制、充满逻辑张力。喜欢使用短句和断言，摒弃所有多余的过渡词。强调第一性原理、长期主义和复利效应。通过反直觉的洞察打破常规认知。',
    fewShots: [
      '用头脑赚钱，而不是用时间赚钱。',
      '如果你很难决定，那答案就是否定的。现代社会的丰富性意味着你不需要在勉强的事情上妥协。'
    ]
  },
  {
    id: "style_indie_hacker",
    name: "硬核技术与独立开发",
    isCustom: false,
    systemPrompt: '你的文风充满极客精神与 Builder（建设者）气质。句式短促有力，多用主动语态。逻辑递进采取"痛点 -> 底层机制拆解 -> 杠杆效应"的模型。倾向于使用精准的技术术语，但会用极其通俗的比喻去解释复杂架构。拒绝任何"在当今快速发展的时代"、"众所周知"等毫无信息熵的废话。',
    fewShots: [
      '传统的开发模式需要庞大的团队进行流水线作业。但有了 AI 辅助编程，代码不再是阻碍，而是零边际成本的杠杆。不要去重复造底层的轮子，去定义业务的边界。',
      '这个工具的核心不在于它用了什么高级的框架，而在于它通过纯前端的本地存储，彻底砍掉了后端的维护成本。数据只在用户的浏览器里流转，隐私和速度兼得。'
    ]
  },
  {
    id: "style_system_review",
    name: "系统复盘与原子习惯",
    isCustom: false,
    systemPrompt: '你的文风极其客观、严谨，像外科医生解剖系统一样解剖生活和学习习惯。注重因果关系和数据反馈。多使用对比、列表和步骤拆解。情感温度极低，认为动机是不可靠的，只有环境设计和系统机制才是长效的。',
    fewShots: [
      '动机是极其不可靠的系统变量，而环境是恒定的。每天强迫自己背50个单词依赖的是高耗能的意志力；但修改默认的主页，让浏览器每天自动弹出单词卡片，依赖的是低摩擦的环境设计。',
      '降低启动阻力，是养成任何习惯的唯一解。今天写出的代码极其糟糕，但这不重要。重要的是我把"打开编辑器"这个动作的阻力降到了零。'
    ]
  },
  {
    id: "style_wild_nomad",
    name: "旷野游牧与生活纪实",
    isCustom: false,
    systemPrompt: '你的文风充满"在路上"的生命力与松弛感。句式错落有致，富有极强的画面感和现场感。情感温度中高，真实不做作，展现自由但又不失深度的探索精神。善于捕捉微小的环境细节（如光线、声音、温度）来烘托氛围。',
    fewShots: [
      '海风把键盘吹得发烫，旁边的冰美式刚融化一半。今天没有跑通完美的业务逻辑，但戴上运动相机去追了一场没有计划的落日。生活不是在一个固定的工位上死磕，而是在不同的旷野里寻找自己。',
      '清晨的校园带着一种凌冽的自由感。没有带沉重的设备，只用最基础的镜头记录下了这个瞬间。追求极致的画质往往会让人错过真实的颗粒感。'
    ]
  }
];

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"aihubmix" | "openrouter">("aihubmix");
  const [baseUrl, setBaseUrl] = useState("");
  
  const setActiveStyle = useStore((state) => state.setActiveStyle);
  const setProviderKeys = useStore((state) => state.setProviderKeys);
  const updateProxyConfig = useStore((state) => state.updateProxyConfig);
  const proxyApiKey = useStore((state) => state.proxyConfig.apiKey);
  
  // 是否已配置 API
  const isConfigured = !!proxyApiKey;

  if (!isOpen) return null;

  // 已配置 → 显示简洁信息卡片
  if (isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">DraftMind 工作流</h2>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex-shrink-0 mt-0.5">1</span>
              <span><strong className="text-zinc-900 dark:text-zinc-100">素材分析</strong> — 粘贴素材，AI 做施压测试找出薄弱点，并给出加固建议。驱动模型：Kimi K2.6</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex-shrink-0 mt-0.5">2</span>
              <span><strong className="text-zinc-900 dark:text-zinc-100">逻辑框架</strong> — 基于素材分析结果，设计读者的认知路径。驱动模型：Claude Opus 4</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex-shrink-0 mt-0.5">3</span>
              <span><strong className="text-zinc-900 dark:text-zinc-100">段落展开</strong> — 按选定文风将框架段落展开为初稿。驱动模型：Claude Opus 4</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium flex-shrink-0 mt-0.5">4</span>
              <span><strong className="text-zinc-900 dark:text-zinc-100">红队教练</strong> — 从素材溯源、简洁性、风格一致性三维度审查。驱动模型：GPT-5.5</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">API 已配置 · AIHubMix</p>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    );
  }

  const handleStartTraining = () => {
    if (!apiKey) return;
    
    // 设置选中的文风
    if (selectedStyle) {
      setActiveStyle(selectedStyle);
    }
    
    // 设置 API 密钥（同时更新 userSettings.providers 和 proxyConfig）
    const defaultBaseUrl = provider === 'aihubmix' ? 'https://aihubmix.com/v1' : 'https://openrouter.ai/api/v1';
    const finalBaseUrl = baseUrl || defaultBaseUrl;
    setProviderKeys(provider, apiKey, finalBaseUrl);
    updateProxyConfig({ provider, apiKey, baseUrl: finalBaseUrl });
    
    // 关闭模态框
    onClose();
  };

  const renderStep1 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">欢迎来到 DraftMind</h2>
        <div className="space-y-4">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">写作教练系统</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              这不是一个代替你写作的 AI 工具。
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
              这是一个通过「1. 素材提炼 &rarr; 2. 自主初稿 &rarr; 3. 教练挑错」三步走，帮助你固化个人文风的写作辅助系统。
            </p>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">核心理念</h4>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                <li>&bull; AI 不代笔，只做思维教练和审查员</li>
                <li>&bull; 三步法固化文风肌肉记忆，形成稳定的输出质量</li>
                <li>&bull; 从素材到初稿到最终打磨，过程完全由你掌控</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          下一步
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">选择预设文风</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">这些是预设的文风模板，你可以在后续设置中随时修改或自定义。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_STYLES.map((style) => (
            <div
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedStyle === style.id
                  ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/10"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center justify-between">
                {style.name}
                {selectedStyle === style.id && (
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">{style.systemPrompt}</p>
              <div className="text-xs text-zinc-500 dark:text-zinc-500">
                <p className="truncate">示例: {style.fewShots[0]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => selectedStyle && setCurrentStep(3)}
          disabled={!selectedStyle}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selectedStyle
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
          }`}
        >
          下一步
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">配置大模型服务</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">输入你的 API 密钥，即可开始使用。支持通过中转站调用模型。</p>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">中转站服务商</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProvider("aihubmix")}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
                  provider === "aihubmix"
                    ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-400"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                AIHubMix
              </button>
              <button
                type="button"
                onClick={() => setProvider("openrouter")}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
                  provider === "openrouter"
                    ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-400"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                OpenRouter
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="api-key" className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                transition-colors"
            />
          </div>
          
          <div>
            <label htmlFor="base-url" className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Base URL (可选)
            </label>
            <input
              id="base-url"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={provider === 'aihubmix' ? 'https://aihubmix.com/v1' : 'https://openrouter.ai/api/v1'}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                transition-colors"
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              如果不填写，将使用官方默认地址。
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={handleStartTraining}
          disabled={!apiKey}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            apiKey
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
          }`}
        >
          完成设置
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-2xl mx-4 flex flex-col h-[500px]">
        {/* Header Indicator */}
        <div className="flex px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex gap-2 w-full">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
}