const allQuestions = [
  {
    id: "q1",
    text: "What is the common term for a substance that donates a proton or accepts an electron pair?",
    options: ["Base", "Acid", "Salt", "Alkali"]
  },
  {
    id: "q2",
    text: "Which of the following is an example of a strong acid?",
    options: ["Citric acid", "Hydrochloric acid", "Sodium hydroxide", "Sodium carbonate"]
  },
  {
    id: "q3",
    text: "What happens when a base reacts with an acid?",
    options: ["It forms a salt and water", "It forms an acid and a base", "It forms a gas and a liquid", "It forms a solid and a liquid"]
  },
  {
    id: "q4",
    text: "Which of the following salts is formed by the reaction between sodium hydroxide and hydrochloric acid?",
    options: ["Sodium chloride", "Sodium carbonate", "Potassium nitrate", "Calcium sulphate"]
  },
  {
    id: "q5",
    text: "What is the pH of a neutral solution?",
    options: ["Less than 7", "Equal to 7", "More than 7", "Equal to 0"]
  }
];

function cleanStudentAnswer(answer) {
  if (!answer || answer === "(No answer found)") return answer;
  let cleaned = answer.trim();
  cleaned = cleaned.replace(/^(q(uestion)?\.?\s*\d+|\(?\d+\)?)\s*[\).\-:]?\s*/i, "").trim();
  return cleaned;
}

function matchesOptionText(line, option) {
  const lineLower = line.toLowerCase();
  const optLower = option.toLowerCase();
  
  let cleanedLine = lineLower.trim();
  cleanedLine = cleanedLine.replace(/^[a-z0-9$gG09S]\s*[\).\-:]\s*/i, "");
  cleanedLine = cleanedLine.replace(/^[^a-z0-9]+/i, "");

  const cleanedOpt = optLower.trim();

  if (cleanedLine === cleanedOpt) return true;

  const stopWords = new Set(["it", "a", "and", "an", "the", "of", "in", "on", "to", "is", "are", "was", "were", "form", "for"]);
  
  const getSignificantWords = (text) => {
    return text
      .split(/[^a-z0-9]/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !stopWords.has(w));
  };

  const optWords = getSignificantWords(cleanedOpt);
  const lineWords = getSignificantWords(cleanedLine);

  if (optWords.length === 0 || lineWords.length === 0) return false;

  const lineWordsSet = new Set(lineWords);
  let matchCount = 0;
  for (const word of optWords) {
    if (lineWordsSet.has(word)) {
      matchCount++;
    }
  }

  const maxWords = Math.max(optWords.length, lineWords.length);
  const matchRatio = matchCount / maxWords;
  if (matchRatio >= 0.7) return true;

  return false;
}

function alignMCQQuestions(allQuestions, lines) {
  const mapping = {};
  const questionMatchLineIdx = new Array(allQuestions.length).fill(-1);
  const matchedLineIndices = new Set();

  const optionIndicatorRegex = /^([$]?\(?[a-dA-D1-4$gG09S]\)?\s*[\).\-:]?|\boption\s+[a-d1-4])(\s|$)/i;

  // Pass 1: Match lines containing explicit option texts
  for (let qIdx = 0; qIdx < allQuestions.length; qIdx++) {
    const q = allQuestions[qIdx];
    if (!q.options || q.options.length === 0) continue;

    let bestLineIdx = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < lines.length; i++) {
      if (matchedLineIndices.has(i)) continue;
      const line = lines[i];

      for (const opt of q.options) {
        if (opt.length < 3) continue;

        if (matchesOptionText(line, opt)) {
          if (opt.length > bestMatchScore) {
            bestMatchScore = opt.length;
            bestLineIdx = i;
          }
        }
      }
    }

    if (bestLineIdx !== -1) {
      mapping[q.id] = lines[bestLineIdx];
      questionMatchLineIdx[qIdx] = bestLineIdx;
      matchedLineIndices.add(bestLineIdx);
    }
  }

  // Pass 2: Align remaining unmatched questions to remaining candidate lines (enforcing order-preservation)
  for (let qIdx = 0; qIdx < allQuestions.length; qIdx++) {
    const q = allQuestions[qIdx];
    if (mapping[q.id]) continue; // Already matched in Pass 1

    let minLineIdx = -1;
    for (let prevIdx = qIdx - 1; prevIdx >= 0; prevIdx--) {
      if (questionMatchLineIdx[prevIdx] !== -1) {
        minLineIdx = questionMatchLineIdx[prevIdx];
        break;
      }
    }

    let maxLineIdx = lines.length;
    for (let nextIdx = qIdx + 1; nextIdx < allQuestions.length; nextIdx++) {
      if (questionMatchLineIdx[nextIdx] !== -1) {
        maxLineIdx = questionMatchLineIdx[nextIdx];
        break;
      }
    }

    const candidates = [];
    for (let i = minLineIdx + 1; i < maxLineIdx; i++) {
      if (matchedLineIndices.has(i)) continue;
      const line = lines[i];

      const cleanLine = line.replace(/^(q(uestion)?\.?\s*\d+|\(?\d+\)?)\s*[\).\-:]?\s*/i, "").trim();
      let isCandidate = optionIndicatorRegex.test(cleanLine);
      if (!isCandidate) {
        for (const targetQ of allQuestions) {
          if (!targetQ.options) continue;
          for (const opt of targetQ.options) {
            if (opt.length >= 3 && matchesOptionText(line, opt)) {
              isCandidate = true;
              break;
            }
          }
          if (isCandidate) break;
        }
      }

      if (isCandidate) {
        candidates.push({ text: line, index: i });
      }
    }

    if (candidates.length > 0) {
      const bestCandidate = candidates[0];
      mapping[q.id] = bestCandidate.text;
      questionMatchLineIdx[qIdx] = bestCandidate.index;
      matchedLineIndices.add(bestCandidate.index);
    } else {
      mapping[q.id] = "(No answer found)";
    }
  }

  return mapping;
}

const lines = [
  "OP",
  "81)",
  "a) Base",
  "(2)",
  "g) Hydrochloric acid",
  "(3)",
  "a) It forms salt and water",
  "84)",
  "a",
  "(5) b)"
];

const aligned = alignMCQQuestions(allQuestions, lines);
console.log("=== RAW ALIGNED ===");
console.log(aligned);

console.log("\n=== CLEANED ALIGNED ===");
const cleaned = {};
for (const k in aligned) {
  cleaned[k] = cleanStudentAnswer(aligned[k]);
}
console.log(cleaned);
