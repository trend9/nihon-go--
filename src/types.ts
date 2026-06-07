export interface PostItData {
  id: string;
  color: 'yellow' | 'blue' | 'pink' | 'green';
  title: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  explanation: string;
  exampleJp: string;
  exampleEn: string;
  tip?: string;
}

export interface QuizData {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Article {
  id: string; // url slug
  title: string;
  subtitle?: string;
  level: 1 | 2 | 3 | 4 | 5;
  levelName: string; // e.g., "Level 1: Absolute Beginner"
  timeOfDay: 'Morning' | 'Late-Morning' | 'Afternoon' | 'Evening' | 'Night';
  publishedAt: string; // time string (e.g., "07:00")
  description: string; // meta description
  thumbnailUrl: string;
  thumbnailAlt: string;
  byline: string; // e.g. "By Kenji Sato, Language Desk"
  introduction: string; // Newspaper lead paragraph
  grammarExplanation: string; // Detailed grammar analysis
  postIts: PostItData[]; // Post-it vocabulary notes
  culturalInsight?: string; // Newspaper mini-column
  quiz: QuizData;
  schemaMarkup?: string; // Custom SEO schema markup
  isVerified?: boolean; // CMS proofread complete
}

export interface LearningState {
  completedArticles: string[]; // completed article IDs
  currentLevel: number;
}
