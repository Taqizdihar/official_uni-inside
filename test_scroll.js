const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

for (let max = 45; max <= 55; max++) {
  console.log(`max=${max}, wrap(-50)=${wrap(-max, max, -50)}`);
}
