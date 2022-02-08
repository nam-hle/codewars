function f(a, x, count) {
  let k = 10n;
  while (count--) {
    for (let i = 1n; i < 10n; i++) {
      const nextX = i * k + x;
      if ((nextX * nextX - nextX) % (k * 10n) === 0n) {
        a.push((x = nextX));
        break;
      }
    }

    k *= 10n;
  }
  return a;
}

const a = [0n, 1n, 5n, 6n];
f(a, 5n, 2500);
f(a, 6n, 2500);
a.sort((x, y) => (x < y ? -1 : 1));

function green(n) {
  return a[n];
}
