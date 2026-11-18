export function bearerFrom(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}
