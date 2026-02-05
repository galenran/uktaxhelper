import Chart from 'chart.js/auto';
import { buildTaxBreakdown, formatCurrency, formatRate } from '../utils/tax';

/** @typedef {'annual' | 'monthly' | 'weekly'} Period */

const getDivisor = (period) => {
  if (period === 'monthly') {
    return 12;
  }
  if (period === 'weekly') {
    return 52;
  }
  return 1;
};

const formatByPeriod = (value, period) => {
  return formatCurrency(value / getDivisor(period));
};

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

const createChart = (canvas, dataset) => {
  return new Chart(canvas, {
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

const updateChart = (chart, canvas, period, breakdown) => {
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
    return createChart(canvas, dataset);
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

const initCalculator = (container) => {
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

  /** @type {Period} */
  let currentPeriod = 'annual';
  let currentBreakdown = buildTaxBreakdown(initialSalary, initialPensionRate);
  let chartInstance = updateChart(undefined, chartCanvas, currentPeriod, currentBreakdown);

  const renderBreakdown = (salary, pensionRate) => {
    currentBreakdown = buildTaxBreakdown(salary, pensionRate);
    updateResultCards(resultFields, currentPeriod, currentBreakdown);
    updateSummary(resultFields, currentBreakdown);
    renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
    chartInstance = updateChart(chartInstance, chartCanvas, currentPeriod, currentBreakdown);
  };

  const formatShareSummary = () => {
    const divisor = getDivisor(currentPeriod);
    const periodLabel =
      currentPeriod === 'annual'
        ? 'Annual'
        : currentPeriod === 'monthly'
        ? 'Monthly'
        : 'Weekly';

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
      chartInstance = updateChart(chartInstance, chartCanvas, currentPeriod, currentBreakdown);
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
  document.querySelectorAll('[data-calculator]').forEach((container) => initCalculator(container));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
