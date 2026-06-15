import fs from "fs";
import path from "path";

// A simple script to extract QUESTIONS array from seed files using regex
function extractQuestions(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/const QUESTIONS:.*?\[([\s\S]*?)\];/);
  if (!match) return [];
  
  const arrayStr = "[" + match[1] + "]";
  
  try {
    // We need to evaluate the array string, which contains objects without quotes on keys.
    // We'll use a new Function to return it.
    const getQuestions = new Function(`return ${arrayStr};`);
    return getQuestions();
  } catch (e) {
    console.error("Failed to parse", filePath, e);
    return [];
  }
}

const copsoq2 = extractQuestions(path.join(__dirname, "seed-copsoq.ts"));
const copsoq3 = extractQuestions(path.join(__dirname, "seed-copsoq-iii.ts"));
const jss = extractQuestions(path.join(__dirname, "seed-jss.ts"));
const olbi = extractQuestions(path.join(__dirname, "seed-olbi.ts"));

const output = {
  "copsoq-ii": copsoq2,
  "copsoq-iii": copsoq3,
  "jss": jss,
  "olbi": olbi
};

fs.writeFileSync(path.join(__dirname, "../src/app/(dashboard)/sobre/metodologia/questions-data.json"), JSON.stringify(output, null, 2));
console.log("Questions JSON generated successfully.");
