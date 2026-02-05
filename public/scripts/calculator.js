// Self-contained client calculator script with CDN Chart.js.
const PERSONAL_ALLOWANCE = 12570;
const BASIC_RATE_LIMIT = 50270;
const HIGHER_RATE_LIMIT = 125140;
const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const ADDITIONAL_RATE = 0.45;
const NI_PRIMARY_THRESHOLD = 12570;
const NI_UPPER_EARNINGS_LIMIT = 50270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2
});

const formatCurrency = (value) => currencyFormatter.format(value);
const formatRate = (value) => `${(value * 100).toFixed(0)}%`;

const getPersonalAllowance = (income) => {
  if (income <= 100000) {
    return PERSONAL_ALLOWANCE;
  }
  const reduced = PERSONAL_ALLOWANCE - (income - 100000) / 2;
  return Math.max(0, reduced);
};

const calculateIncomeTax = (income, allowance) => {
  const taxableIncome = Math.max(0, income - allowance);
  let remaining = taxableIncome;
  const bands = [];
  let totalTax = 0;

  const addBand = (label, rate, ceiling) => {
    if (remaining <= 0) {
      return;
    }
    const cap = typeof ceiling === 'number' ? Math.max(0, Math.min(remaining, ceiling)) : remaining;
    const taxed = cap * rate;
    bands.push({
      label,
      rate,
      taxablePortion: cap,
      taxDue: taxed
    });
    remaining -= cap;
    totalTax += taxed;
  };

  const basicBandWidth = BASIC_RATE_LIMIT - allowance;
  if (basicBandWidth > 0) {
    addBand('Basic rate 20%', BASIC_RATE, basicBandWidth);
  }

  const higherBandBase = Math.max(BASIC_RATE_LIMIT, allowance);
  const higherBandWidth = HIGHER_RATE_LIMIT - higherBandBase;
  if (higherBandWidth > 0) {
    addBand('Higher rate 40%', HIGHER_RATE, higherBandWidth);
  }

  addBand('Additional rate 45%', ADDITIONAL_RATE);

  return {
    total: totalTax,
    bands
  };
};

