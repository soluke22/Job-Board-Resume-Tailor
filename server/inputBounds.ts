/** Bound JSON complexity before recursive schemas/fingerprints or persistence. */
export function assertBoundedJson(input: unknown) {
  const pending = [{ value: input, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++nodes > 100_000 || depth > 64) throw new Error('Input complexity exceeds supported limits');
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsupported input key');
      pending.push({ value: child, depth: depth + 1 });
    }
  }
}
