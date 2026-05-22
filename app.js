document.addEventListener('DOMContentLoaded', () => {
    // --- PCG Colors for Charts ---
    const pcgColors = {
        yellow: 'rgb(250, 184, 31)',
        blue: 'rgb(11, 54, 119)',
        skyBlue: 'rgb(0, 160, 202)',
        magenta: 'rgb(161, 27, 126)',
        appleGreen: 'rgb(0, 204, 102)',
        candyRed: 'rgb(238, 35, 70)',
        gray: '#cbd5e1'
    };

    const colorPalette = [
        pcgColors.blue, pcgColors.skyBlue, pcgColors.yellow, 
        pcgColors.magenta, pcgColors.appleGreen, pcgColors.candyRed,
        '#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'
    ];

    // --- Tab Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // --- DOM Elements ---
    const modelSelector = document.getElementById('model-selector');
    const inputs = {
        volume: document.getElementById('monthly-case-volume'),
        agents: document.getElementById('num-agents'),
        synInput: document.getElementById('synthesis-input'),
        synOutput: document.getElementById('synthesis-output'),
        infraCost: document.getElementById('infra-cost')
    };

    const outputs = {
        totalMonthly: document.getElementById('total-monthly-cost'),
        costPerCase: document.getElementById('cost-per-case'),
        annualProj: document.getElementById('annual-projection'),
        tokensPerCase: document.getElementById('tokens-per-case')
    };

    const tables = {
        modelComparison: document.querySelector('#model-comparison-table tbody'),
        categoryUsage: document.querySelector('#category-usage-table tbody')
    };

    // --- Chart Instances ---
    let pieChart, barChart, lineChart;

    // --- Formatting Utils ---
    const formatMoney = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    function init() {
        // Populate Models
        calculatorData.models.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${m.name} (${m.provider})`;
            if (m.name === "Claude Sonnet 4.6") opt.selected = true;
            modelSelector.appendChild(opt);
        });

        // Initialize Charts with empty data
        initCharts();

        // Event Listeners
        modelSelector.addEventListener('change', calculate);
        Object.values(inputs).forEach(input => input.addEventListener('input', calculate));

        // Initial Calculation
        calculate();
    }

    function initCharts() {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#4a5568';

        // Pie Chart
        const pieCtx = document.getElementById('costPieChart').getContext('2d');
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Input Tokens', 'Output Tokens', 'Infrastructure'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [pcgColors.magenta, pcgColors.yellow, pcgColors.skyBlue],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Bar Chart
        const barCtx = document.getElementById('modelBarChart').getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Annual Cost',
                    data: [],
                    backgroundColor: pcgColors.blue,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Line Chart
        const lineCtx = document.getElementById('cumulativeLineChart').getContext('2d');
        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' } }
                }
            }
        });
    }

    function getModelCost(model, vol, synIn, synOut, infraPct) {
        const scenarioBaseTokens = calculatorData.baseTokensPerCase; 
        const inputRatio = 0.85;
        const outputRatio = 0.15;
        const agentInputTokens = scenarioBaseTokens * inputRatio;
        const agentOutputTokens = scenarioBaseTokens * outputRatio;

        const totalInputTokensPerCase = agentInputTokens + synIn;
        const totalOutputTokensPerCase = agentOutputTokens + synOut;

        const inputCost = (totalInputTokensPerCase * vol / 1000000) * model.inputCost;
        const outputCost = (totalOutputTokensPerCase * vol / 1000000) * model.outputCost;
        
        const modelMonthlyCost = inputCost + outputCost;
        const infraMonthlyCost = modelMonthlyCost * infraPct;
        const totalMonthlyCost = modelMonthlyCost + infraMonthlyCost;

        return {
            totalMonthlyCost,
            inputCost,
            outputCost,
            infraMonthlyCost,
            totalTokensPerCase: totalInputTokensPerCase + totalOutputTokensPerCase
        };
    }

    function calculate() {
        const selectedModelIndex = modelSelector.value;
        const selectedModel = calculatorData.models[selectedModelIndex];
        
        const vol = parseFloat(inputs.volume.value) || 0;
        const synIn = parseFloat(inputs.synInput.value) || 0;
        const synOut = parseFloat(inputs.synOutput.value) || 0;
        const infraPct = (parseFloat(inputs.infraCost.value) || 0) / 100;

        const metrics = getModelCost(selectedModel, vol, synIn, synOut, infraPct);

        // Update Dashboard Metrics
        outputs.totalMonthly.textContent = formatMoney(metrics.totalMonthlyCost);
        outputs.costPerCase.textContent = formatMoney(metrics.totalMonthlyCost / (vol || 1));
        outputs.annualProj.textContent = formatMoney(metrics.totalMonthlyCost * 12);
        outputs.tokensPerCase.textContent = formatNumber(Math.round(metrics.totalTokensPerCase));

        // --- Update Charts ---
        
        // 1. Pie Chart
        pieChart.data.datasets[0].data = [metrics.inputCost, metrics.outputCost, metrics.infraMonthlyCost];
        pieChart.update();

        // 2. Bar Chart & Line Chart setup
        const allModelCosts = calculatorData.models.map(m => {
            const mMetrics = getModelCost(m, vol, synIn, synOut, infraPct);
            return { name: m.name, monthly: mMetrics.totalMonthlyCost, annual: mMetrics.totalMonthlyCost * 12, inputRate: m.inputCost, outputRate: m.outputCost };
        });

        // Sort by Annual Cost Ascending for Bar Chart
        const sortedModels = [...allModelCosts].sort((a, b) => a.annual - b.annual);
        
        barChart.data.labels = sortedModels.map(m => m.name);
        barChart.data.datasets[0].data = sortedModels.map(m => m.annual);
        // Highlight selected model in Bar Chart
        barChart.data.datasets[0].backgroundColor = sortedModels.map(m => 
            m.name === selectedModel.name ? pcgColors.skyBlue : pcgColors.blue
        );
        barChart.update();

        // 3. Line Chart
        lineChart.data.datasets = allModelCosts.map((m, idx) => {
            const data = [];
            let cumulative = 0;
            for(let i=1; i<=12; i++) {
                cumulative += m.monthly;
                data.push(cumulative);
            }
            return {
                label: m.name,
                data: data,
                borderColor: colorPalette[idx % colorPalette.length],
                backgroundColor: 'transparent',
                borderWidth: m.name === selectedModel.name ? 3 : 1.5,
                tension: 0.1,
                pointRadius: 0
            };
        });
        lineChart.update();

        // --- Update Data Tables ---

        // Model Comparison Table
        tables.modelComparison.innerHTML = '';
        allModelCosts.forEach(m => {
            const tr = document.createElement('tr');
            if(m.name === selectedModel.name) {
                tr.style.fontWeight = '700';
                tr.style.backgroundColor = 'rgba(0, 160, 202, 0.05)';
            }
            tr.innerHTML = `
                <td>${m.name}</td>
                <td>$${m.inputRate.toFixed(3)}</td>
                <td>$${m.outputRate.toFixed(3)}</td>
                <td>${formatMoney(m.monthly)}</td>
            `;
            tables.modelComparison.appendChild(tr);
        });

        // Category Token Usage Table
        tables.categoryUsage.innerHTML = '';
        const totalBase = calculatorData.baseTokensPerCase;
        calculatorData.categories.forEach(cat => {
            const pct = (cat.totalTokens / totalBase) * 100;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cat.name}</td>
                <td>${cat.agents}</td>
                <td>${formatNumber(cat.totalTokens)}</td>
                <td>${pct.toFixed(1)}%</td>
            `;
            tables.categoryUsage.appendChild(tr);
        });
    }

    init();
});