const calculateNationalInsurance = (income) => {
  if (income <= NI_PRIMARY_THRESHOLD) {
    return 0;
  }

  const mainBand = Math.min(income, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD;
  const upperBand = Math.max(0, income - NI_UPPER_EARNINGS_LIMIT);
  return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
};

const buildTaxBreakdown = (grossSalary, pensionRate = 0) => {
  const cleanSalary = Math.max(0, Number.isFinite(grossSalary) ? grossSalary : 0);
  const normalisedRate = Math.min(Math.max(pensionRate, 0), 60) / 100;
  const pensionContribution = cleanSalary * normalisedRate;
  const salaryAfterPension = cleanSalary - pensionContribution;
  const allowance = getPersonalAllowance(salaryAfterPension);
  const { total: incomeTax, bands } = calculateIncomeTax(salaryAfterPension, allowance);
  const nationalInsurance = calculateNationalInsurance(salaryAfterPension);
  const takeHomeWithoutPension = cleanSalary - incomeTax - nationalInsurance;
  const takeHomePay = salaryAfterPension - incomeTax - nationalInsurance;

  return {
    grossSalary: cleanSalary,
    salaryAfterPension,
    pensionContribution,
    personalAllowance: allowance,
    taxableIncome: Math.max(0, salaryAfterPension - allowance),
    incomeTax,
    nationalInsurance,
    takeHomePay,
    takeHomeWithoutPension,
    taxBands: bands
  };
};

let chartModulePromise;
const loadChart = async () => {
  if (!chartModulePromise) {
    chartModulePromise = import('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.esm.js');
  }
  return chartModulePromise;
};

const getDivisor = (period) => {
  if (period === 'monthly') {
    return 12;
  }
  if (period === 'weekly') {
    return 52;
  }
  return 1;
};

const formatByPeriod = (value, period) => formatCurrency(value / getDivisor(period));

const renderBandTable = (tableBody, period, taxBands) => {
  if (!tableBody) {
    return;
  }

  const divisor = getDivisor(period);
  tableBody.innerHTML = '';

  taxBands.forEach((band) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${band.label}</td>
      <td>${formatRate(band.rate)}</td>
      <td>${formatCurrency(band.taxablePortion / divisor)}</td>
      <td>${formatCurrency(band.taxDue / divisor)}</td>
    `;
    tableBody.appendChild(row);
  });
};

const createChart = (ChartLib, canvas, dataset) => {
  return new ChartLib(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Take-home', 'Income Tax', 'National Insurance', 'Pension'],
      datasets: [
        {
          data: dataset,
          backgroundColor: ['#2563eb', '#f97316', '#10b981', '#818cf8'],
          borderWidth: 0
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
};

const updateChart = (ChartLib, chart, canvas, period, breakdown) => {
  if (!canvas) {
    return chart;
  }

  const divisor = getDivisor(period);
  const dataset = [
    breakdown.takeHomePay,
    breakdown.incomeTax,
    breakdown.nationalInsurance,
    breakdown.pensionContribution
  ].map((value) => Number((value / divisor).toFixed(2)));

  if (!chart) {
    return createChart(ChartLib, canvas, dataset);
  }

  chart.data.datasets[0].data = dataset;
  chart.update();
  return chart;
};

const updateResultCards = (fields, period, breakdown) => {
  if (fields.takeHome) {
    fields.takeHome.textContent = formatByPeriod(breakdown.takeHomePay, period);
  }
  if (fields.incomeTax) {
    fields.incomeTax.textContent = formatByPeriod(breakdown.incomeTax, period);
  }
  if (fields.ni) {
    fields.ni.textContent = formatByPeriod(breakdown.nationalInsurance, period);
  }
  if (fields.pension) {
    fields.pension.textContent = formatByPeriod(breakdown.pensionContribution, period);
  }
};

const updateSummary = (fields, breakdown) => {
  if (fields.gross) {
    fields.gross.textContent = formatCurrency(breakdown.grossSalary);
  }
  if (fields.salaryAfterPension) {
    fields.salaryAfterPension.textContent = formatCurrency(breakdown.salaryAfterPension);
  }
  if (fields.allowance) {
    fields.allowance.textContent = formatCurrency(breakdown.personalAllowance);
  }
  if (fields.taxable) {
    fields.taxable.textContent = formatCurrency(breakdown.taxableIncome);
  }
  if (fields.pensionAnnual) {
    fields.pensionAnnual.textContent = formatCurrency(breakdown.pensionContribution);
  }
  if (fields.takeHomePrePension) {
    fields.takeHomePrePension.textContent = formatCurrency(breakdown.takeHomeWithoutPension);
  }
};

const initCalculator = (ChartLib, container) => {
  if (container.dataset.calculatorInit === 'true') {
    return;
  }
  container.dataset.calculatorInit = 'true';

  const form = container.querySelector('[data-calculator-form]');
  const salaryInput = container.querySelector('#salary-input');
  const pensionInput = container.querySelector('#pension-input');
  const tableBody = container.querySelector('[data-band-table] tbody');
  const chartCanvas = container.querySelector('[data-chart]');
  const periodButtons = Array.from(container.querySelectorAll('[data-period]'));
  const copyButton = container.querySelector('[data-copy-results]');

  const resultFields = {
    takeHome: container.querySelector('[data-field="take-home"]'),
    incomeTax: container.querySelector('[data-field="income-tax"]'),
    ni: container.querySelector('[data-field="ni"]'),
    pension: container.querySelector('[data-field="pension"]'),
    gross: container.querySelector('[data-field="gross"]'),
    salaryAfterPension: container.querySelector('[data-field="salary-after-pension"]'),
    allowance: container.querySelector('[data-field="allowance"]'),
    taxable: container.querySelector('[data-field="taxable"]'),
    pensionAnnual: container.querySelector('[data-field="pension-annual"]'),
    takeHomePrePension: container.querySelector('[data-field="take-home-pre-pension"]')
  };

  const initialSalary = Number(container.dataset.initialSalary || '0');
  const initialPensionRate = Number(container.dataset.initialPension || '0');

  let currentPeriod = 'annual';
  let currentBreakdown = buildTaxBreakdown(initialSalary, initialPensionRate);
  let chartInstance = updateChart(ChartLib, undefined, chartCanvas, currentPeriod, currentBreakdown);

  const renderBreakdown = (salary, pensionRate) => {
    currentBreakdown = buildTaxBreakdown(salary, pensionRate);
    updateResultCards(resultFields, currentPeriod, currentBreakdown);
    updateSummary(resultFields, currentBreakdown);
    renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
    chartInstance = updateChart(ChartLib, chartInstance, chartCanvas, currentPeriod, currentBreakdown);
  };

  const getPeriodLabel = () => {
    if (currentPeriod === 'monthly') {
      return 'Monthly';
    }
    if (currentPeriod === 'weekly') {
      return 'Weekly';
    }
    return 'Annual';
  };

  const formatShareSummary = () => {
    const divisor = getDivisor(currentPeriod);
    const periodLabel = getPeriodLabel();
    const formatValue = (value) => formatCurrency(value / divisor);

    return [
      `UK salary tax breakdown (${periodLabel})`,
      `Gross pay: ${formatValue(currentBreakdown.grossSalary)}`,
      `Pension contribution: ${formatValue(currentBreakdown.pensionContribution)}`,
      `Taxable income: ${formatValue(currentBreakdown.taxableIncome)}`,
      `Income tax: ${formatValue(currentBreakdown.incomeTax)}`,
      `National Insurance: ${formatValue(currentBreakdown.nationalInsurance)}`,
      `Take-home pay: ${formatValue(currentBreakdown.takeHomePay)}`
    ].join('\n');
  };

  const handleCopyResults = async () => {
    if (!copyButton) {
      return;
    }

    const previousLabel = copyButton.textContent || 'Copy results to clipboard';
    try {
      await navigator.clipboard.writeText(formatShareSummary());
      copyButton.textContent = 'Copied!';
    } catch (error) {
      console.error('Unable to copy results', error);
      copyButton.textContent = 'Copy failed';
    }

    window.setTimeout(() => {
      copyButton.textContent = previousLabel;
    }, 2500);
  };

  const handleRecalculate = () => {
    if (!salaryInput || !pensionInput) {
      return;
    }

    const salary = Number(salaryInput.value);
    const pensionRate = Number(pensionInput.value);

    let hasError = false;

    if (!Number.isFinite(salary) || salary < 0) {
      salaryInput.setCustomValidity('Please enter a valid salary.');
      salaryInput.reportValidity();
      hasError = true;
    } else {
      salaryInput.setCustomValidity('');
    }

    if (!Number.isFinite(pensionRate) || pensionRate < 0 || pensionRate > 60) {
      pensionInput.setCustomValidity('Enter a percentage between 0 and 60.');
      pensionInput.reportValidity();
      hasError = true;
    } else {
      pensionInput.setCustomValidity('');
    }

    if (hasError) {
      return;
    }

    renderBreakdown(salary, pensionRate);
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleRecalculate();
  });

  form?.addEventListener('input', () => {
    salaryInput?.setCustomValidity('');
    pensionInput?.setCustomValidity('');
  });

  periodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const period = button.getAttribute('data-period');
      if (!period || period === currentPeriod) {
        return;
      }

      currentPeriod = period;
      periodButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn === button));
      });

      updateResultCards(resultFields, currentPeriod, currentBreakdown);
      renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
      chartInstance = updateChart(ChartLib, chartInstance, chartCanvas, currentPeriod, currentBreakdown);
    });
  });

  copyButton?.addEventListener('click', () => {
    handleCopyResults();
  });

  updateResultCards(resultFields, currentPeriod, currentBreakdown);
  updateSummary(resultFields, currentBreakdown);
  renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
};

const bootstrap = () => {
  const containers = document.querySelectorAll('[data-calculator]');
  if (!containers.length) {
    return;
  }

  loadChart()
    .then((module) => {
      const ChartLib = module.default || module.Chart;
      if (!ChartLib) {
        throw new Error('Chart export missing');
      }
      containers.forEach((container) => initCalculator(ChartLib, container));
    })
    .catch((error) => {
      console.error('Failed to load chart library', error);
    });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
