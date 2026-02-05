# Content & Page Plan

## Core Pages
- `/` – Primary landing page with calculator, SEO sections, and AdSense-friendly layout.
- `/salary-tax-calculator/` – Secondary hub page targeting salary calculator keywords.
- `/salary-tax-calculator/[amount]-after-tax/` – Programmatic pages seeded with key salary amounts (30k–150k) for high-intent traffic.

## Calculator Module
- Shared `SalaryCalculator` component reused across all pages.
- Client-side updates via inline module script; initial render pre-computed for SEO and fast paint.
- Period toggle (annual, monthly, weekly) and optional pension percentage feed the calculation logic.
- Doughnut chart highlights the split between take-home, tax, NICs, and pension.
- Data attributes used to update result cards and band table without re-rendering entire component.

## SEO Copy Blocks
1. **What is the UK Personal Allowance for 2025/26?** – Explains £12,570 allowance and context.
2. **Understanding National Insurance Contributions** – Details 8% and 2% employee NIC bands.
3. **How the £100k Personal Allowance Taper Works** – Covers taper mechanics and planning tips.

Each block is wrapped in semantic sections with descriptive headings to capture long-tail queries and support AdSense placements.

## Deployment Notes
- Static build ready for Vercel or Cloudflare Pages; update `astro.config.mjs` with production domain.
- Adjust `salaryTargets` array to grow the pSEO page catalogue.
- Replace the placeholder advertising block with real AdSense tags after approval.
