// Flatten an array of arrays without using spread/apply. `target.push(...huge)`
// and `Function.apply(null, huge)` throw "Maximum call stack size exceeded" once
// the argument count exceeds the engine cap (~125k–300k in V8). Large logs
// (e.g. a 315k-line file) blow past it, so accumulate with a plain loop instead.
export function concatChunks<T>(groups: T[][]): T[] {
  const out: T[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) out.push(group[i]);
  }
  return out;
}

/** Append every element of `src` onto `target` in place (spread-safe). */
export function appendAll<T>(target: T[], src: readonly T[]): void {
  for (let i = 0; i < src.length; i++) target.push(src[i]);
}

// `Math.max(...arr)` / `Math.min(...arr)` spread the array as call arguments and
// throw "Maximum call stack size exceeded" past the engine's arg-count cap. These
// loop-based equivalents are safe for arbitrarily large arrays. Callers should
// guard empty input (these return -Infinity / +Infinity for an empty array, like
// `Math.max()` / `Math.min()`).
export function maxOf(nums: readonly number[]): number {
  let m = -Infinity;
  for (let i = 0; i < nums.length; i++) if (nums[i] > m) m = nums[i];
  return m;
}
export function minOf(nums: readonly number[]): number {
  let m = Infinity;
  for (let i = 0; i < nums.length; i++) if (nums[i] < m) m = nums[i];
  return m;
}
