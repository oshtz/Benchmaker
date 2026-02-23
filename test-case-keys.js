const regex = /(?:score|rating)\s*[:=\-]?\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/i;
console.log(regex.exec('{"Score": 10}'));
console.log(regex.exec('{"score": 10}'));
console.log(regex.exec('{"rating": 8}'));
console.log(regex.exec('{"Score": "10"}'));
