import { centsToDollars, parseDollarsToCents } from '../../src/domain/money';

describe('centsToDollars', () => {
  it('formats positive cents', () => {
    expect(centsToDollars(2000)).toBe('$20.00');
    expect(centsToDollars(50001)).toBe('$500.01');
    expect(centsToDollars(100)).toBe('$1.00');
  });

  it('formats negative cents with leading minus', () => {
    expect(centsToDollars(-2000)).toBe('-$20.00');
    expect(centsToDollars(-147967)).toBe('-$1,479.67');
  });

  it('formats zero', () => {
    expect(centsToDollars(0)).toBe('$0.00');
  });
});

describe('parseDollarsToCents', () => {
  it('parses plain numbers', () => {
    expect(parseDollarsToCents('20.00')).toBe(2000);
    expect(parseDollarsToCents('-1479.67')).toBe(-147967);
  });

  it('strips dollar signs and commas', () => {
    expect(parseDollarsToCents('$24,057.19')).toBe(2405719);
    expect(parseDollarsToCents('-$8,324.48')).toBe(-832448);
  });

  it('throws on invalid input', () => {
    expect(() => parseDollarsToCents('abc')).toThrow();
  });
});
