/** Commercial destinations and contextual attribution: intentionally separate from the finance model. */
export const commercialConfig = Object.freeze({
  productId: 'holiday-inventory-cash-gap-calculator',
  canonicalUrl: 'https://holiday-inventory-cash-gap-calculat.vercel.app/', // owner-supplied Vercel production URL
  primary: {
    label: 'Explore Inventory Funding Options',
    url: 'https://www.distilledfunding.com/apply',
    affiliate: false,
    verified: true
  },
  // Tally form https://tally.so/r/mOe658 could not be verified; never render as active until verified.
  secondary: null,
  affiliateOffers: [], // {label, url, affiliate: true} only after owner verifies link and disclosures
  emailResultsEndpoint: null, // no lead submission without explicit authorized backend configuration
  sourceArticle: '',
  campaign: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: ''
});
