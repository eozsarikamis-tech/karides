import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV === 'development';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getFriendlyGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();

  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('api key')) {
    return {
      status: 403,
      message: 'Gemini API anahtarı geçersiz veya eksik. Lütfen Settings > Secrets panelinden GEMINI_API_KEY ayarını kontrol edin.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'AI istek kotası geçici olarak doldu. Lütfen kısa bir süre sonra tekrar deneyin.',
    };
  }
  return {
    status: 500,
    message: 'AI analizi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
  };
}

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    efficiencyScore: {
      type: Type.INTEGER,
      description: 'İşletmenin 0 ile 100 arasında genel verimlilik ve sağlık puanı.',
    },
    healthStatus: {
      type: Type.STRING,
      description: 'Kısa durum etiketi: Mükemmel, İyi / Gelişime Açık, Dikkat Gerektiren veya Kritik.',
    },
    executiveSummary: {
      type: Type.STRING,
      description: 'İşletmenin mevcut gidişatı, kârlılığı ve operasyonel durumu hakkında 2-4 cümlelik net yönetici özeti.',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'İşletmenin öne çıkan güçlü yönleri ve verimli çalışan alanları (3-5 madde).',
    },
    risksAndBottlenecks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tespit edilen kârlılık açıkları, ölüm/kayıp riskleri, stok veya akvaryum parametre sorunları (2-5 madde).',
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Kısa ve net aksiyon başlığı.',
          },
          detail: {
            type: Type.STRING,
            description: 'Verilere dayalı somut öneri ve beklenen etkisi.',
          },
          priority: {
            type: Type.STRING,
            description: 'yüksek, orta veya düşük.',
          },
          impactArea: {
            type: Type.STRING,
            description: 'Örn: Kârlılık, Stok & Üretim, Su Parametreleri, Kargo & Paketleme.',
          },
        },
        required: ['title', 'detail', 'priority', 'impactArea'],
      },
      description: 'İşletmeye özel önceliklendirilmiş verimlilik önerileri (3-5 madde).',
    },
    speciesInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speciesName: { type: Type.STRING },
          assessment: { type: Type.STRING },
        },
        required: ['speciesName', 'assessment'],
      },
      description: 'Mevcut canlı türleri ve varyeteler hakkında kısa verimlilik değerlendirmesi.',
    },
  },
  required: [
    'efficiencyScore',
    'healthStatus',
    'executiveSummary',
    'strengths',
    'risksAndBottlenecks',
    'recommendations',
    'speciesInsights',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/ai/business-analysis', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'Gemini API anahtarı bulunamadı. Lütfen Settings > Secrets panelinden GEMINI_API_KEY tanımlayın.',
      });
      return;
    }

    const body = req.body as {
      mode?: 'analyze' | 'chat';
      businessSnapshot?: unknown;
      question?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    };

    if (!body?.businessSnapshot) {
      res.status(400).json({ error: 'İşletme analiz verisi eksik.' });
      return;
    }

    const snapshotJson = JSON.stringify(body.businessSnapshot, null, 2);

    try {
      if (body.mode === 'chat') {
        const question = (body.question || '').trim();
        if (!question) {
          res.status(400).json({ error: 'Lütfen bir soru yazın.' });
          return;
        }

        const recentHistory = Array.isArray(body.history)
          ? body.history
              .slice(-8)
              .map((m) => `${m.role === 'user' ? 'Kullanıcı' : 'AI Danışman'}: ${m.text}`)
              .join('\n')
          : '';

        const prompt = [
          'Aşağıdaki güncel işletme verilerini incele ve kullanıcının sorusunu yalnızca bu verilere ve akvaryum canlı üretimi / finans yönetimi prensiplerine dayanarak yanıtla.',
          '',
          'İŞLETME VERİ ÖZETİ:',
          snapshotJson,
          recentHistory ? `\nÖNCEKİ KONUŞMA:\n${recentHistory}` : '',
          `\nKULLANICI SORUSU: ${question}`,
        ]
          .filter(Boolean)
          .join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'Sen AquaBreeder Pro bünyesindeki özel işletme verimlilik ve üretimhane yapay zeka danışmanısın. Karides (Caridina, Neocaridina), Apistogramma, Pleco ve diğer akvaryum canlılarının üretimi, stok yönetimi, ölüm/kayıp azaltımı, akvaryum su parametreleri (TDS, pH, GH, KH, sıcaklık, su değişimi), kargo/paketleme maliyetleri ve net kârlılık konularında uzmansın. Her zaman Türkçe yanıt ver, sayıları ve tür isimlerini gerçek verilere dayandır, net ve uygulanabilir öneriler sun. Cevaplarını okunaklı paragraflar veya kısa maddeler halinde tut.',
          },
        });

        res.json({
          reply: (response.text || '').trim() || 'Yanıt oluşturulamadı.',
        });
        return;
      }

      const analysisPrompt = [
        'Aşağıdaki işletmeye ait tüm finansal, canlı stoğu, ölüm/kayıp, kargo/paketleme, sarf envanteri ve akvaryum su parametresi verilerini kapsamlı şekilde analiz et.',
        'İşletme henüz yeni veya az veriye sahipse bunu dürüstçe belirt ve ilk adımlar için yol gösterici öneriler üret.',
        'Veriler arasında dikkat çeken kârlı türleri, zararda veya yavaş dönen türleri, ölüm oranlarını, bekleyen ödemeleri, kargo/strafor maliyet dengesini ve akvaryum parametre uyarılarını özellikle değerlendir.',
        '',
        'İŞLETME VERİLERİ:',
        snapshotJson,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: analysisPrompt,
        config: {
          systemInstruction:
            'Sen AquaBreeder Pro için tasarlanmış profesyonel İşletme Verimlilik Yapay Zekasısın. Görevin akvaryum canlı üretimhanesinin finansal ve biyolojik verimliliğini analiz edip yöneticiye net değerlendirmeler ve somut, veri destekli öneriler sunmaktır. Tüm çıktıları Türkçe üret. Puanı (0-100) gerçek kârlılık, ölüm oranı, akvaryum sağlığı ve nakit akışına göre gerçekçi hesapla.',
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_SCHEMA,
        },
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ analysis: parsed });
    } catch (err) {
      console.error('Gemini API error:', err);
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AquaBreeder Pro server running on http://0.0.0.0:${PORT} (dev=${isDev})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
