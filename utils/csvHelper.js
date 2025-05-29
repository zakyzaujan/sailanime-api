const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");

function generateAndSaveCSV(dataArray, fields, outputFilename) {
  const parser = new Parser({ fields });
  const csv = parser.parse(dataArray);
  const outputPath = path.resolve(__dirname, "..", outputFilename);
  fs.writeFileSync(outputPath, csv, "utf8");
  return Buffer.from(csv, "utf8");
}

function csvFileExists(filename) {
  const fullPath = path.resolve(__dirname, "..", filename);
  return fs.existsSync(fullPath);
}

function csvFilePath(filename) {
  return path.resolve(__dirname, "..", filename);
}

function isCSVFresh(filename, ttlMs) {
  const fullPath = path.resolve(__dirname, "..", filename);
  if (!fs.existsSync(fullPath)) return false;
  const stats = fs.statSync(fullPath);
  const age = Date.now() - stats.mtimeMs;
  return age < ttlMs;
}

module.exports = {
  generateAndSaveCSV,
  csvFileExists,
  csvFilePath,
  isCSVFresh,
};
