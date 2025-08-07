function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
    }
  }
  return dp[m][n];
}

function isDuplicate(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const lastA = normalize(a.split(' ').pop());
  const lastB = normalize(b.split(' ').pop());
  if (lastA && lastA === lastB) {
    const firstA = normalize(a.split(' ')[0]);
    const firstB = normalize(b.split(' ')[0]);
    if (!firstA || !firstB) return true;
    if (firstA[0] && firstA[0] === firstB[0]) return true;
  }
  const distance = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.8;
}

module.exports = { normalize, levenshtein, isDuplicate };
