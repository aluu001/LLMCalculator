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
    const hostedSelector = document.getElementById('hosted-selector');
    
    const inputs = {
        volume: document.getElementById('monthly-case-volume'),
        synInput: document.getElementById('synthesis-input'),
        synOutput: document.getElementById('synthesis-output'),
        infraCost: document.getElementById('infra-cost')
    };

    const outputs = {
        totalMonthly: document.getElementById('total-monthly-cost'),
        costPerCase: document.getElementById('cost-per-case'),
        annualProj: document.getElementById('annual-projection'),
        tokensPerCase: document.getElementById('tokens-per-case'),
        // Hosted Elements
        hostedMonthly: document.getElementById('hosted-monthly-cost'),
        ondemandMonthly: document.getElementById('ondemand-monthly-cost'),
        monthlySavings: document.getElementById('monthly-savings'),
        savingsPercent: document.getElementById('savings-percent'),
        utilizationFill: document.getElementById('utilization-fill'),
        utilizationText: document.getElementById('utilization-text'),
        currentVolStat: document.getElementById('current-volume-stat'),
        breakevenVolStat: document.getElementById('breakeven-volume-stat'),
        recommendationBadge: document.getElementById('recommendation-badge')
    };

    const tables = {
        modelComparison: document.querySelector('#model-comparison-table tbody'),
        categoryUsage: document.querySelector('#category-usage-table tbody')
    };

    // --- Chart Instances ---
    let pieChart, barChart, lineChart, hostedCompChart;

    // --- Formatting Utils ---
    const formatMoney = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    function init() {
        // Populate Models
        calculatorData.models.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${m.name} (${m.provider})`;
            if (m.name === "Nova Micro") opt.selected = true;
            modelSelector.appendChild(opt);
        });

        // Populate Hosted Models
        calculatorData.hostedModels.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m.name;
            if (m.name === "OpenAI") opt.selected = true;
            hostedSelector.appendChild(opt);
        });

        initCharts();

        // Event Listeners (Global updates)
        modelSelector.addEventListener('change', calculate);
        hostedSelector.addEventListener('change', calculate);
        Object.values(inputs).forEach(input => input.addEventListener('input', calculate));

        calculate();
    }

    function initCharts() {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#4a5568';

        // Pie Chart
        pieChart = new Chart(document.getElementById('costPieChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Input Tokens', 'Output Tokens', 'Infrastructure'],
                datasets: [{ data: [0, 0, 0], backgroundColor: [pcgColors.magenta, pcgColors.yellow, pcgColors.skyBlue], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // Bar Chart
        barChart = new Chart(document.getElementById('modelBarChart').getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Annual Cost', data: [], backgroundColor: pcgColors.blue, borderRadius: 4 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' } } }, plugins: { legend: { display: false } } }
        });

        // Line Chart
        lineChart = new Chart(document.getElementById('cumulativeLineChart').getContext('2d'), {
            type: 'line',
            data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' } } } }
        });

        // Hosted vs On-Demand Comparison Chart
        hostedCompChart = new Chart(document.getElementById('hostedComparisonChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Monthly Cost Comparison'],
                datasets: [
                    { label: 'Hosted Cost', data: [0], backgroundColor: pcgColors.magenta, borderRadius: 6 },
                    { label: 'On-Demand Cost', data: [0], backgroundColor: pcgColors.appleGreen, borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' } }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function getModelCost(model, vol, synIn, synOut, infraPct) {
        const scenarioBaseTokens = calculatorData.baseTokensPerCase; 
        const inputRatio = 0.85; const outputRatio = 0.15;
        const agentInputTokens = scenarioBaseTokens * inputRatio;
        const agentOutputTokens = scenarioBaseTokens * outputRatio;

        const totalInputTokensPerCase = agentInputTokens + synIn;
        const totalOutputTokensPerCase = agentOutputTokens + synOut;

        const inputCost = (totalInputTokensPerCase * vol / 1000000) * model.inputCost;
        const outputCost = (totalOutputTokensPerCase * vol / 1000000) * model.outputCost;
        
        const modelMonthlyCost = inputCost + outputCost;
        const infraMonthlyCost = modelMonthlyCost * infraPct;
        const totalMonthlyCost = modelMonthlyCost + infraMonthlyCost;

        return { totalMonthlyCost, inputCost, outputCost, infraMonthlyCost, totalTokensPerCase: totalInputTokensPerCase + totalOutputTokensPerCase };
    }

    function calculate() {
        // --- 1. Global Inputs ---
        const selectedModel = calculatorData.models[modelSelector.value];
        const selectedHosted = calculatorData.hostedModels[hostedSelector.value];
        
        const vol = parseFloat(inputs.volume.value) || 0;
        const synIn = parseFloat(inputs.synInput.value) || 0;
        const synOut = parseFloat(inputs.synOutput.value) || 0;
        const infraPct = (parseFloat(inputs.infraCost.value) || 0) / 100;

        // --- 2. Executive Dashboard Math ---
        const metrics = getModelCost(selectedModel, vol, synIn, synOut, infraPct);
        const costPerCase = metrics.totalMonthlyCost / (vol || 1);

        outputs.totalMonthly.textContent = formatMoney(metrics.totalMonthlyCost);
        outputs.costPerCase.textContent = formatMoney(costPerCase);
        outputs.annualProj.textContent = formatMoney(metrics.totalMonthlyCost * 12);
        outputs.tokensPerCase.textContent = formatNumber(Math.round(metrics.totalTokensPerCase));

        // --- 3. Hosted vs On-Demand Math ---
        // Hosted Monthly = (Cost per min * 43200) + Storage Cost
        const hostedMonthlyCost = (selectedHosted.costPerMin * 43200) + selectedHosted.storageCost;
        const onDemandMonthlyCost = metrics.totalMonthlyCost;
        
        const savings = hostedMonthlyCost - onDemandMonthlyCost;
        const savingsPct = savings > 0 ? (savings / hostedMonthlyCost) * 100 : 0;
        
        const breakEvenVolume = costPerCase > 0 ? hostedMonthlyCost / costPerCase : 0;
        const utilizationRate = breakEvenVolume > 0 ? (vol / breakEvenVolume) * 100 : 0;

        // Update Hosted UI
        outputs.hostedMonthly.textContent = formatMoney(hostedMonthlyCost);
        outputs.ondemandMonthly.textContent = formatMoney(onDemandMonthlyCost);
        outputs.monthlySavings.textContent = savings > 0 ? formatMoney(savings) : '$0.00';
        outputs.savingsPercent.textContent = savings > 0 ? savingsPct.toFixed(1) + '%' : '0%';
        
        // Update Gauge
        let fillPct = utilizationRate > 100 ? 100 : utilizationRate;
        outputs.utilizationFill.style.width = fillPct + '%';
        outputs.utilizationText.textContent = utilizationRate.toFixed(1) + '% Utilized';
        outputs.currentVolStat.textContent = formatNumber(vol);
        outputs.breakevenVolStat.textContent = formatNumber(Math.round(breakEvenVolume));

        if (savings > 0) {
            outputs.recommendationBadge.textContent = "ON-DEMAND RECOMMENDED";
            outputs.recommendationBadge.style.background = pcgColors.appleGreen;
        } else {
            outputs.recommendationBadge.textContent = "HOSTED RECOMMENDED";
            outputs.recommendationBadge.style.background = pcgColors.magenta;
        }

        // --- 4. Chart Updates ---
        pieChart.data.datasets[0].data = [metrics.inputCost, metrics.outputCost, metrics.infraMonthlyCost];
        pieChart.update();

        const allModelCosts = calculatorData.models.map(m => {
            const mMetrics = getModelCost(m, vol, synIn, synOut, infraPct);
            return { name: m.name, monthly: mMetrics.totalMonthlyCost, annual: mMetrics.totalMonthlyCost * 12, inputRate: m.inputCost, outputRate: m.outputCost };
        });

        const sortedModels = [...allModelCosts].sort((a, b) => a.annual - b.annual);
        barChart.data.labels = sortedModels.map(m => m.name);
        barChart.data.datasets[0].data = sortedModels.map(m => m.annual);
        barChart.data.datasets[0].backgroundColor = sortedModels.map(m => m.name === selectedModel.name ? pcgColors.skyBlue : pcgColors.blue);
        barChart.update();

        lineChart.data.datasets = allModelCosts.map((m, idx) => {
            const data = [];
            let cumulative = 0;
            for(let i=1; i<=12; i++) {
                cumulative += m.monthly;
                data.push(cumulative);
            }
            return {
                label: m.name, data: data, borderColor: colorPalette[idx % colorPalette.length],
                backgroundColor: 'transparent', borderWidth: m.name === selectedModel.name ? 3 : 1.5, tension: 0.1, pointRadius: 0
            };
        });
        lineChart.update();

        // Update Hosted Comparison Chart
        hostedCompChart.data.datasets[0].data = [hostedMonthlyCost];
        hostedCompChart.data.datasets[0].label = `Hosted (${selectedHosted.name})`;
        hostedCompChart.data.datasets[1].data = [onDemandMonthlyCost];
        hostedCompChart.data.datasets[1].label = `On-Demand (${selectedModel.name})`;
        hostedCompChart.update();

        // --- 5. Data Tables ---
        tables.modelComparison.innerHTML = '';
        allModelCosts.forEach(m => {
            const tr = document.createElement('tr');
            if(m.name === selectedModel.name) { tr.style.fontWeight = '800'; tr.style.backgroundColor = 'rgba(0, 160, 202, 0.05)'; }
            tr.innerHTML = `<td>${m.name}</td><td>$${m.inputRate.toFixed(3)}</td><td>$${m.outputRate.toFixed(3)}</td><td>${formatMoney(m.monthly)}</td>`;
            tables.modelComparison.appendChild(tr);
        });

        tables.categoryUsage.innerHTML = '';
        calculatorData.categories.forEach(cat => {
            const pct = (cat.totalTokens / calculatorData.baseTokensPerCase) * 100;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${cat.name}</td><td>${cat.agents}</td><td>${formatNumber(cat.totalTokens)}</td><td>${pct.toFixed(1)}%</td>`;
            tables.categoryUsage.appendChild(tr);
        });
    }

    init();
});
