const regex = /(?:score|rating)["']?\s*[:=\-]?\s*["']?\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/i;
console.log(regex.exec('{"score": 10,\n"reasoning": "..."'));
console.log(regex.exec('**Score:** 8/10'));
console.log(regex.exec('Score = 5.5'));
console.log(regex.exec('{"Score": "10"}'));
