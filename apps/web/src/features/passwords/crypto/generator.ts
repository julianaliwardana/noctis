const SETS = {
  lowercase: "abcdefghijkmnopqrstuvwxyz",
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digits: "23456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

export type CharacterSet = keyof typeof SETS;

export interface GeneratorOptions {
  length: number;
  sets: CharacterSet[];
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  sets: ["lowercase", "uppercase", "digits", "symbols"],
};

/**
 * Rejection sampling rather than `% alphabet.length`, which would bias toward the first
 * few characters whenever 256 isn't a multiple of the alphabet size — which is almost always.
 */
function randomIndex(bound: number): number {
  const limit = Math.floor(256 / bound) * bound;
  const buffer = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % bound;
}

export function generatePassword({ length, sets }: GeneratorOptions): string {
  const active = sets.length > 0 ? sets : DEFAULT_GENERATOR_OPTIONS.sets;
  const alphabet = active.map((set) => SETS[set]).join("");

  // One character from each chosen set first, so "include symbols" actually means included,
  // then shuffled so those guaranteed characters don't always sit at the front.
  const required = active.map((set) => SETS[set][randomIndex(SETS[set].length)]!);
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    alphabet[randomIndex(alphabet.length)]!,
  );

  const chars = [...required, ...rest].slice(0, Math.max(length, required.length));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

/** Rough strength read for the master password field. Length dominates; variety breaks ties. */
export function scorePassword(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!value) return { score: 0, label: "" };

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((re) => re.test(value)).length;
  if (value.length < 8) return { score: 0, label: "Too short" };
  if (value.length < 12 || variety < 2) return { score: 1, label: "Weak" };
  if (value.length < 16 || variety < 3) return { score: 2, label: "Reasonable" };
  return { score: 3, label: "Strong" };
}
