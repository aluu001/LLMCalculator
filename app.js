document.addEventListener('DOMContentLoaded', () => {
    // --- PCG Colors for Charts ---
    const pcgColors = {
        yellow: 'rgb(250, 184, 31)',
        blue: 'rgb(11, 54, 119)',
        skyBlue: 'rgb(0, 160, 202)',
        magenta: 'rgb(161, 27, 126)',
        appleGreen: 'rgb(0, 204, 102)',
        candyRed: 'rgb(238, 35, 70)'
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

    // --- Mode Toggle ---
    const modeCompareBtn = document.getElementById('mode-compare');
    const modeSingleBtn = document.getElementById('mode-single');

    modeCompareBtn.addEventListener('click', () => {
        modeCompareBtn.classList.add('active');
        modeSingleBtn.classList.remove('active');
        document.body.classList.remove('single-mode');
    });

    modeSingleBtn.addEventListener('click', () => {
        modeSingleBtn.classList.add('active');
        modeCompareBtn.classList.remove('active');
        document.body.classList.add('single-mode');
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
        ondemandAnnual: document.getElementById('ondemand-annual-cost'),
        ondemandMonthly: document.getElementById('ondemand-monthly-cost'),
        hostedAnnual: document.getElementById('hosted-annual-cost'),
        hostedMonthly: document.getElementById('hosted-monthly-cost'),
        annualSavings: document.getElementById('annual-savings'),
        savingsPercent: document.getElementById('savings-percent'),
        breakevenVolStat: document.getElementById('breakeven-volume-stat'),
        utilizationText: document.getElementById('utilization-text'),
        recommendationBadge: document.getElementById('recommendation-badge'),
        
        // Single Mode Outputs
        singleAnnual: document.getElementById('single-annual-cost'),
        singleMonthly: document.getElementById('single-monthly-cost'),
        singleCostPerCase: document.getElementById('single-cost-per-case'),
        singleVolume: document.getElementById('single-volume')
    };

    const tables = {
        modelComparison: document.querySelector('#model-comparison-table tbody'),
        hostedComparison: document.querySelector('#hosted-comparison-table tbody'),
        categoryUsage: document.querySelector('#category-usage-table tbody')
    };

    // --- Chart Instances ---
    let intersectionChart, pieChart;
    let radarChart, polarChart;

    // --- Formatting Utils ---
    const formatMoney = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    function init() {
        calculatorData.models.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${m.name} (${m.provider})`;
            if (m.name === "Nova Micro") opt.selected = true;
            modelSelector.appendChild(opt);
        });

        calculatorData.hostedModels.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m.name;
            if (m.name === "OpenAI") opt.selected = true;
            hostedSelector.appendChild(opt);
        });

        initCharts();

        modelSelector.addEventListener('change', calculate);
        hostedSelector.addEventListener('change', calculate);
        Object.values(inputs).forEach(input => input.addEventListener('input', calculate));

        calculate();
    }

    function initCharts() {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#525f7f';
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }

        // 1. Master Intersection Area Chart
        intersectionChart = new Chart(document.getElementById('intersectionChart').getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: {
                    datalabels: { display: false },
                    legend: { position: 'top', labels: { font: { family: "'Outfit', sans-serif", weight: 'bold' } } },
                    tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + formatMoney(c.raw) } }
                },
                scales: {
                    x: { title: { display: true, text: 'Monthly Case Volume', font: { weight: 'bold' } } },
                    y: { beginAtZero: true, ticks: { callback: (val) => '$' + (val/1000).toFixed(0) + 'k' }, title: { display: true, text: 'Total Monthly Cost', font: { weight: 'bold' } } }
                }
            }
        });

        // 2. Pie Chart (On-Demand Cost Breakdown)
        pieChart = new Chart(document.getElementById('costPieChart').getContext('2d'), {
            type: 'doughnut',
            data: { 
                labels: ['Input', 'Output', 'Infra'], 
                datasets: [{ 
                    data: [0, 0, 0], 
                    backgroundColor: [pcgColors.magenta, pcgColors.yellow, pcgColors.skyBlue], 
                    borderWidth: 2, borderColor: '#ffffff', borderRadius: 4
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { padding: 10, boxWidth: 10, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } },
                    datalabels: {
                        color: '#ffffff',
                        font: { weight: '800', size: 13, family: "'Outfit', sans-serif" },
                        formatter: (value) => {
                            if (value < 1) return '';
                            if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return '$' + Math.round(value / 1000) + 'k';
                            return '$' + Math.round(value);
                        }
                    }
                }, 
                cutout: '65%',
                layout: { padding: 10 }
            }
        });

        // 3. Radar Chart
        radarChart = new Chart(document.getElementById('radarChart').getContext('2d'), {
            type: 'radar',
            data: { labels: ['Monthly Cost', 'Fixed Hardware', 'Infra Burden', 'Scaling Cost'], datasets: [] },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: 20 },
                scales: { 
                    r: { 
                        angleLines: { color: 'rgba(0,0,0,0.1)' }, 
                        grid: { color: 'rgba(0,0,0,0.05)' }, 
                        pointLabels: { font: { size: 10, weight: 'bold', family: "'Inter', sans-serif" } }, 
                        ticks: { display: false, backdropPadding: 0 } 
                    } 
                },
                plugins: { 
                    datalabels: { display: false },
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } 
                }
            }
        });

        // 4. Polar Area Chart
        polarChart = new Chart(document.getElementById('polarChart').getContext('2d'), {
            type: 'polarArea',
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { 
                    datalabels: { display: false },
                    legend: { position: 'right' } 
                }, 
                scales: { r: { ticks: { display: false } } } 
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

        return { totalMonthlyCost, inputCost, outputCost, infraMonthlyCost, costPerCase: totalMonthlyCost / (vol || 1) };
    }

    function calculate() {
        const selectedModel = calculatorData.models[modelSelector.value];
        const selectedHosted = calculatorData.hostedModels[hostedSelector.value];
        
        const vol = parseFloat(inputs.volume.value) || 0;
        const synIn = parseFloat(inputs.synInput.value) || 0;
        const synOut = parseFloat(inputs.synOutput.value) || 0;
        const infraPct = (parseFloat(inputs.infraCost.value) || 0) / 100;

        // --- Core Math ---
        const metrics = getModelCost(selectedModel, vol, synIn, synOut, infraPct);
        const onDemandMonthly = metrics.totalMonthlyCost;
        const onDemandAnnual = onDemandMonthly * 12;
        const costPerCase = metrics.costPerCase;

        const hostedMonthlyCost = (selectedHosted.costPerMin * 43200) + selectedHosted.storageCost;
        const hostedAnnualCost = hostedMonthlyCost * 12;
        
        const annualSavings = hostedAnnualCost - onDemandAnnual;
        const savingsPct = annualSavings > 0 ? (annualSavings / hostedAnnualCost) * 100 : 0;
        
        const breakEvenVolume = costPerCase > 0 ? hostedMonthlyCost / costPerCase : 0;
        const utilizationRate = breakEvenVolume > 0 ? (vol / breakEvenVolume) * 100 : 0;

        // --- Update UI Hero Cards (Compare Mode) ---
        outputs.ondemandAnnual.textContent = formatMoney(onDemandAnnual);
        outputs.ondemandMonthly.textContent = `(${formatMoney(onDemandMonthly)} / month)`;

        outputs.hostedAnnual.textContent = formatMoney(hostedAnnualCost);
        outputs.hostedMonthly.textContent = `(${formatMoney(hostedMonthlyCost)} / month)`;

        if(annualSavings > 0) {
            outputs.annualSavings.textContent = formatMoney(annualSavings);
            outputs.savingsPercent.textContent = `+${savingsPct.toFixed(1)}% margin improvement`;
            outputs.annualSavings.style.color = pcgColors.appleGreen;
            outputs.savingsPercent.style.color = pcgColors.appleGreen;
        } else {
            outputs.annualSavings.textContent = '-' + formatMoney(Math.abs(annualSavings));
            outputs.savingsPercent.textContent = `-${Math.abs(savingsPct).toFixed(1)}% margin impact`;
            outputs.annualSavings.style.color = pcgColors.candyRed;
            outputs.savingsPercent.style.color = pcgColors.candyRed;
        }

        outputs.breakevenVolStat.textContent = formatNumber(Math.round(breakEvenVolume)) + ' cases';
        outputs.utilizationText.textContent = `${utilizationRate.toFixed(1)}% Current Utilization`;

        // Banner
        if (annualSavings > 0) {
            outputs.recommendationBadge.textContent = "RECOMMENDATION: USE ON-DEMAND";
            outputs.recommendationBadge.style.background = `linear-gradient(90deg, ${pcgColors.appleGreen}, #10b981)`;
            outputs.recommendationBadge.style.boxShadow = `0 4px 15px rgba(0, 204, 102, 0.3)`;
        } else {
            outputs.recommendationBadge.textContent = "RECOMMENDATION: USE HOSTED";
            outputs.recommendationBadge.style.background = `linear-gradient(90deg, ${pcgColors.magenta}, #d946ef)`;
            outputs.recommendationBadge.style.boxShadow = `0 4px 15px rgba(161, 27, 126, 0.3)`;
        }

        // --- Update UI Hero Cards (Single Mode) ---
        outputs.singleAnnual.textContent = formatMoney(onDemandAnnual);
        outputs.singleMonthly.textContent = formatMoney(onDemandMonthly);
        outputs.singleCostPerCase.textContent = formatMoney(costPerCase);
        outputs.singleVolume.textContent = formatNumber(vol);

        // --- Charts Update ---
        const maxX = Math.max(breakEvenVolume * 2.5, vol * 2.5, 1000); // Extended lengthwise
        const step = Math.round(maxX / 20);
        const labels = [], onDemandData = [], hostedData = [];

        for (let x = 0; x <= maxX; x += step) {
            labels.push(formatNumber(x));
            onDemandData.push(x * costPerCase);
            hostedData.push(hostedMonthlyCost);
        }

        intersectionChart.data.labels = labels;
        intersectionChart.data.datasets = [
            { label: `On-Demand Cost (${selectedModel.name})`, data: onDemandData, borderColor: pcgColors.appleGreen, backgroundColor: 'rgba(0, 204, 102, 0.1)', borderWidth: 3, tension: 0, fill: { target: 1, above: 'rgba(161, 27, 126, 0.2)', below: 'rgba(0, 204, 102, 0.2)' }, pointRadius: 0, pointHitRadius: 10 },
            { label: `Hosted Fixed Cost (${selectedHosted.name})`, data: hostedData, borderColor: pcgColors.magenta, borderWidth: 3, borderDash: [5, 5], tension: 0, fill: false, pointRadius: 0, pointHitRadius: 10 }
        ];
        intersectionChart.update();

        pieChart.data.datasets[0].data = [metrics.inputCost, metrics.outputCost, metrics.infraMonthlyCost];
        pieChart.update();

        const allModelCosts = calculatorData.models.map(m => {
            const mMetrics = getModelCost(m, vol, synIn, synOut, infraPct);
            return { name: m.name, monthly: mMetrics.totalMonthlyCost, annual: mMetrics.totalMonthlyCost * 12, inputRate: m.inputCost, outputRate: m.outputCost };
        });

        // Radar Chart (Normalized data to form a shape)
        const maxMonthly = Math.max(onDemandMonthly, hostedMonthlyCost);
        radarChart.data.datasets = [
            { label: `On-Demand (${selectedModel.name})`, data: [(onDemandMonthly/maxMonthly)*100, 0, 100, 100], backgroundColor: 'rgba(0, 204, 102, 0.3)', borderColor: pcgColors.appleGreen, borderWidth: 2 },
            { label: `Hosted (${selectedHosted.name})`, data: [(hostedMonthlyCost/maxMonthly)*100, 100, 0, 0], backgroundColor: 'rgba(161, 27, 126, 0.3)', borderColor: pcgColors.magenta, borderWidth: 2 }
        ];
        radarChart.update();

        // Polar Area Chart
        polarChart.data.labels = calculatorData.categories.map(c => c.name);
        polarChart.data.datasets[0].data = calculatorData.categories.map(c => c.totalTokens);
        polarChart.data.datasets[0].backgroundColor = calculatorData.categories.map((c, i) => {
            let color = colorPalette[i % colorPalette.length];
            return color.replace('rgb', 'rgba').replace(')', ', 0.6)');
        });
        polarChart.update();

        // --- Data Tables ---
        tables.modelComparison.innerHTML = '';
        const sortedModels = [...allModelCosts].sort((a, b) => a.annual - b.annual);
        sortedModels.forEach(m => {
            const tr = document.createElement('tr');
            if(m.name === selectedModel.name) { tr.style.fontWeight = '800'; tr.style.backgroundColor = 'rgba(0, 160, 202, 0.05)'; }
            tr.innerHTML = `<td>${m.name}</td><td>$${m.inputRate.toFixed(3)}</td><td>$${m.outputRate.toFixed(3)}</td><td>${formatMoney(m.monthly)}</td>`;
            tables.modelComparison.appendChild(tr);
        });

        tables.hostedComparison.innerHTML = '';
        calculatorData.hostedModels.forEach(m => {
            const tr = document.createElement('tr');
            const monthlyFixed = (m.costPerMin * 43200) + m.storageCost;
            if(m.name === selectedHosted.name) { tr.style.fontWeight = '800'; tr.style.backgroundColor = 'rgba(161, 27, 126, 0.05)'; }
            tr.innerHTML = `<td>${m.name}</td><td>${formatMoney(m.costPerMin)} / min</td><td>${formatMoney(m.storageCost)}</td><td>${formatMoney(monthlyFixed)}</td>`;
            tables.hostedComparison.appendChild(tr);
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
