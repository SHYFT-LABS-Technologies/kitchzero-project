// Currency formatting utility for dynamic currency support

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  LKR: {
    code: 'LKR',
    symbol: 'Rs.',
    name: 'Sri Lankan Rupee',
    decimals: 2,
    symbolPosition: 'before'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    symbolPosition: 'before'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'before'
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    symbolPosition: 'before'
  }
};

// Default currency for Sri Lanka launch
export const DEFAULT_CURRENCY = 'LKR';

// Format currency amount with proper symbol and decimals
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    showDecimals?: boolean;
    showSymbol?: boolean;
    compact?: boolean;
  } = {}
): string {
  const {
    showDecimals = true,
    showSymbol = true,
    compact = false
  } = options;

  // Handle null/undefined/empty values
  if (amount === null || amount === undefined || amount === '') {
    return showSymbol ? `${CURRENCIES[currencyCode]?.symbol || ''}0` : '0';
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return showSymbol ? `${CURRENCIES[currencyCode]?.symbol || ''}0` : '0';
  }

  const currency = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  
  // Compact formatting for large numbers
  if (compact && Math.abs(numAmount) >= 1000) {
    let compactAmount = numAmount;
    let suffix = '';
    
    if (Math.abs(numAmount) >= 1000000) {
      compactAmount = numAmount / 1000000;
      suffix = 'M';
    } else if (Math.abs(numAmount) >= 1000) {
      compactAmount = numAmount / 1000;
      suffix = 'K';
    }
    
    const formattedAmount = compactAmount.toFixed(1).replace(/\.0$/, '') + suffix;
    return showSymbol ? `${currency.symbol}${formattedAmount}` : formattedAmount;
  }

  // Regular formatting
  const decimals = showDecimals ? currency.decimals : 0;
  const formattedAmount = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (!showSymbol) {
    return formattedAmount;
  }

  // Position symbol before or after based on currency configuration
  return currency.symbolPosition === 'before' 
    ? `${currency.symbol}${formattedAmount}`
    : `${formattedAmount}${currency.symbol}`;
}

// Parse currency string back to number
export function parseCurrency(currencyString: string, currencyCode: string = DEFAULT_CURRENCY): number {
  if (!currencyString) return 0;
  
  const currency = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  
  // Remove currency symbol and any non-numeric characters except decimal point
  let cleanString = currencyString
    .replace(currency.symbol, '')
    .replace(/[^0-9.-]/g, '');
  
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

// Get currency symbol for a given currency code
export function getCurrencySymbol(currencyCode: string = DEFAULT_CURRENCY): string {
  return CURRENCIES[currencyCode]?.symbol || CURRENCIES[DEFAULT_CURRENCY].symbol;
}

// Get currency info for a given currency code
export function getCurrencyInfo(currencyCode: string = DEFAULT_CURRENCY): CurrencyInfo {
  return CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
}

// Validate if a currency code is supported
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode in CURRENCIES;
}

// Convert between currencies (basic conversion - in production, you'd use real exchange rates)
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates?: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Basic conversion rates (in production, fetch from exchange rate API)
  const defaultRates: Record<string, number> = {
    LKR: 300,  // 1 USD = 300 LKR (approximate)
    USD: 1,    // Base currency
    EUR: 0.85, // 1 USD = 0.85 EUR (approximate)
    GBP: 0.75, // 1 USD = 0.75 GBP (approximate)
    INR: 83    // 1 USD = 83 INR (approximate)
  };
  
  const rates = exchangeRates || defaultRates;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / (rates[fromCurrency] || 1);
  const convertedAmount = usdAmount * (rates[toCurrency] || 1);
  
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
}