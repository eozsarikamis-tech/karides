import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Send,
  MessageSquare,
  BarChart3,
  Fish,
  Loader2,
} from 'lucide-react';
import { BatchPurchase, Tank, Sale, BreedingSpawn, Expense } from '../../types';
import { useSpeciesList } from '../../utils/speciesStorage';
import {
  buildBusinessAiSnapshot,
  BusinessAiAnalysisResult,
} from '../../utils/businessAiSnapshot';

interface BusinessAiAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  batches: BatchPurchase[];
  tanks: Tank[];
  sales: Sale[];
  breedings: BreedingSpawn[];
  expenses: Expense[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  'İşletmemin genel gidişatını özetle, en kârlı alanım hangisi?',
  'Ölüm ve kayıpları azaltmak için hangi adımları atmalıyım?',
  'Kargo ve paketleme maliyetlerim kârlılığımı nasıl etkiliyor?',
  'Stok ve akvaryum parametrelerimde acil dikkat etmem gereken ne var?',
];

export const BusinessAiAnalystModal: React.FC<BusinessAiAnalystModalProps> = ({
  isOpen,
  onClose,
  businessName,
  batches,
  tanks,
  sales,
  breedings,
  expenses,
}) => {
  const speciesList = useSpeciesList();
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');
  const [analysis, setAnalysis] = useState<BusinessAiAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getSnapshot = () =>
    buildBusinessAiSnapshot({
      businessName,
      batches,
      tanks,
      sales,
      breedings,
      expenses,
      speciesList,
    });

  const runAnalysis = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/ai/business-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze',
          businessSnapshot: getSnapshot(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Analiz alınamadı.');
      }
      setAnalysis(data.analysis as BusinessAiAnalysisResult);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'AI analizi sırasında bir hata oluştu.'
      );
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis && !isLoadingAnalysis && !analysisError) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setChatMessages([]);
    setChatError(null);
  }, [businessName]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const handleSendQuestion = async (questionText?: string) => {
    const q = (questionText ?? chatInput).trim();
    if (!q || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text: q,
    };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    if (!questionText) setChatInput('');
    setIsSendingChat(true);
    setChatError(null);

    try {
      const response = await fetch('/api/ai/business-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          businessSnapshot: getSnapshot(),
          question: q,
          history: chatMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Yanıt alınamadı.');
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-a`,
          role: 'assistant',
          text: data.reply || 'Yanıt oluşturulamadı.',
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'AI yanıtı alınırken hata oluştu.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
    if (score >= 50) return 'text-amber-300 border-amber-500/40 bg-amber-950/30';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('yüksek') || p.includes('yuksek') || p.includes('high')) {
      return 'bg-rose-950/70 text-rose-300 border-rose-700/60';
    }
    if (p.includes('orta') || p.includes('medium')) {
      return 'bg-amber-950/70 text-amber-300 border-amber-700/60';
    }
    return 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-500/40 flex items-center justify-center text-indigo-700 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                  İşletme Verimlilik AI Danışmanı
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-medium">
                  {businessName}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 truncate">
                İşletme Gidişatı & Verimlilik Değerlendirmesi
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isLoadingAnalysis}
              className="inline-flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] px-3 py-2 text-xs font-semibold text-indigo-700 hover:text-slate-900 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-300 rounded-xl transition-colors cursor-pointer"
              title="Güncel verilerle AI analizini yeniden çalıştır"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Analizi Yenile</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-white grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl sm:rounded-lg transition-colors cursor-pointer ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Verimlilik Raporu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl sm:rounded-lg transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">AI&apos;ya Soru Sor</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'report' && (
            <div className="space-y-5">
              {isLoadingAnalysis && (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-500/40 flex items-center justify-center text-indigo-700">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    İşletme verileri analiz ediliyor...
                  </div>
                  <p className="text-xs text-slate-500 max-w-md">
                    Canlı stokları, alım-satım kârlılığı, ölüm oranları, kargo/paketleme dengesi ve akvaryum su parametreleri inceleniyor.
                  </p>
                </div>
              )}

              {!isLoadingAnalysis && analysisError && (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-rose-700 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Analiz Oluşturulamadı</span>
                  </div>
                  <p className="leading-relaxed">{analysisError}</p>
                  <button
                    type="button"
                    onClick={runAnalysis}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tekrar Dene</span>
                  </button>
                </div>
              )}

              {!isLoadingAnalysis && !analysisError && analysis && (
                <>
                  {/* Score & Executive Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(
                        analysis.efficiencyScore
                      )}`}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-85">
                        Verimlilik Puanı
                      </span>
                      <div className="my-2 flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold font-mono tabular-nums">
                          {analysis.efficiencyScore}
                        </span>
                        <span className="text-xs opacity-75 font-mono">/ 100</span>
                      </div>
                      <span className="text-xs font-bold">{analysis.healthStatus}</span>
                    </div>

                    <div className="md:col-span-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        <span>Genel Gidişat Değerlendirmesi</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        {analysis.executiveSummary}
                      </p>
                    </div>
                  </div>

                  {/* Strengths & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Güçlü Yönler</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-800">
                        {analysis.strengths.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-600 font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Dikkat Gerektiren Riskler & Darboğazlar</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-800">
                        {analysis.risksAndBottlenecks.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-amber-600 font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4" />
                      <span>İşletme İçin Somut Öneriler ({analysis.recommendations.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                              {rec.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 font-medium">
                                {rec.impactArea}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase ${getPriorityBadge(
                                  rec.priority
                                )}`}
                              >
                                {rec.priority} öncelik
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{rec.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Species Insights */}
                  {analysis.speciesInsights && analysis.speciesInsights.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
                        <Fish className="w-4 h-4" />
                        <span>Canlı Türleri Bazında Değerlendirme</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {analysis.speciesInsights.map((sp, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="font-bold text-slate-900">{sp.speciesName}</div>
                            <p className="text-slate-700 leading-relaxed">{sp.assessment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[62dvh] sm:h-[52vh] min-h-[340px]">
              {/* Quick Prompts */}
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap shrink-0 pb-1 sm:pb-0">
                {QUICK_PROMPTS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSendingChat}
                    onClick={() => handleSendQuestion(q)}
                    className="px-3 py-2 min-h-[38px] text-[11px] font-medium text-indigo-700 hover:text-slate-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-left whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Conversation Thread */}
              <div className="flex-1 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 space-y-2 py-8">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                    <p className="max-w-md leading-relaxed">
                      İşletmenizin verileri hakkında dilediğiniz soruyu sorabilirsiniz. Yukarıdaki hazır sorulardan birini seçebilir veya kendi sorunuzu yazabilirsiniz.
                    </p>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-3.5 py-2.5 text-xs bg-white border border-slate-200 text-indigo-700 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Veriler inceleniyor...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {chatError}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                className="mt-3 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="İşletmeniz hakkında bir soru sorun..."
                  className="flex-1 min-h-[44px] bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs text-slate-900 placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingChat}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Gönder</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
