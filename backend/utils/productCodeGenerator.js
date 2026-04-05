// Generates product codes like PRD-0001
function generateProductCode(sequence = 1) {
  const seq = String(Math.max(1, Number(sequence) || 1)).padStart(4, "0");
  return `PRD-${seq}`;
}

module.exports = { generateProductCode };
