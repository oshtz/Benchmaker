const regex = /(?:score|rating)[\s*"':=\-]*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/i;
const cases = [
  '{"score": 10}',
  '{"Score": "9.5"}',
  '**Score:** 8/10',
  '**Score**: 7',
  'Score: 6 / 10',
  'rating = 5',
  'Score - 4.5',
  'Score 3',
  'rating:"2"',
  'Score:** 1',
];
cases.forEach(c => {
  const m = regex.exec(c);
  console.log(`${c} -> ${m ? m[1] : 'null'}`);
});
