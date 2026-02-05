export interface TaxBandEntry {
    label: string;
    rate: number;
    taxablePortion: number;
    taxDue: number;
}

export interface TaxBreakdown {
    grossSalary: number;
    salaryAfterPension: number;
    pensionContribution: number;
    personalAllowance: number;
    taxableIncome: number;
    incomeTax: number;
    nationalInsurance: number;
    takeHomePay: number;
    takeHomeWithoutPension: number;
    taxBands: TaxBandEntry[];
}

const PERSONAL_ALLOWANCE = 12_570;
const BASIC_RATE_LIMIT = 50_270;
const HIGHER_RATE_LIMIT = 125_140;
const ADDITIONAL_RATE_THRESHOLD = 125_140; // same as higher because allowance tapers to zero

const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const ADDITIONAL_RATE = 0.45;

const NI_PRIMARY_THRESHOLD = 12_570;
const NI_UPPER_EARNINGS_LIMIT = 50_270;
const NI_MAIN_RATE = 0.08;
const NI_UPPER_RATE = 0.02;

export function getPersonalAllowance(income: number): number {
    if (income <= 100_000) {
        return PERSONAL_ALLOWANCE;
    }

    const reduced = PERSONAL_ALLOWANCE - (income - 100_000) / 2;
    return Math.max(0, reduced);
}

export function calculateIncomeTax(income: number, allowance: number): { total: number; bands: TaxBandEntry[] } {
    const taxableIncome = Math.max(0, income - allowance);
    let remaining = taxableIncome;
    const bands: TaxBandEntry[] = [];
    let totalTax = 0;

    const addBand = (label: string, rate: number, ceiling?: number) => {
        if (remaining <= 0) {
            return;
        }
        const bandCap = ceiling ? Math.max(0, Math.min(remaining, ceiling)) : remaining;
        const taxed = bandCap * rate;
        bands.push({
            label,
            rate,
            taxablePortion: bandCap,
            taxDue: taxed
        });
        remaining -= bandCap;
        totalTax += taxed;
    };

    const basicBandWidth = BASIC_RATE_LIMIT - allowance;
    if (basicBandWidth > 0) {
        addBand('Basic rate 20%', BASIC_RATE, basicBandWidth);
    }

    const higherBandWidth = HIGHER_RATE_LIMIT - Math.max(BASIC_RATE_LIMIT, allowance);
    if (higherBandWidth > 0) {
        addBand('Higher rate 40%', HIGHER_RATE, higherBandWidth);
    }

    addBand('Additional rate 45%', ADDITIONAL_RATE);

    return {
        total: totalTax,
        bands
    };
}

export function calculateNationalInsurance(income: number): number {
    if (income <= NI_PRIMARY_THRESHOLD) {
        return 0;
    }

    const mainBand = Math.min(income, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD;
    const upperBand = Math.max(0, income - NI_UPPER_EARNINGS_LIMIT);

    return mainBand * NI_MAIN_RATE + upperBand * NI_UPPER_RATE;
}

export function buildTaxBreakdown(grossSalary: number, pensionRate = 0): TaxBreakdown {
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
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2
});

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

export function formatRate(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
}
