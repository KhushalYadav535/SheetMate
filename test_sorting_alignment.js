const allQuestions = [
  {
    id: "q1",
    text: "What is the main purpose of sorting materials into groups?",
    options: [
      "To know the uses of materials",
      "To know the properties of materials",
      "To make it easier to find things",
      "To know the cost of materials in ₹"
    ]
  },
  {
    id: "q2",
    text: "Which of the following groups of materials is not based on a property?",
    options: [
      "Metals and non-metals",
      "Solids, liquids and gases",
      "Toys and clothes",
      "Natural and synthetic materials"
    ]
  },
  {
    id: "q3",
    text: "What is the difference between a metal and a non-metal?",
    options: [
      "Metals are hard, non-metals are soft",
      "Metals are brittle, non-metals are not brittle",
      "Metals are sonorous, non-metals are not sonorous",
      "Metals are ductile, non-metals are not ductile"
    ]
  },
  {
    id: "q4",
    text: "Which of the following materials is a natural fiber?",
    options: [
      "Cotton",
      "Polyester",
      "Nylon",
      "Rayon"
    ]
  },
  {
    id: "q5",
    text: "What is the purpose of separating materials into solids, liquids and gases?",
    options: [
      "To know their uses",
      "To know their properties",
      "To know their costs in ₹",
      "To know their advantages and disadvantages"
    ]
  },
  {
    id: "q6",
    text: "Which of the following materials is an example of a synthetic material?",
    options: [
      "Wood",
      "Plastic",
      "Cotton",
      "Jute"
    ]
  },
  {
    id: "q7",
    text: "Why do we need to sort materials into groups?",
    options: [
      "To make it easier to find things",
      "To know the uses of materials",
      "To know the properties of materials",
      "All of the above"
    ]
  }
];

function isWordSimilar(w1, w2) {
  if (w1 === w2) return true;
  if (Math.abs(w1.length - w2.length) > 3) return false;
  
  const track = Array(w2.length + 1).fill(null).map(() => Array(w1.length + 1).fill(null));
  for (let i = 0; i <= w1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= w2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= w2.length; j += 1) {
    for (let i = 1; i <= w1.length; i += 1) {
      const indicator = w1[i - 1] === w2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = track[w2.length][w1.length];
  const maxLength = Math.max(w1.length, w2.length);
  const similarity = 1 - (distance / maxLength);
  return similarity >= 0.6; // 60% similarity
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

  let matchCount = 0;
  for (const optWord of optWords) {
    let wordMatched = false;
    for (const lineWord of lineWords) {
      if (isWordSimilar(optWord, lineWord)) {
        wordMatched = true;
        break;
      }
    }
    if (wordMatched) {
      matchCount++;
    }
  }

  const maxWords = Math.max(optWords.length, lineWords.length);
  const matchRatio = matchCount / maxWords;
  if (matchRatio >= 0.5) return true; // Lowered to 0.5 to allow partial spelling matches

  return false;
}

function alignMCQQuestions(allQuestions, lines) {
  const mapping = {};
  const questionMatchLineIdx = new Array(allQuestions.length).fill(-1);
  const matchedLineIndices = new Set();

  const optionIndicatorRegex = /^([$]?\(?[a-dA-D1-4$gG09S]\)?[)\uFF09]?\s*[\).\-:\uFF09]?|\boption\s+[a-d1-4])(\s|$)/i;

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
    console.log(`\nPass 2 for ${q.id}: checking lines from ${minLineIdx + 1} to ${maxLineIdx - 1}`);
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

      console.log(`Line ${i} "${line}": isCandidate = ${isCandidate}`);
      if (isCandidate) {
        candidates.push({ text: line, index: i });
      }
    }

    if (candidates.length > 0) {
      const bestCandidate = candidates[0];
      mapping[q.id] = bestCandidate.text;
      questionMatchLineIdx[qIdx] = bestCandidate.index;
      matchedLineIndices.add(bestCandidate.index);
      console.log(`Matched ${q.id} to "${bestCandidate.text}" (index ${bestCandidate.index})`);
    } else {
      mapping[q.id] = "(No answer found)";
    }
  }

  return mapping;
}

const lines = [
  "P",
  "81)",
  ")To fonew fraferties of malerials",
  "#2",
  "c) Togs & clothes",
  "03",
  "d\uff09",
  "84)",
  "b) Polyster",
  "(85)",
  "To know ther froferters",
  "06",
  "( (28)"
];

console.log("=== ALIGNED RESULTS ===");
console.log(alignMCQQuestions(allQuestions, lines));
