const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};
console.log(wrap(-45, 45, -50)); // should be 40
console.log(wrap(-45, 45, 50)); // should be -40
console.log(wrap(-45, 45, 0)); // should be 0
