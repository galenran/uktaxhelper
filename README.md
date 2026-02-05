# UK Salary Tax Calculator (2025/26)

Static Astro site that estimates UK take-home pay for the 2025/26 tax year. It models personal allowance tapering, marginal income tax bands, and employee National Insurance contributions. The site includes programmatic SEO landing pages for high-intent salary searches and long-form explanatory copy to support AdSense placement.

## Features
- Interactive salary calculator with instant take-home, income tax, NIC, and pension breakdowns
- Annual, monthly, and weekly views with a doughnut chart to visualise deductions
- Personal allowance taper logic for earnings above £100,000
- Pre-generated landing pages such as `/salary-tax-calculator/40000-after-tax/`
- SEO-focused reference sections covering allowance, NICs, and the taper
- Static output ready for Vercel, Cloudflare Pages, or any CDN

## Getting Started
1. Install dependencies (Node.js 18+ required):
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Preview the static build locally:
   ```bash
   npm run preview
   ```

## Configuration
- Update `astro.config.mjs` with the final site URL before deployment.
- Adjust `salaryTargets` in `src/pages/salary-tax-calculator/[salary]-after-tax.astro` to control which landing pages are generated.
- Change the default pension contribution passed to `SalaryCalculator` if your audience expects a different rate.

## Notes
- Calculations are illustrative; encourage users to cross-check with official GOV.UK calculators.
- Replace the placeholder ad slot in the calculator card with your AdSense tag once approved.
