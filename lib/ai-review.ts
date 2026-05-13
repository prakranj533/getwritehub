export interface AISuggestion {
  type: "grammar" | "style" | "clarity" | "structure";
  message: string;
  line?: number;
  original?: string;
  suggestion?: string;
}

export function reviewContent(content: string): AISuggestion[] {
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
    const weakWords = ["very", "really", "quite", "just", "basically", "actually", "literally", "simply", "totally"];
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

    // Check for overused adverbs (ending in -ly)
    const adverbs = line.match(/\b\w+ly\b/gi);
    if (adverbs && adverbs.length > 2) {
      suggestions.push({
        type: "style",
        message: `Line ${idx + 1}: Found ${adverbs.length} adverbs in one line. Relying too much on adverbs can weaken your prose. Try using stronger verbs instead.`,
        line: idx + 1,
        original: adverbs.join(", "),
      });
    }

    // Check for clichés
    const cliches = [
      "at the end of the day",
      "think outside the box",
      "avoid it like the plague",
      "dead as a doornail",
      "piece of cake",
      "the tip of the iceberg",
      "in the nick of time",
      "only time will tell",
      "a matter of time",
      "crystal clear",
      "all in all",
      "last but not least",
      "in this day and age",
      "few and far between",
      "to make a long story short",
      "the calm before the storm",
      "writing on the wall",
    ];
    cliches.forEach((cliche) => {
      if (line.toLowerCase().includes(cliche)) {
        suggestions.push({
          type: "style",
          message: `Line ${idx + 1}: "${cliche}" is a cliché. Try a more original way to express this idea.`,
          line: idx + 1,
        });
      }
    });

    // Check for overused dialogue tags
    const dialogueTags = /\b(said|asked|replied|shouted|whispered|remarked|commented)\b/gi;
    const tagMatches = line.match(dialogueTags);
    if (tagMatches && tagMatches.length > 2) {
      suggestions.push({
        type: "style",
        message: `Line ${idx + 1}: Multiple dialogue tags in one line. Consider using action beats instead of tags like "${tagMatches[0]}" to keep the dialogue flowing.`,
        line: idx + 1,
      });
    }

    // Check for missing punctuation at end of paragraphs
    if (line.trim().length > 20 && !line.trim().match(/[.!?:;"]$/) && !line.trim().startsWith("#") && !line.trim().startsWith("-") && !line.trim().startsWith("*")) {
      suggestions.push({
        type: "grammar",
        message: `Line ${idx + 1}: This line might be missing ending punctuation.`,
        line: idx + 1,
      });
    }
  });

  // Check overall readability (simplified)
  const totalWords = content.split(/\s+/).filter((w) => w.length > 0).length;
  const totalSentences = content.split(/[.!?]/).filter((s) => s.trim().length > 0).length;
  const avgWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;

  if (avgWordsPerSentence > 25) {
    suggestions.push({
      type: "clarity",
      message: `Your average sentence length is ${Math.round(avgWordsPerSentence)} words. Aim for 15-20 words for better readability.`,
    });
  }

  // Check overall structure
  if (!content.includes("#")) {
    suggestions.push({
      type: "structure",
      message: "Consider adding headings (using # Markdown syntax) to organize your chapter into sections.",
    });
  }

  if (totalWords < 100) {
    suggestions.push({
      type: "structure",
      message: `This chapter has only ${totalWords} words. Consider expanding it with more details and examples.`,
    });
  }

  // Sort by priority: grammar > clarity > style > structure
  const priority = { grammar: 0, clarity: 1, style: 2, structure: 3 };
  return suggestions
    .sort((a, b) => priority[a.type] - priority[b.type])
    .slice(0, 25);
}
