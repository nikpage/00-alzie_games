// The symbol set shown on tiles.
// Keeping symbols simple and visually distinct matters for the Alzie audience.
export const SYMBOLS = ['★', '●', '▲', '■', '♦', '✿', '♠', '♥', '✦']

export function getRandomSymbol(exclude?: string): string {
  const pool = exclude ? SYMBOLS.filter(s => s !== exclude) : SYMBOLS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function shuffleSymbols(count: number): string[] {
  const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
