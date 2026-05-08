import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

interface AISuggestion {
  type: "grammar" | "style" | "clarity" | "structure";
  message: string;
  line?: number;
  original?: string;
  suggestion?: string;
}

// Simple built-in AI review logic (no external API needed)
// In production, replace with OpenAI/Claude API call
function reviewContent(content: string): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    // Check for very long sentences (> 40 words)
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 40) {
      suggestions.push({
        type: "clarity",
        message: `Line ${idx + 1}: This sentence has ${words.length} words. Consider breaking it into shorter sentences for better readability.`,
        line: idx + 1,
      });
    }

    // Check for passive voice patterns
    const passivePatterns = /\b(was|were|been|being|is|are)\s+(being\s+)?\w+ed\b/i;
    if (passivePatterns.test(line)) {
      suggestions.push({
        type: "style",
        message: `Line ${idx + 1}: Consider using active voice instead of passive voice for more engaging writing.`,
        line: idx + 1,
        original: line.trim(),
      });
    }

    // Check for repeated words
    const wordList = line.toLowerCase().split(/\s+/);
    for (let i = 0; i < wordList.length - 1; i++) {
      if (wordList[i] === wordList[i + 1] && wordList[i].length > 2) {
        suggestions.push({
          type: "grammar",
          message: `Line ${idx + 1}: Repeated word "${wordList[i]}".`,
          line: idx + 1,
          original: `${wordList[i]} ${wordList[i]}`,
          suggestion: wordList[i],
        });
      }
    }

    // Check for common weak words
    const weakWords = ["very", "really", "quite", "just", "basically", "actually"];
    weakWords.forEach((weak) => {
      const regex = new RegExp(`\\b${weak}\\b`, "gi");
      if (regex.test(line)) {
        suggestions.push({
          type: "style",
          message: `Line ${idx + 1}: "${weak}" is a filler word. Consider removing it or using a stronger alternative.`,
          line: idx + 1,
        });
      }
    });

    // Check for missing punctuation at end of paragraphs
    if (line.trim().length > 20 && !line.trim().match(/[.!?:;]$/) && !line.trim().startsWith("#") && !line.trim().startsWith("-") && !line.trim().startsWith("*")) {
      suggestions.push({
        type: "grammar",
        message: `Line ${idx + 1}: This line might be missing ending punctuation.`,
        line: idx + 1,
      });
    }
  });

  // Check overall structure
  if (!content.includes("#")) {
    suggestions.push({
      type: "structure",
      message: "Consider adding headings (using # Markdown syntax) to organize your chapter into sections.",
    });
  }

  const totalWords = content.split(/\s+/).filter((w) => w.length > 0).length;
  if (totalWords < 100) {
    suggestions.push({
      type: "structure",
      message: `This chapter has only ${totalWords} words. Consider expanding it with more details and examples.`,
    });
  }

  // Limit to top 20 suggestions
  return suggestions.slice(0, 20);
}

// POST /api/ai-review - Review content with AI
export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const suggestions = reviewContent(content);

    // Provide a summary
    const grammarCount = suggestions.filter((s) => s.type === "grammar").length;
    const styleCount = suggestions.filter((s) => s.type === "style").length;
    const clarityCount = suggestions.filter((s) => s.type === "clarity").length;
    const structureCount = suggestions.filter((s) => s.type === "structure").length;

    const totalWords = content.split(/\s+/).filter((w: string) => w.length > 0).length;

    return NextResponse.json({
      title,
      wordCount: totalWords,
      suggestions,
      summary: {
        total: suggestions.length,
        grammar: grammarCount,
        style: styleCount,
        clarity: clarityCount,
        structure: structureCount,
      },
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Review error:", error);
    return NextResponse.json(
      { error: "Failed to review content" },
      { status: 500 }
    );
  }
}
