// Quiz questions. `answer` is the index of the correct option
// (in the order written in the translation files: quiz.<id>.options).
// `level` controls difficulty: 1 = easy, 2 = medium, 3 = tricky.
// The question, options and explanation are translated text.
import { localize } from '../translations/index.js';

export const QUIZZES = [
  { id: 'q1', level: 1, answer: 0 },
  { id: 'q2', level: 1, answer: 1 },
  { id: 'q3', level: 1, answer: 2 },
  { id: 'q4', level: 1, answer: 0 },
  { id: 'q5', level: 1, answer: 1 },
  { id: 'q6', level: 1, answer: 1 },
  { id: 'q7', level: 1, answer: 1 },
  { id: 'q8', level: 2, answer: 0 },
  { id: 'q9', level: 2, answer: 1 },
  { id: 'q10', level: 2, answer: 0 },
  { id: 'q11', level: 2, answer: 0 },
  { id: 'q12', level: 2, answer: 1 },
  { id: 'q13', level: 2, answer: 0 },
  { id: 'q14', level: 2, answer: 1 },
  { id: 'q15', level: 2, answer: 0 },
  { id: 'q16', level: 3, answer: 0 },
  { id: 'q17', level: 3, answer: 1 },
  { id: 'q18', level: 3, answer: 1 },
  { id: 'q19', level: 3, answer: 0 },
  { id: 'q20', level: 3, answer: 0 },
  { id: 'q21', level: 3, answer: 0 },
  { id: 'q22', level: 3, answer: 0 },
  { id: 'q23', level: 3, answer: 0 },
  { id: 'q24', level: 1, answer: 1 },
  { id: 'q25', level: 2, answer: 0 },
];

QUIZZES.forEach((q) => localize(q, `quiz.${q.id}`, ['q', 'options', 'explain']));
