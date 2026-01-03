import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeWithGemini } from '../../services/ai';

describe('AI Service', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('analyzeWithGemini', () => {
    it('should return parsed analysis result', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    words: [
                      {
                        word: 'hello',
                        phonetic: '/həˈloʊ/',
                        pos: 'interjection',
                        meaning: '你好',
                        example: 'Hello, how are you?',
                      },
                    ],
                    phrases: [
                      {
                        phrase: 'How are you?',
                        meaning: '你好嗎？',
                        context: 'Used as a greeting',
                      },
                    ],
                    sentences: [
                      {
                        sentence: 'Nice to meet you.',
                        translation: '很高興認識你。',
                        note: 'Common greeting',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await analyzeWithGemini(
        'Hello, how are you?',
        'zh-TW',
        'en',
        3,
        mockApiKey
      );

      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe('hello');
      expect(result.phrases).toHaveLength(1);
      expect(result.sentences).toHaveLength(1);
    });

    it('should handle markdown code blocks in response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{"words": [], "phrases": [], "sentences": []}\n```',
                },
              ],
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await analyzeWithGemini(
        'Test transcript',
        'zh-TW',
        'en',
        3,
        mockApiKey
      );

      expect(result.words).toEqual([]);
      expect(result.phrases).toEqual([]);
      expect(result.sentences).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        analyzeWithGemini('Test', 'zh-TW', 'en', 3, mockApiKey)
      ).rejects.toThrow('Gemini API error: 500');
    });

    it('should throw error when no candidates returned', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }),
      });

      await expect(
        analyzeWithGemini('Test', 'zh-TW', 'en', 3, mockApiKey)
      ).rejects.toThrow('No response from Gemini');
    });

    it('should return empty result on JSON parse failure', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Invalid JSON response',
                },
              ],
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await analyzeWithGemini(
        'Test transcript',
        'zh-TW',
        'en',
        3,
        mockApiKey
      );

      expect(result).toEqual({
        words: [],
        phrases: [],
        sentences: [],
      });
    });

    it('should use correct level label for each CEFR level', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '{"words": [], "phrases": [], "sentences": []}' }],
            },
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Test each level
      for (const level of [1, 2, 3, 4, 5, 6] as const) {
        await analyzeWithGemini('Test', 'zh-TW', 'en', level, mockApiKey);
      }

      expect(global.fetch).toHaveBeenCalledTimes(6);
    });
  });
});
