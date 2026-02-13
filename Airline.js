const { GoogleGenerativeAI } = require("@google/generative-ai");
const readlineSync = require("readline-sync");
const axios = require("axios");

const genAI = new GoogleGenerativeAI("AIzaSyDEcZkeKKYqm60gNzv9BfLrZ185q6sMNvY");

// Replace with correct endpoint of your flight API on RapidAPI
const FLIGHT_API_URL = "https://flight-radar1.p.rapidapi.com/airports/list"; // Example
const FLIGHT_API_KEY = "5ea6b812e6msh56ba9527886daaep13aac7jsn249b4c44eac8";

// Define tools/functions for the assistant to call
const tools = {
  getFlightList: async () => {
    try {
      const options = {
        method: "GET",
        url: FLIGHT_API_URL,
        headers: {
          "X-RapidAPI-Key": FLIGHT_API_KEY,
          "X-RapidAPI-Host": "flight-radar1.p.rapidapi.com",
        },
      };
      const response = await axios.request(options);
      return response.data;
    } catch (err) {
      return { error: err.message };
    }
  },
  // Add more tools here like checkSeatAvailability, bookTicket etc.
};

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [],
    });

    const systemPrompt = `
You are an AI Assistant with START, Plan, Action, Observation, and Output stages.
Wait for the user prompt, then:
- PLAN what to do using available tools
- Take ACTION using the tools (defined as JavaScript functions)
- Wait for OBSERVATION
- Then OUTPUT the response

Available tools: getFlightList

Format:
{"type":"user","user":"<user prompt>"}
{"type":"plan","plan":"<your plan>"}
{"type":"action","function":"<function name you're calling>"}
{"type":"observation","observation":"<result of action>"}
{"type":"output","output":"<final answer>"}
`;

    // Start conversation
    let result = await chat.sendMessage(systemPrompt);
    let response = await result.response;
    console.log("Gemini:", response.text());

    while (true) {
      const query = readlineSync.question(">> ");
      const userMsg = { type: "user", user: query };
      result = await chat.sendMessage(JSON.stringify(userMsg));
      response = await result.response;
      const text = response.text();

      console.log("Gemini:", text);

      // Try to detect ACTION stage
      try {
        const parsed = JSON.parse(text);
        if (parsed.type === "action") {
          const fn = tools[parsed.function];
          if (fn) {
            const observation = await fn();
            const obsMsg = {
              type: "observation",
              observation,
            };
            const final = await chat.sendMessage(JSON.stringify(obsMsg));
            console.log("Gemini:", (await 	final.response).text());
          } else {
            console.log("Gemini: Unknown function:", parsed.function);
          }
        }
      } catch (err) {
        // ignore JSON parse errors, probably just a regular output
      }
    }
  } catch (error) {
    console.error("Error generating response:", error);
  }
}

run();
