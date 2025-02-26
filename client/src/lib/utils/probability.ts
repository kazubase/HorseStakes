export const normalizeStringProbability = (probability: number | string): number => {
  if (typeof probability === 'number') {
    return probability;
  }
  return parseFloat(probability.replace('%', '')) / 100;
}; 