const calculatorData = {
    models: [
        { name: "Nova Micro", inputCost: 0.035, outputCost: 0.14, provider: "Amazon" },
        { name: "Nova Lite", inputCost: 0.06, outputCost: 0.24, provider: "Amazon" },
        { name: "Nova Pro", inputCost: 0.8, outputCost: 3.2, provider: "Amazon" },
        { name: "Nova Premier", inputCost: 2.5, outputCost: 12.5, provider: "Amazon" },
        { name: "Llama 3.3 70B", inputCost: 0.72, outputCost: 0.72, provider: "Meta" },
        { name: "Llama 3.1 405B", inputCost: 5.32, outputCost: 16, provider: "Meta" },
        { name: "Claude Haiku 4.5", inputCost: 1, outputCost: 5, provider: "Anthropic" },
        { name: "Claude Sonnet 4.6", inputCost: 3, outputCost: 15, provider: "Anthropic" },
        { name: "Claude Opus 4.7", inputCost: 5, outputCost: 25, provider: "Anthropic" },
        { name: "Mistral Large", inputCost: 4, outputCost: 12, provider: "Mistral" },
        { name: "Command R+", inputCost: 3, outputCost: 15, provider: "Cohere" }
    ],
    categories: [
        { name: "Income", agents: 7, totalTokens: 23444 },
        { name: "Non-Financial", agents: 5, totalTokens: 22087 },
        { name: "Residency/Citizenship", agents: 5, totalTokens: 19919 },
        { name: "Verification/Docs", agents: 5, totalTokens: 18567 },
        { name: "Identity/Household", agents: 4, totalTokens: 16233 },
        { name: "Resources", agents: 5, totalTokens: 15564 },
        { name: "Categorical Det.", agents: 3, totalTokens: 9215 },
        { name: "Deductions", agents: 2, totalTokens: 6434 },
        { name: "Timeliness", agents: 2, totalTokens: 5686 }
    ],
    defaultInputs: {
        monthlyCaseVolume: 6000,
        synthesisInputTokens: 10000,
        synthesisOutputTokens: 4000,
        infrastructureCostPercent: 20
    }
};
// Calculate base agent tokens (matches full naive run)
calculatorData.baseTokensPerCase = calculatorData.categories.reduce((acc, cat) => acc + cat.totalTokens, 0);
