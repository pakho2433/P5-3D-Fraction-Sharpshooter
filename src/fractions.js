export const DIFFICULTIES = {
  1: {
    id: 1,
    name: '程度一',
    chinese: '一',
    terms: 2,
    seconds: 60,
    description: '兩個分數加減；答案只是真分數',
    modes: ['proper']
  },
  2: {
    id: 2,
    name: '程度二',
    chinese: '二',
    terms: 3,
    seconds: 90,
    description: '三個分數加減；答案是帶分數',
    modes: ['mixed']
  },
  3: {
    id: 3,
    name: '程度三',
    chinese: '三',
    terms: 3,
    seconds: 90,
    description: '三個分數加減；答案可是真分數、假分數或帶分數',
    modes: ['proper', 'improper', 'mixed']
  }
};

export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

export function fraction(n, d = 1) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const numerator = Math.trunc(n) * sign;
  const denominator = Math.abs(Math.trunc(d));
  const divisor = gcd(numerator, denominator);
  return { n: numerator / divisor, d: denominator / divisor };
}

export function addFractions(a, b) {
  return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function subtractFractions(a, b) {
  return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function sameFraction(a, b) {
  return a.n * b.d === b.n * a.d;
}

export function fractionValue(value) {
  return value.n / value.d;
}

export function isIntegerFraction(value) {
  return value.d === 1;
}

export function isProperFraction(value) {
  return value.n > 0 && value.n < value.d;
}

export function isImproperNonInteger(value) {
  return value.n > value.d && value.d > 1;
}

export function mixedParts(value) {
  const absoluteNumerator = Math.abs(value.n);
  const whole = Math.floor(absoluteNumerator / value.d);
  const remainder = absoluteNumerator % value.d;
  return {
    sign: value.n < 0 ? -1 : 1,
    whole,
    remainder,
    denominator: value.d
  };
}

export function displayModeFor(value, preferredMode = 'auto') {
  if (value.d === 1) return 'integer';
  if (preferredMode === 'mixed' && Math.abs(value.n) > value.d) return 'mixed';
  if (preferredMode === 'improper') return 'improper';
  if (preferredMode === 'proper') return 'proper';
  return Math.abs(value.n) > value.d ? 'improper' : 'proper';
}

export function fractionText(value, preferredMode = 'auto') {
  const mode = displayModeFor(value, preferredMode);
  if (mode === 'integer') return String(value.n);
  if (mode === 'mixed') {
    const parts = mixedParts(value);
    const prefix = parts.sign < 0 ? '-' : '';
    return `${prefix}${parts.whole} ${parts.remainder}/${parts.denominator}`;
  }
  return `${value.n}/${value.d}`;
}

export function fractionHTML(value, preferredMode = 'auto') {
  const mode = displayModeFor(value, preferredMode);
  if (mode === 'integer') {
    return `<span class="whole-number" aria-label="${value.n}">${value.n}</span>`;
  }
  if (mode === 'mixed') {
    const parts = mixedParts(value);
    const prefix = parts.sign < 0 ? '-' : '';
    return `<span class="mixed-number" aria-label="${prefix}${parts.whole} 又 ${parts.denominator} 分之 ${parts.remainder}"><span class="mixed-whole">${prefix}${parts.whole}</span><span class="fraction compact"><span>${parts.remainder}</span><span class="bar"></span><span>${parts.denominator}</span></span></span>`;
  }
  return `<span class="fraction" aria-label="${value.d} 分之 ${value.n}"><span>${value.n}</span><span class="bar"></span><span>${value.d}</span></span>`;
}

export function renderQuestionHTML(question) {
  let html = fractionHTML(question.operands[0], 'proper');
  for (let index = 1; index < question.operands.length; index += 1) {
    html += `<span class="math-operator">${question.operators[index - 1]}</span>${fractionHTML(question.operands[index], 'proper')}`;
  }
  return `${html}<span class="math-operator">=</span><span class="question-mark">?</span>`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProperFraction(maxDenominator) {
  const denominator = randomInt(2, maxDenominator);
  const numerator = randomInt(1, denominator - 1);
  return fraction(numerator, denominator);
}

function evaluate(operands, operators) {
  let result = operands[0];
  for (let index = 1; index < operands.length; index += 1) {
    result = operators[index - 1] === '+'
      ? addFractions(result, operands[index])
      : subtractFractions(result, operands[index]);
  }
  return result;
}

function matchesMode(answer, mode) {
  if (answer.n <= 0) return false;
  if (mode === 'proper') return isProperFraction(answer);
  if (mode === 'mixed' || mode === 'improper') return isImproperNonInteger(answer);
  return false;
}

function chooseOperators(difficulty, targetMode) {
  if (difficulty === 1) return [Math.random() < 0.58 ? '+' : '−'];
  if (targetMode === 'proper') {
    const patterns = [['+', '−'], ['−', '+'], ['+', '−']];
    return patterns[randomInt(0, patterns.length - 1)].slice();
  }
  const patterns = [['+', '+'], ['+', '+'], ['+', '−'], ['−', '+']];
  return patterns[randomInt(0, patterns.length - 1)].slice();
}

function normalizeOperator(operator) {
  return operator === '−' ? '-' : operator;
}

function evaluateDisplayedOperators(operands, operators) {
  return evaluate(operands, operators.map(normalizeOperator));
}

function generateDistractors(answer, mode) {
  const unique = new Map();
  const addCandidate = (candidate) => {
    const simplified = fraction(candidate.n, candidate.d);
    if (simplified.n <= 0 || simplified.n > 80 || simplified.d > 36) return;
    if (sameFraction(simplified, answer)) return;
    if (mode === 'proper' && !isProperFraction(simplified)) return;
    if ((mode === 'mixed' || mode === 'improper') && !isImproperNonInteger(simplified)) return;
    unique.set(`${simplified.n}/${simplified.d}`, simplified);
  };

  const nearby = [
    fraction(answer.n + 1, answer.d),
    fraction(answer.n - 1, answer.d),
    fraction(answer.n + answer.d, answer.d),
    fraction(Math.max(1, answer.n - answer.d), answer.d),
    fraction(answer.n + 1, answer.d + 1),
    fraction(Math.max(1, answer.n - 1), answer.d + 1),
    fraction(answer.n + 2, Math.max(2, answer.d - 1)),
    fraction(answer.n + answer.d + 1, answer.d)
  ];
  nearby.forEach(addCandidate);

  let attempts = 0;
  while (unique.size < 3 && attempts < 800) {
    attempts += 1;
    if (mode === 'proper') {
      const denominator = randomInt(3, Math.max(8, answer.d + 5));
      addCandidate(fraction(randomInt(1, denominator - 1), denominator));
    } else {
      const denominator = randomInt(2, Math.max(8, answer.d + 4));
      const whole = randomInt(1, 5);
      const remainder = randomInt(1, denominator - 1);
      addCandidate(fraction(whole * denominator + remainder, denominator));
    }
  }
  return Array.from(unique.values()).slice(0, 3);
}

function shuffle(items) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function generateQuestion(difficultyId, stage = 1) {
  const config = DIFFICULTIES[difficultyId] || DIFFICULTIES[1];
  const answerMode = config.modes[(stage + randomInt(0, config.modes.length - 1)) % config.modes.length];
  const maxDenominator = Math.min(14, 6 + Math.floor(stage / 2) + difficultyId);
  let operands;
  let operators;
  let answer;

  for (let attempt = 0; attempt < 4000; attempt += 1) {
    operands = Array.from({ length: config.terms }, () => randomProperFraction(maxDenominator));
    operators = chooseOperators(difficultyId, answerMode);
    answer = evaluateDisplayedOperators(operands, operators);
    if (!matchesMode(answer, answerMode)) continue;
    if (answer.n > 60 || answer.d > 30) continue;
    const distractors = generateDistractors(answer, answerMode);
    if (distractors.length < 3) continue;
    return {
      operands,
      operators,
      answer,
      answerMode,
      options: shuffle([answer, ...distractors])
    };
  }

  if (difficultyId === 1) {
    const fallbackAnswer = fraction(5, 6);
    return {
      operands: [fraction(2, 3), fraction(1, 6)],
      operators: ['+'],
      answer: fallbackAnswer,
      answerMode: 'proper',
      options: shuffle([fallbackAnswer, fraction(1, 2), fraction(2, 5), fraction(3, 4)])
    };
  }

  const fallbackAnswer = fraction(13, 6);
  const fallbackMode = difficultyId === 2 ? 'mixed' : answerMode;
  return {
    operands: [fraction(3, 4), fraction(2, 3), fraction(3, 4)],
    operators: ['+', '+'],
    answer: fallbackAnswer,
    answerMode: fallbackMode,
    options: shuffle([fallbackAnswer, fraction(11, 6), fraction(7, 3), fraction(5, 2)])
  };
}
