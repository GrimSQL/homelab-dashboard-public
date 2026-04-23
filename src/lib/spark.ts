export function sparkPath(values: number[], w: number, h: number, pad = 2): string {
  if (!values.length) return "";
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  return values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
}

export function seededWalk(seed: number, n: number, base: number, amp: number): number[] {
  let x = seed * 9301 + 49297;
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280 - 0.5;
    v += r * amp * 0.3;
    v = Math.max(base - amp, Math.min(base + amp, v));
    out.push(v);
  }
  return out;
}
