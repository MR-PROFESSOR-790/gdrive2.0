const path = require("path");

const buildNextEslintCommand = (filenames) => {
  const files = filenames
    .map((f) => path.relative(path.join("packages", "nextjs"), f))
    .filter(f => !f.includes("deployedContracts.ts")); // Skip auto-generated files
  
  // Only run if there are files to lint
  return files.length > 0 
    ? `yarn next:lint --fix --file ${files.join(" --file ")}`
    : "echo 'No files to lint in Next.js'";
};

const checkTypesNextCommand = () => "yarn next:check-types";

const buildHardhatEslintCommand = (filenames) => {
  const files = filenames
    .map((f) => path.relative(path.join("packages", "hardhat"), f))
    .filter(f => !f.includes("deployedContracts.ts")); // Skip auto-generated files
  
  // Only run if there are files to lint
  return files.length > 0 
    ? `yarn hardhat:lint-staged --fix ${files.join(" ")}`
    : "echo 'No files to lint in Hardhat'";
};

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/hardhat/**/*.{ts,tsx}": [buildHardhatEslintCommand],
};
