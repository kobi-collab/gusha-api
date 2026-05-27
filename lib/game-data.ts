// ── Game Types & Data ──

export type GameType = "tictactoe" | "trivia" | "memory";

export interface GameInfo {
  type: GameType;
  title: string;
  description: string;
  emoji: string;
  color: string;
  players: string;
  duration: string;
}

export const GAMES: GameInfo[] = [
  {
    type: "tictactoe",
    title: "Tic Tac Toe",
    description: "Classic X and O — quick and fun ice breaker",
    emoji: "❌",
    color: "#FF6B35",
    players: "2 players",
    duration: "~2 min",
  },
  {
    type: "trivia",
    title: "Would You Rather",
    description: "Fun questions to find what you have in common",
    emoji: "🤔",
    color: "#D946A8",
    players: "2 players",
    duration: "~5 min",
  },
  {
    type: "memory",
    title: "Memory Match",
    description: "Find matching pairs together — teamwork!",
    emoji: "🧠",
    color: "#FFD700",
    players: "2 players",
    duration: "~3 min",
  },
];

// ── Tic Tac Toe ──

export type TicTacToeCell = "X" | "O" | null;
export type TicTacToeBoard = TicTacToeCell[];

export function createEmptyBoard(): TicTacToeBoard {
  return Array(9).fill(null);
}

export function checkWinner(board: TicTacToeBoard): TicTacToeCell | "draw" | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

export function getWinningLine(board: TicTacToeBoard): number[] | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

// Simple AI for demo: pick best move or random
export function getAIMove(board: TicTacToeBoard, aiSymbol: TicTacToeCell): number {
  const opponent = aiSymbol === "X" ? "O" : "X";
  
  // 1. Win if possible
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const test = [...board];
      test[i] = aiSymbol;
      if (checkWinner(test) === aiSymbol) return i;
    }
  }
  // 2. Block opponent
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const test = [...board];
      test[i] = opponent;
      if (checkWinner(test) === opponent) return i;
    }
  }
  // 3. Center
  if (!board[4]) return 4;
  // 4. Corners
  const corners = [0, 2, 6, 8].filter((i) => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  // 5. Any
  const available = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  return available[Math.floor(Math.random() * available.length)];
}

// ── Would You Rather / Trivia ──

export interface TriviaQuestion {
  question: string;
  optionA: string;
  optionB: string;
  category: string;
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { question: "Would you rather...", optionA: "Always be early", optionB: "Always be fashionably late", category: "Lifestyle" },
  { question: "Would you rather...", optionA: "Live in a big city", optionB: "Live in a small town", category: "Lifestyle" },
  { question: "Would you rather...", optionA: "Have a movie night in", optionB: "Go out dancing", category: "Night Out" },
  { question: "Would you rather...", optionA: "Cook dinner together", optionB: "Order takeout", category: "Night Out" },
  { question: "Would you rather...", optionA: "Beach vacation", optionB: "Mountain adventure", category: "Travel" },
  { question: "Would you rather...", optionA: "Road trip with playlists", optionB: "Fly and explore", category: "Travel" },
  { question: "Would you rather...", optionA: "Morning person", optionB: "Night owl", category: "Personality" },
  { question: "Would you rather...", optionA: "Text all day", optionB: "One long phone call", category: "Communication" },
  { question: "Would you rather...", optionA: "Adopt a cat", optionB: "Adopt a dog", category: "Lifestyle" },
  { question: "Would you rather...", optionA: "Binge a TV series", optionB: "Read a good book", category: "Entertainment" },
  { question: "Would you rather...", optionA: "Coffee hangout", optionB: "Wine bar", category: "Night Out" },
  { question: "Would you rather...", optionA: "Surprise gifts", optionB: "Planned gifts", category: "Vibes" },
  { question: "Would you rather...", optionA: "Karaoke night", optionB: "Board game night", category: "Fun" },
  { question: "Would you rather...", optionA: "Matching outfits", optionB: "Opposite styles", category: "Style" },
  { question: "Would you rather...", optionA: "Hangout at a museum", optionB: "Hangout at a park", category: "Night Out" },
  { question: "Would you rather...", optionA: "Share everything openly", optionB: "Keep some mystery", category: "Personality" },
  { question: "Would you rather...", optionA: "Spontaneous plans", optionB: "Everything scheduled", category: "Personality" },
  { question: "Would you rather...", optionA: "Learn to surf", optionB: "Learn to ski", category: "Adventure" },
  { question: "Would you rather...", optionA: "Breakfast in bed", optionB: "Brunch out", category: "Lifestyle" },
  { question: "Would you rather...", optionA: "Big group hangout", optionB: "One-on-one catch up", category: "Social" },
];

export function getRandomQuestions(count: number): TriviaQuestion[] {
  const shuffled = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Memory Match ──

export const MEMORY_EMOJIS = [
  "🌈", "🦋", "🌸", "🌙", "⭐", "🎵", "🔥", "💜",
  "🌊", "🍕", "🎨", "🦄", "🌻", "🍓", "✨", "🐱",
];

export interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export function createMemoryDeck(pairCount: number = 8): MemoryCard[] {
  const emojis = MEMORY_EMOJIS.slice(0, pairCount);
  const cards: MemoryCard[] = [];
  emojis.forEach((emoji, idx) => {
    cards.push({ id: idx * 2, emoji, isFlipped: false, isMatched: false });
    cards.push({ id: idx * 2 + 1, emoji, isFlipped: false, isMatched: false });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ── Game Chat Messages ──

export interface GameChatMessage {
  id: string;
  text: string;
  sender: "me" | "them";
  timestamp: number;
}

// Quick chat responses for AI opponent
export const AI_CHAT_RESPONSES = [
  "Nice move! 😄",
  "Hmm, good one!",
  "I didn't see that coming 😅",
  "You're good at this!",
  "My turn! 🎯",
  "Interesting choice...",
  "Great minds think alike! 💜",
  "Ooh, tough decision!",
  "That's what I would've picked too!",
  "Haha, we're so different 😂",
];

export function getRandomAIChatResponse(): string {
  return AI_CHAT_RESPONSES[Math.floor(Math.random() * AI_CHAT_RESPONSES.length)];
}
