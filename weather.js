const readlineSync = require('readline-sync');
const OpenAI = require("openai");
const axios = require("axios");

const OPEN_API_KEY = '';
const WEATHER_API_KEY = 'd66b73d13fac35e5e679ba4844d66ea6';
const API_URL = `https://api.openweathermap.org/data/2.5/weather`;

const client = new OpenAI({
    apiKey: OPEN_API_KEY,
});


async function getweatherDetails(city = '') {
    try {
        const url = `${API_URL}?q=${city}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await axios.get(url);

        const cityName = response.data.name;
        const data = response.data.main;
        const visibility = response.data.visibility;
        const wind = response.data.wind;

        let message = `
        The weather in ${cityName} :

        - Temperature       : ${data.temp}° C
        - Feels Like        : ${data.feels_like}° C
        - Min Temperature   : ${data.temp_min}° C
        - Max Temperature   : ${data.temp_max}° C
        - Pressure          : ${data.pressure} hPa
        - Humidity          : ${data.humidity}%
        - Sea Level         : ${data.sea_level ? data.sea_level + " hPa" : "N/A"}
        - Ground Level      : ${data.grnd_level ? data.grnd_level + " hPa" : "N/A"}
        - Visibility        : ${visibility}

        -------------------------------------------------------
        - Wind Information
        - Wind Speed        : ${wind.speed} m/s
        - Wind Direction    : ${wind.deg}°
        - Wind Gust         : ${wind.gust ? wind.gust + " m/s" : "N/A"}
        `.trim();

        // Add advice based on temperature
        if (data.temp <= 15) {
            message += `\n\n🧥 It's cold outside. Consider wearing a jacket.`;
        } else if (data.temp >= 35) {
            message += `\n\n☀️ It's hot today. Stay hydrated!`;
        } else {
            message += `\n\n🌤️ The weather seems pleasant. Enjoy your day!`;
        }

        return message;

    } catch (err) {
        return `❌ Could not fetch weather for "${city}". Please make sure the city name is correct.`;
    }
}

//tool calling
const tools = {   
    getweatherDetails: getweatherDetails
};

// system prompt
const system_prompt = `
You are AI Assistant with START, Plan, Action, Observation and Output state.
Wait for the user prompt and first plan using available tools.
After planning, take the action with appropriate tools and wait for observations based on the actions.
Once you get the observation, return AI response based on start prompt and observation.
Always include the full observation content as the output without changing its formatting or summarizing.


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

//message of system prompt
const messages = [{ role: 'system', content: system_prompt }];

(async () => {
    // condition when the user doesn't end the bot

    while (true) {
        const query = readlineSync.question('>> ');
        const q = {
            type: 'user',
            user: query,
        };
        messages.push({ role: "user", content: JSON.stringify(q) }); // stringfy is for converting to json

        while (true) {
            const chat = await client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
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
                const observation = await fn(call.input);
                const obs = { type: "observation", observation: observation };
                messages.push({ role: 'developer', content: JSON.stringify(obs) });
            }
        }
    }
})();
