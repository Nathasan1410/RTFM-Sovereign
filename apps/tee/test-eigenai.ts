
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });

const apiKey = process.env.EIGENAI_API_KEY;
if (!apiKey) {
    console.error("Error: EIGENAI_API_KEY not found in .env.production");
    process.exit(1);
}

const client = new OpenAI({
    baseURL: "https://eigenai-sepolia.eigencloud.xyz/v1",
    apiKey: apiKey,
});

async function testModel(modelName: string) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    const startTime = Date.now();
    try {
        const completion = await client.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Write a short poem about decentralized AI." }
            ],
            max_tokens: 100,
            seed: 42
        });
        const duration = Date.now() - startTime;
        console.log(`Time taken: ${duration}ms`);
        console.log("Response:");
        console.log(completion.choices[0].message.content);
        return { success: true, duration, content: completion.choices[0].message.content };
    } catch (error: any) {
        console.error(`Error testing ${modelName}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log("Starting EigenAI Model Comparison...");
    
    // Test GPT-OSS-120B
    const gptResult = await testModel("gpt-oss-120b-f16");
    
    // Test Qwen3-32B
    const qwenResult = await testModel("qwen3-32b-128k-bf16");

    console.log("\n--- Summary ---");
    if (gptResult.success) console.log(`GPT-OSS-120B: ${gptResult.duration}ms`);
    if (qwenResult.success) console.log(`Qwen3-32B: ${qwenResult.duration}ms`);
    
    if (gptResult.success && qwenResult.success) {
        if (gptResult.duration < qwenResult.duration) {
             console.log("\nRecommendation: GPT-OSS-120B is faster.");
        } else {
             console.log("\nRecommendation: Qwen3-32B is faster.");
        }
        console.log("Note: Speed isn't everything. Check the quality of the poems above.");
    }
}

runTests();
