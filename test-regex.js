const str = "Based on {this}:\n```\n{\"score\": 10}\n```";
console.log(str.match(/```(?:json)?\s*([\s\S]*?)```/i));
