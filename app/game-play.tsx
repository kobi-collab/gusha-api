import { useState, useCallback, useEffect, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  GameType,
  TicTacToeBoard,
  TicTacToeCell,
  createEmptyBoard,
  checkWinner,
  getWinningLine,
  getAIMove,
  TriviaQuestion,
  getRandomQuestions,
  MemoryCard,
  createMemoryDeck,
  GameChatMessage,
  getRandomAIChatResponse,
} from "@/lib/game-data";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Tic Tac Toe Component ──
function TicTacToeGame({
  colors,
  onGameEnd,
  opponentName,
  onChatMessage,
}: {
  colors: ReturnType<typeof useColors>;
  onGameEnd: (result: string) => void;
  opponentName: string;
  onChatMessage: (msg: string) => void;
}) {
  const [board, setBoard] = useState<TicTacToeBoard>(createEmptyBoard());
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const winLine = getWinningLine(board);

  const handleCellPress = useCallback(
    (index: number) => {
      if (board[index] || result || !isMyTurn) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newBoard = [...board];
      newBoard[index] = "X";
      setBoard(newBoard);

      const winner = checkWinner(newBoard);
      if (winner) {
        const msg =
          winner === "X" ? "You won!" : winner === "draw" ? "It's a draw!" : `${opponentName} won!`;
        setResult(msg);
        onGameEnd(msg);
        return;
      }

      setIsMyTurn(false);
      // AI move after delay
      setTimeout(() => {
        const aiIdx = getAIMove(newBoard, "O");
        const aiBoard = [...newBoard];
        aiBoard[aiIdx] = "O";
        setBoard(aiBoard);
        onChatMessage(getRandomAIChatResponse());

        const aiWinner = checkWinner(aiBoard);
        if (aiWinner) {
          const msg =
            aiWinner === "O" ? `${opponentName} won!` : aiWinner === "draw" ? "It's a draw!" : "You won!";
          setResult(msg);
          onGameEnd(msg);
        } else {
          setIsMyTurn(true);
        }
      }, 600 + Math.random() * 800);
    },
    [board, result, isMyTurn, opponentName, onGameEnd, onChatMessage]
  );

  const handleReset = useCallback(() => {
    setBoard(createEmptyBoard());
    setIsMyTurn(true);
    setResult(null);
  }, []);

  const cellSize = Math.min((SCREEN_WIDTH - 80) / 3, 100);

  return (
    <View style={styles.tttContainer}>
      {!result && (
        <Text style={[styles.turnText, { color: isMyTurn ? colors.primary : colors.muted }]}>
          {isMyTurn ? "Your turn (X)" : `${opponentName}'s turn (O)...`}
        </Text>
      )}
      {result && (
        <Text style={[styles.resultText, { color: colors.primary }]}>{result}</Text>
      )}
      <View style={styles.tttBoard}>
        {board.map((cell, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const isWinCell = winLine?.includes(idx);
          return (
            <Pressable
              key={idx}
              onPress={() => handleCellPress(idx)}
              style={({ pressed }) => [
                styles.tttCell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isWinCell
                    ? colors.primary + "20"
                    : colors.surface,
                  borderRightWidth: col < 2 ? 2 : 0,
                  borderBottomWidth: row < 2 ? 2 : 0,
                  borderColor: colors.border,
                },
                pressed && !cell && !result && { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Text
                style={[
                  styles.tttCellText,
                  {
                    color: cell === "X" ? colors.primary : "#E91E63",
                    fontSize: cellSize * 0.5,
                  },
                ]}
              >
                {cell || ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {result && (
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.resetButtonText}>Play Again</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Would You Rather Component ──
function TriviaGame({
  colors,
  onGameEnd,
  opponentName,
  onChatMessage,
}: {
  colors: ReturnType<typeof useColors>;
  onGameEnd: (result: string) => void;
  opponentName: string;
  onChatMessage: (msg: string) => void;
}) {
  const [questions] = useState<TriviaQuestion[]>(() => getRandomQuestions(7));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [myAnswer, setMyAnswer] = useState<"A" | "B" | null>(null);
  const [theirAnswer, setTheirAnswer] = useState<"A" | "B" | null>(null);
  const [matches, setMatches] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const current = questions[currentIdx];

  const handleAnswer = useCallback(
    (answer: "A" | "B") => {
      if (myAnswer) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMyAnswer(answer);

      // Simulate opponent answer after delay
      setTimeout(() => {
        const opAnswer = Math.random() > 0.5 ? "A" : "B";
        setTheirAnswer(opAnswer as "A" | "B");
        if (opAnswer === answer) {
          setMatches((m) => m + 1);
          onChatMessage("Great minds think alike! 💜");
        } else {
          onChatMessage(getRandomAIChatResponse());
        }
      }, 800 + Math.random() * 600);
    },
    [myAnswer, onChatMessage]
  );

  const handleNext = useCallback(() => {
    if (currentIdx >= questions.length - 1) {
      setShowResult(true);
      const pct = Math.round((matches / questions.length) * 100);
      onGameEnd(`${pct}% in common!`);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setMyAnswer(null);
    setTheirAnswer(null);
  }, [currentIdx, questions.length, matches, onGameEnd]);

  if (showResult) {
    const pct = Math.round((matches / questions.length) * 100);
    return (
      <View style={styles.triviaContainer}>
        <Text style={styles.triviaResultEmoji}>
          {pct >= 70 ? "💜" : pct >= 40 ? "😊" : "🤷"}
        </Text>
        <Text style={[styles.triviaResultPct, { color: colors.primary }]}>
          {pct}% in Common
        </Text>
        <Text style={[styles.triviaResultSub, { color: colors.muted }]}>
          You agreed on {matches} out of {questions.length} questions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.triviaContainer}>
      <View style={styles.triviaProgress}>
        <Text style={[styles.triviaProgressText, { color: colors.muted }]}>
          {currentIdx + 1} / {questions.length}
        </Text>
        <View style={[styles.triviaProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.triviaProgressFill,
              {
                backgroundColor: colors.primary,
                width: `${((currentIdx + 1) / questions.length) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.triviaCategoryBadge, { backgroundColor: "#9C27B0" + "15" }]}>
        <Text style={[styles.triviaCategoryText, { color: "#9C27B0" }]}>
          {current.category}
        </Text>
      </View>

      <Text style={[styles.triviaQuestion, { color: colors.foreground }]}>
        {current.question}
      </Text>

      <Pressable
        onPress={() => handleAnswer("A")}
        style={({ pressed }) => [
          styles.triviaOption,
          {
            backgroundColor:
              myAnswer === "A"
                ? theirAnswer === "A"
                  ? colors.success + "20"
                  : colors.primary + "15"
                : colors.surface,
            borderColor:
              myAnswer === "A"
                ? theirAnswer === "A"
                  ? colors.success
                  : colors.primary
                : colors.border,
          },
          pressed && !myAnswer && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.triviaOptionText, { color: colors.foreground }]}>
          {current.optionA}
        </Text>
        {myAnswer === "A" && <Text style={styles.triviaYou}>You</Text>}
        {theirAnswer === "A" && (
          <Text style={[styles.triviaThem, { color: "#9C27B0" }]}>{opponentName}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => handleAnswer("B")}
        style={({ pressed }) => [
          styles.triviaOption,
          {
            backgroundColor:
              myAnswer === "B"
                ? theirAnswer === "B"
                  ? colors.success + "20"
                  : colors.primary + "15"
                : colors.surface,
            borderColor:
              myAnswer === "B"
                ? theirAnswer === "B"
                  ? colors.success
                  : colors.primary
                : colors.border,
          },
          pressed && !myAnswer && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.triviaOptionText, { color: colors.foreground }]}>
          {current.optionB}
        </Text>
        {myAnswer === "B" && <Text style={styles.triviaYou}>You</Text>}
        {theirAnswer === "B" && (
          <Text style={[styles.triviaThem, { color: "#9C27B0" }]}>{opponentName}</Text>
        )}
      </Pressable>

      {myAnswer && theirAnswer && (
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.nextButtonText}>
            {currentIdx >= questions.length - 1 ? "See Results" : "Next Question"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Memory Match Component ──
function MemoryGame({
  colors,
  onGameEnd,
  opponentName,
  onChatMessage,
}: {
  colors: ReturnType<typeof useColors>;
  onGameEnd: (result: string) => void;
  opponentName: string;
  onChatMessage: (msg: string) => void;
}) {
  const [cards, setCards] = useState<MemoryCard[]>(() => createMemoryDeck(8));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const checkingRef = useRef(false);

  const handleCardPress = useCallback(
    (cardId: number) => {
      if (!isMyTurn || checkingRef.current) return;
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) return;
      if (flippedIds.length >= 2) return;

      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newCards = cards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      );
      const newFlipped = [...flippedIds, cardId];
      setCards(newCards);
      setFlippedIds(newFlipped);

      if (newFlipped.length === 2) {
        checkingRef.current = true;
        setMoves((m) => m + 1);
        const [first, second] = newFlipped;
        const card1 = newCards.find((c) => c.id === first)!;
        const card2 = newCards.find((c) => c.id === second)!;

        setTimeout(() => {
          if (card1.emoji === card2.emoji) {
            // Match!
            const matched = newCards.map((c) =>
              c.id === first || c.id === second
                ? { ...c, isMatched: true }
                : c
            );
            setCards(matched);
            setMyScore((s) => s + 1);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Check if game over
            if (matched.every((c) => c.isMatched)) {
              setGameOver(true);
              onGameEnd(`Game over! You: ${myScore + 1}, ${opponentName}: ${theirScore}`);
            }
          } else {
            // No match — flip back
            const flippedBack = newCards.map((c) =>
              c.id === first || c.id === second
                ? { ...c, isFlipped: false }
                : c
            );
            setCards(flippedBack);
            // Switch turn to opponent
            setIsMyTurn(false);

            // AI turn
            setTimeout(() => {
              onChatMessage(getRandomAIChatResponse());
              // AI picks two random unmatched cards
              const available = flippedBack.filter((c) => !c.isMatched);
              if (available.length >= 2) {
                const shuffled = [...available].sort(() => Math.random() - 0.5);
                const pick1 = shuffled[0];
                const pick2 = shuffled[1];

                const aiFlip1 = flippedBack.map((c) =>
                  c.id === pick1.id ? { ...c, isFlipped: true } : c
                );
                setCards(aiFlip1);

                setTimeout(() => {
                  const aiFlip2 = aiFlip1.map((c) =>
                    c.id === pick2.id ? { ...c, isFlipped: true } : c
                  );
                  setCards(aiFlip2);

                  setTimeout(() => {
                    if (pick1.emoji === pick2.emoji) {
                      const aiMatched = aiFlip2.map((c) =>
                        c.id === pick1.id || c.id === pick2.id
                          ? { ...c, isMatched: true }
                          : c
                      );
                      setCards(aiMatched);
                      setTheirScore((s) => s + 1);

                      if (aiMatched.every((c) => c.isMatched)) {
                        setGameOver(true);
                        onGameEnd(`Game over! You: ${myScore}, ${opponentName}: ${theirScore + 1}`);
                      }
                    } else {
                      const aiBack = aiFlip2.map((c) =>
                        c.id === pick1.id || c.id === pick2.id
                          ? { ...c, isFlipped: false }
                          : c
                      );
                      setCards(aiBack);
                    }
                    setIsMyTurn(true);
                    checkingRef.current = false;
                  }, 800);
                }, 500);
              } else {
                setIsMyTurn(true);
                checkingRef.current = false;
              }
            }, 600);
            return;
          }
          setFlippedIds([]);
          checkingRef.current = false;
        }, 600);
      }
    },
    [cards, flippedIds, isMyTurn, myScore, theirScore, opponentName, onGameEnd, onChatMessage]
  );

  const cardSize = Math.min((SCREEN_WIDTH - 64) / 4 - 6, 72);

  return (
    <View style={styles.memoryContainer}>
      <View style={styles.memoryScoreRow}>
        <View style={[styles.memoryScoreBox, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.memoryScoreLabel, { color: colors.primary }]}>You</Text>
          <Text style={[styles.memoryScoreNum, { color: colors.primary }]}>{myScore}</Text>
        </View>
        <Text style={[styles.memoryVs, { color: colors.muted }]}>vs</Text>
        <View style={[styles.memoryScoreBox, { backgroundColor: "#E91E63" + "15" }]}>
          <Text style={[styles.memoryScoreLabel, { color: "#E91E63" }]}>{opponentName}</Text>
          <Text style={[styles.memoryScoreNum, { color: "#E91E63" }]}>{theirScore}</Text>
        </View>
      </View>

      {!gameOver && (
        <Text style={[styles.turnText, { color: isMyTurn ? colors.primary : colors.muted }]}>
          {isMyTurn ? "Your turn — flip two cards" : `${opponentName} is thinking...`}
        </Text>
      )}

      <View style={styles.memoryGrid}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => handleCardPress(card.id)}
            style={({ pressed }) => [
              styles.memoryCard,
              {
                width: cardSize,
                height: cardSize,
                backgroundColor: card.isMatched
                  ? colors.success + "20"
                  : card.isFlipped
                  ? colors.surface
                  : colors.primary + "15",
                borderColor: card.isMatched
                  ? colors.success
                  : card.isFlipped
                  ? colors.primary
                  : colors.border,
              },
              pressed && !card.isFlipped && !card.isMatched && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.memoryCardText, { fontSize: cardSize * 0.4 }]}>
              {card.isFlipped || card.isMatched ? card.emoji : "?"}
            </Text>
          </Pressable>
        ))}
      </View>

      {gameOver && (
        <View style={styles.memoryResult}>
          <Text style={[styles.resultText, { color: colors.primary }]}>
            {myScore > theirScore
              ? "You won! 🎉"
              : myScore < theirScore
              ? `${opponentName} won!`
              : "It's a tie!"}
          </Text>
          <Text style={[styles.memoryMoves, { color: colors.muted }]}>
            Total moves: {moves}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Game Play Screen ──
export default function GamePlayScreen() {
  const params = useLocalSearchParams<{
    gameType: string;
    opponentId: string;
    opponentName: string;
    opponentPhoto: string;
  }>();
  const colors = useColors();
  const router = useRouter();
  const [chatMessages, setChatMessages] = useState<GameChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  const gameType = (params.gameType || "tictactoe") as GameType;
  const opponentName = params.opponentName || "Opponent";

  const addChatMessage = useCallback((text: string, sender: "me" | "them" = "them") => {
    setChatMessages((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, text, sender, timestamp: Date.now() },
    ]);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    addChatMessage(chatInput.trim(), "me");
    setChatInput("");
    // AI response
    setTimeout(() => {
      addChatMessage(getRandomAIChatResponse(), "them");
    }, 1000 + Math.random() * 1500);
  }, [chatInput, addChatMessage]);

  const handleGameEnd = useCallback((result: string) => {
    addChatMessage(`Game ended: ${result}`, "them");
  }, [addChatMessage]);

  const gameTitle =
    gameType === "tictactoe"
      ? "Tic Tac Toe"
      : gameType === "trivia"
      ? "Would You Rather"
      : "Memory Match";

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.gpHeader, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.gpHeaderCenter}>
            <Text style={[styles.gpHeaderTitle, { color: colors.foreground }]}>
              {gameTitle}
            </Text>
            <Text style={[styles.gpHeaderSub, { color: colors.muted }]}>
              with {opponentName}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowChat(!showChat)}
            style={({ pressed }) => [
              styles.chatToggle,
              {
                backgroundColor: showChat ? colors.primary : colors.surface,
                borderColor: showChat ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="message.fill"
              size={18}
              color={showChat ? "#fff" : colors.primary}
            />
            {chatMessages.length > 0 && !showChat && (
              <View style={[styles.chatBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Game Area */}
        <View style={[styles.gameArea, showChat && { flex: 1 }]}>
          {gameType === "tictactoe" && (
            <TicTacToeGame
              colors={colors}
              onGameEnd={handleGameEnd}
              opponentName={opponentName}
              onChatMessage={(msg) => addChatMessage(msg, "them")}
            />
          )}
          {gameType === "trivia" && (
            <TriviaGame
              colors={colors}
              onGameEnd={handleGameEnd}
              opponentName={opponentName}
              onChatMessage={(msg) => addChatMessage(msg, "them")}
            />
          )}
          {gameType === "memory" && (
            <MemoryGame
              colors={colors}
              onGameEnd={handleGameEnd}
              opponentName={opponentName}
              onChatMessage={(msg) => addChatMessage(msg, "them")}
            />
          )}
        </View>

        {/* Chat Panel */}
        {showChat && (
          <View style={[styles.chatPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.chatBubble,
                    item.sender === "me"
                      ? [styles.chatBubbleMe, { backgroundColor: colors.primary }]
                      : [styles.chatBubbleThem, { backgroundColor: colors.background, borderColor: colors.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      { color: item.sender === "me" ? "#fff" : colors.foreground },
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.chatEmpty, { color: colors.muted }]}>
                  Say hi while you play! 👋
                </Text>
              }
            />
            <View style={[styles.chatInputRow, { borderTopColor: colors.border }]}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.muted}
                style={[
                  styles.chatInputField,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
              />
              <Pressable
                onPress={handleSendChat}
                style={({ pressed }) => [
                  styles.chatSendBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="paperplane.fill" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  // Header
  gpHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  gpHeaderCenter: {
    flex: 1,
  },
  gpHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  gpHeaderSub: {
    fontSize: 13,
  },
  chatToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chatBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  // Game area
  gameArea: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  turnText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  resultText: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  resetButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // Tic Tac Toe
  tttContainer: {
    alignItems: "center",
    gap: 8,
  },
  tttBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "auto",
  },
  tttCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  tttCellText: {
    fontWeight: "800",
  },
  // Trivia
  triviaContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    width: "100%",
  },
  triviaProgress: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  triviaProgressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  triviaProgressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  triviaProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  triviaCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  triviaCategoryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  triviaQuestion: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  triviaOption: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triviaOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  triviaYou: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0a7ea4",
    backgroundColor: "#0a7ea4" + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  triviaThem: {
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#9C27B0" + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  triviaResultEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  triviaResultPct: {
    fontSize: 36,
    fontWeight: "900",
  },
  triviaResultSub: {
    fontSize: 16,
    textAlign: "center",
  },
  nextButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // Memory
  memoryContainer: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  memoryScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memoryScoreBox: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
  },
  memoryScoreLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  memoryScoreNum: {
    fontSize: 28,
    fontWeight: "900",
  },
  memoryVs: {
    fontSize: 16,
    fontWeight: "600",
  },
  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  memoryCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCardText: {
    fontWeight: "700",
  },
  memoryResult: {
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  memoryMoves: {
    fontSize: 14,
  },
  // Chat panel
  chatPanel: {
    flex: 1,
    maxHeight: 250,
    borderTopWidth: 0.5,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 12,
    gap: 6,
  },
  chatBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chatBubbleMe: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  chatBubbleThem: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatEmpty: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 20,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    borderTopWidth: 0.5,
  },
  chatInputField: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
