/** Supported currencies for base currency and FX rates. */
export enum Currency {
  EUR = "EUR",
  USD = "USD",
  GBP = "GBP",
  CHF = "CHF",
  RUB = "RUB",
  UAH = "UAH",
}

export const CURRENCIES: Currency[] = [
  Currency.EUR,
  Currency.USD,
  Currency.GBP,
  Currency.CHF,
  Currency.RUB,
  Currency.UAH,
];

export const DEFAULT_CURRENCY = Currency.EUR;

/** Type for supported currency code (string equal to enum value). */
export type CurrencyCode = `${Currency}`;

/** Check if a string is a supported currency. */
export function isSupportedCurrency(value: string): value is CurrencyCode {
  return CURRENCIES.includes(value as Currency);
}

/** Coerce to supported currency or default. */
export function toCurrency(value: string): CurrencyCode {
  return isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}
