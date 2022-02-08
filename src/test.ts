function calculateF(i: number, j: number): number {
  if (i === j) {
    return 1;
  }
  return 0;
}

const A = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));

for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    A[i][j] = calculateF(i, j);
  }
}

console.log(A);

export {};
