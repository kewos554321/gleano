import type { AnalysisResult, CEFRLevel, LearningGoal, AnalysisFilter } from '@gleano/shared';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface AnalysisOptions {
  learningGoal?: LearningGoal;
  customDifficulty?: number;
  filter?: AnalysisFilter;
}

const LEARNING_GOAL_PROMPTS: Record<LearningGoal, string> = {
  general: '',
  ielts: 'Focus on academic vocabulary commonly tested in IELTS exams. Include words and phrases useful for IELTS writing and speaking tasks.',
  toefl: 'Focus on academic and campus-related vocabulary for TOEFL preparation. Include words commonly found in academic lectures and reading passages.',
  toeic: 'Focus on business and workplace vocabulary for TOEIC preparation. Include professional terms and office communication phrases.',
  business: 'Focus on business English vocabulary. Include terms for meetings, negotiations, presentations, and professional correspondence.',
  academic: 'Focus on academic writing vocabulary. Include sophisticated transitional phrases and formal expressions suitable for essays and research papers.',
};

export async function analyzeWithGemini(
  transcript: string,
  nativeLanguage: string,
  targetLanguage: string,
  level: CEFRLevel,
  apiKey: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  const { learningGoal, customDifficulty, filter } = options;
  const levelLabels: Record<CEFRLevel, string> = {
    1: 'A1 (Beginner)',
    2: 'A2 (Elementary)',
    3: 'B1 (Intermediate)',
    4: 'B2 (Upper Intermediate)',
    5: 'C1 (Advanced)',
    6: 'C2 (Proficient)',
  };

  // Build additional filter instructions
  const filterInstructions: string[] = [];

  // Learning goal specific instructions
  if (learningGoal && LEARNING_GOAL_PROMPTS[learningGoal]) {
    filterInstructions.push(LEARNING_GOAL_PROMPTS[learningGoal]);
  }

  // Custom difficulty adjustment
  if (customDifficulty !== undefined) {
    const difficultyDesc =
      customDifficulty <= 3 ? 'very basic and common' :
      customDifficulty <= 5 ? 'moderate difficulty' :
      customDifficulty <= 7 ? 'more challenging' :
      'advanced and sophisticated';
    filterInstructions.push(`Adjust vocabulary difficulty to be ${difficultyDesc} (difficulty level ${customDifficulty}/10).`);
  }

  // Part of speech filter
  if (filter?.posFilter && filter.posFilter.length > 0) {
    const posLabels = filter.posFilter.join(', ');
    filterInstructions.push(`Focus primarily on words that are ${posLabels}.`);
  }

  // Topic filter
  if (filter?.topicFilter) {
    filterInstructions.push(`Prioritize vocabulary related to the topic: ${filter.topicFilter}.`);
  }

  // Custom prompt from user
  if (filter?.customPrompt) {
    filterInstructions.push(`Additional user instruction: ${filter.customPrompt}`);
  }

  const additionalInstructions = filterInstructions.length > 0
    ? `\n\nAdditional requirements:\n${filterInstructions.map(i => `- ${i}`).join('\n')}`
    : '';

  const prompt = `You are a language learning assistant. Analyze the following transcript and extract learning materials suitable for a ${levelLabels[level]} level learner.

User's native language: ${nativeLanguage}
Target language being learned: ${targetLanguage}

Transcript:
"""
${transcript}
"""

Extract and return a JSON object with:
1. "words": Array of vocabulary words suitable for this level. Each word object should have:
   - "word": the word in target language
   - "phonetic": pronunciation guide (IPA if possible)
   - "pos": part of speech (noun, verb, adj, etc.)
   - "meaning": translation/definition in user's native language
   - "example": a simple example sentence using this word
   - "topic": categorize the word by topic (e.g., "kitchen", "travel", "business", "technology")

2. "phrases": Array of useful phrases/expressions. Each phrase object should have:
   - "phrase": the phrase in target language
   - "meaning": translation in user's native language
   - "context": when/how to use this phrase

3. "sentences": Array of notable sentences for learning. Each sentence object should have:
   - "sentence": the original sentence
   - "translation": translation in user's native language
   - "note": grammar or usage note (optional)

Important guidelines:
- Select only words/phrases appropriate for ${levelLabels[level]} level
- For lower levels (A1-A2), focus on common everyday vocabulary
- For higher levels (B2-C2), include more advanced vocabulary and idioms
- Limit to 5-10 items per category
- Ensure all translations are in ${nativeLanguage}${additionalInstructions}

Return ONLY the JSON object, no additional text or markdown formatting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  const text = data.candidates[0].content.parts[0].text;

  // Parse JSON response (handle potential markdown code blocks)
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  }
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }

  try {
    const result: AnalysisResult = JSON.parse(jsonText.trim());
    return result;
  } catch {
    console.error('Failed to parse Gemini response:', text);
    // Return empty result if parsing fails
    return {
      words: [],
      phrases: [],
      sentences: [],
    };
  }
}
