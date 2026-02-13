const readlineSync = require('readline-sync');  // Fixed import
const OpenAI = require("openai");

const OPEN_API_KEY = '';

const client = new OpenAI({
    apiKey: OPEN_API_KEY,
});

function getweatherDetails(city = '') {
    if (city.toLowerCase() === 'patiala') return '10° C';
    if (city.toLowerCase() === 'mohali') return '14° C';
    if (city.toLowerCase() === 'surat') return '40° C';
    if (city.toLowerCase() === 'navsari') return '70° C';
    if (city.toLowerCase() === 'valsad') return '10° C';
}

const tools = {
    getweatherDetails: getweatherDetails
};

const system_prompt = `
You are AI Assistant with START, Plan, Action, Observation and Output state.
Wait for the user prompt and first plan using available tools.
After planning, take the action with appropriate tools and wait for observations based on the actions.
Once you get the observation, return AI response based on start prompt and observation.

Strictly follow the JSON output format as in example.

Available tools:
- function getweatherDetails(city: string): string
getweatherDetails is a function that accepts city name as a string and returns the weather details.

Example:
Start
{"type":"user","user":"What is sum of weather of patiala and Mohali?"}
{"type":"plan","plan":"I will call getweatherDetails for patiala"}
{"type":"action","function":"getweatherDetails","input":"patiala"}
{"type":"observation","observation":"10° C"}

{"type":"plan","plan":"I will call getweatherDetails for mohali"}
{"type":"action","function":"getweatherDetails","input":"mohali"}
{"type":"observation","observation":"14° C"}
{"type":"output","output":"The sum of the weather of patiala and mohali is 24° C"}
`;

const messages = [{ role: 'system', content: system_prompt }];

(async () => {
    while (true) {
        const query = readlineSync.question('>> ');
        const q = {
            type: 'user',
            user: query,
        };
        messages.push({ role: "user", content: JSON.stringify(q) });

        while (true) {
            const chat = await client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                // response_format: "json",  // Corrected format
            });

            const result = chat.choices[0].message.content;
            messages.push({ role: "assistant", content: result });

            console.log(`\n\n------------AI----------------------`);
            console.log(result);
            console.log(`--------------END AI------------------\n\n`);



            const call = JSON.parse(result);

            if (call.type === 'output') {
                console.log(`Boat: ${call.output}`);
                break;
            } else if (call.type === "action") {
                const fn = tools[call.function];
                const observation = fn(call.input);
                const obs = { type: "observation", observation: observation };
                messages.push({ role: 'developer', content: JSON.stringify(obs) });
            }
        }
    }
})();
