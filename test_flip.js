const parent1 = 179;
const child1 = -179 * 0.5;
console.log("Total 1:", parent1 + child1); // 179 - 89.5 = 89.5

const parent2 = -181; // wrapped
const child2 = -(-181) * 0.5;
console.log("Total 2:", parent2 + child2); // -181 + 90.5 = -90.5
