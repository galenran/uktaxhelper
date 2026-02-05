import Chart from 'chart.js/auto';
import { buildTaxBreakdown, formatCurrency, formatRate } from '../utils/tax';

type Period = 'annual' | 'monthly' | 'weekly';

type ResultFieldMap = {
  takeHome: HTMLElement | null;
  incomeTax: HTMLElement | null;
  ni: HTMLElement | null;
  pension: HTMLElement | null;
  gross: HTMLElement | null;
  salaryAfterPension: HTMLElement | null;
  allowance: HTMLElement | null;
  taxable: HTMLElement | null;
  pensionAnnual: HTMLElement | null;
  takeHomePrePension: HTMLElement | null;
};

const getDivisor = (period: Period): number => {
  if (period === 'monthly') {
    return 12;
  }
  if (period === 'weekly') {
    return 52;
  }
  return 1;
};

const formatByPeriod = (value: number, period: Period): string => {
  return formatCurrency(value / getDivisor(period));
};

const renderBandTable = (
  tableBody: HTMLTableSectionElement | null,
  period: Period,
  taxBands: ReturnType<typeof buildTaxBreakdown>['taxBands']
) => {
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

const createChart = (canvas: HTMLCanvasElement, dataset: number[]) => {
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

const updateChart = (
  chart: Chart | undefined,
  canvas: HTMLCanvasElement | null,
  period: Period,
  breakdown: ReturnType<typeof buildTaxBreakdown>
): Chart | undefined => {
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

const updateResultCards = (
  fields: ResultFieldMap,
  period: Period,
  breakdown: ReturnType<typeof buildTaxBreakdown>
) => {
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

const updateSummary = (
  fields: ResultFieldMap,
  breakdown: ReturnType<typeof buildTaxBreakdown>
) => {
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

const initCalculator = (container: HTMLElement) => {
  if (container.dataset.calculatorInit === 'true') {
    return;
  }
  container.dataset.calculatorInit = 'true';

  const form = container.querySelector<HTMLFormElement>('[data-calculator-form]');
  const salaryInput = container.querySelector<HTMLInputElement>('#salary-input');
  const pensionInput = container.querySelector<HTMLInputElement>('#pension-input');
  const tableBody = container.querySelector<HTMLTableSectionElement>('[data-band-table] tbody');
  const chartCanvas = container.querySelector<HTMLCanvasElement>('[data-chart]');
  const periodButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-period]'));
  const copyButton = container.querySelector<HTMLButtonElement>('[data-copy-results]');

  const resultFields: ResultFieldMap = {
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

  let currentPeriod: Period = 'annual';
  let currentBreakdown = buildTaxBreakdown(initialSalary, initialPensionRate);
  let chartInstance = updateChart(undefined, chartCanvas, currentPeriod, currentBreakdown);

  const renderBreakdown = (salary: number, pensionRate: number) => {
    currentBreakdown = buildTaxBreakdown(salary, pensionRate);
    updateResultCards(resultFields, currentPeriod, currentBreakdown);
    updateSummary(resultFields, currentBreakdown);
    renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
    chartInstance = updateChart(chartInstance, chartCanvas, currentPeriod, currentBreakdown);
  };

  const formatShareSummary = (): string => {
    const divisor = getDivisor(currentPeriod);
    const periodLabel =
      currentPeriod === 'annual'
        ? 'Annual'
        : currentPeriod === 'monthly'
        ? 'Monthly'
        : 'Weekly';

    const formatValue = (value: number) => formatCurrency(value / divisor);

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

      currentPeriod = period as Period;
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

  // Initial paint
  updateResultCards(resultFields, currentPeriod, currentBreakdown);
  updateSummary(resultFields, currentBreakdown);
  renderBandTable(tableBody, currentPeriod, currentBreakdown.taxBands);
};

const bootstrap = () => {
  document
    .querySelectorAll<HTMLElement>('[data-calculator]')
    .forEach((container) => initCalculator(container));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
