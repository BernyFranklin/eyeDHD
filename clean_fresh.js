// Pseudo-code for clean_fresh.js
// open reader on input.csv
// open writer for output CLEANED.csv (with header: true)

// numericCols  = []
// statusCols   = []
// headersKnown = false

// for each row from parser:
//   if !headersKnown:
//      headers = keys(row)
//      numericCols = mapHintsToActual(headers, NUMERIC_HINTS)
//      statusCols  = mapHintsToActual(headers, STATUS_HINTS)
//      outHeaders  = headers + numericCols*_valid + statusCols*_valid
//      configure writer.columns = outHeaders
//      headersKnown = true

//   outRow = copy(row)

//   for col in numericCols:
//      if isFiniteNumber(outRow[col]):
//         outRow[col] = Number(outRow[col])
//         outRow[col + "_valid"] = 1
//      else:
//         outRow[col] = BAD_NUMERIC_REPLACEMENT
//         outRow[col + "_valid"] = 0

//   for col in statusCols:
//      s = trim(outRow[col])
//      outRow[col] = s
//      outRow[col + "_valid"] = (s in INVALID_SET ? 0 : 1)

//   writer.write(outRow)

// writer.end()
// print summary

// clean_fresh.js

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");
const { stringify } = require("csv-stringify");

// Columns that are numeric (we’ll zero or null invalid values)
const NUMERIC_HINTS = [
  "Frame",
  "CaptureTime",
  "HMDRotationX",
  "HMDRotationY",
  "HMDRotationZ",
  "LeftEyeForwardX",
  "LeftEyeForwardY",
  "LeftEyeForwardZ",
  "RightEyeForwardX",
  "RightEyeForwardY",
  "RightEyeForwardZ",
  "LeftPupilDiameterInMM",
  "RightPupilDiameterInMM",
];

// Columns that are “status” fields — we only flag them as valid/invalid
const STATUS_HINTS = ["GazeStatus", "LeftEyeStatus", "RightEyeStatus"];

// Words that mean “invalid”
const INVALID_STATUS = new Set(["INVALID", "BLANK", "N/A", "NA", "NULL", ""]);

// Replace bad numeric values with this:
const BAD_NUMERIC_REPLACEMENT = 0; // we can change to null also

// helpers
const canon = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ""); // ex: Left Eye Forward becomes LeftEyeForward
const isEmpty = (v) => v == null || String(v).trim() === "";
const isGoodNumber = (v) => {
  if (isEmpty(v)) return false;
  const n = Number(v);
  return Number.isFinite(n);
};

function detectActual(headers, hints) {
  const map = {};
  headers.forEach((h) => (map[canon(h)] = h));
  return hints.map((h) => map[canon(h)]).filter(Boolean);
}

async function cleanCsv(inputPath) {
  const base = path.basename(inputPath, path.extname(inputPath));
  const outPath = path.join(path.dirname(inputPath), `${base}.CLEANED.csv`);

  // Create read and write streams
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outPath);

  const parser = parse({ columns: true, bom: true, relax_column_count: true }); // bom means byte order marks
  const stringifier = stringify({ header: true });

  // Connect the writer
  stringifier.pipe(writeStream);

  let headers;
  let numericCols = [];
  let statusCols = [];
  let rowCount = 0,
    numericFixed = 0,
    statusFlagged = 0;

  parser.on("data", (row) => {
    if (!headers) {
      // detect headers on first row
      headers = Object.keys(row);
      numericCols = detectActual(headers, NUMERIC_HINTS);
      statusCols = detectActual(headers, STATUS_HINTS);

      // add _valid columns to header
      // add _valid columns to header
      const newHeaders = [
        ...headers,
        ...numericCols.map((h) => `${h}_valid`),
        ...statusCols.map((h) => `${h}_valid`),
      ];
      stringifier.write(
        newHeaders.reduce((acc, h) => {
          acc[h] = h;
          return acc;
        }, {})
      );
    }

    rowCount++;
    const outRow = { ...row };

    // numeric fields
    for (const col of numericCols) {
      const ok = isGoodNumber(outRow[col]);
      outRow[`${col}_valid`] = ok ? 1 : 0;
      if (!ok) {
        outRow[col] = BAD_NUMERIC_REPLACEMENT;
        numericFixed++;
      } else {
        outRow[col] = Number(outRow[col]);
      }
    }

    // status fields
    for (const col of statusCols) {
      const s = isEmpty(outRow[col]) ? "" : String(outRow[col]).trim();
      const invalid = INVALID_STATUS.has(s.toUpperCase());
      outRow[col] = s;
      outRow[`${col}_valid`] = invalid ? 0 : 1;
      if (invalid) statusFlagged++;
    }

    stringifier.write(outRow);
    if (rowCount % 5000 === 0)
      process.stdout.write(`Processed ${rowCount} rows...\r`);
  });

  parser.on("end", () => {
    stringifier.end();
    console.log(`Cleaning finished.`);
    console.log(`Rows processed: ${rowCount}`);
    console.log(
      `Numeric fixed (set to ${BAD_NUMERIC_REPLACEMENT}): ${numericFixed}`
    );
    console.log(`Status flagged invalid: ${statusFlagged}`);
    console.log(`Output file: ${outPath}`);
  });

  parser.on("error", (err) => {
    console.error("CSV parse error:", err.message);
    process.exit(1);
  });

  // start
  readStream.pipe(parser);
}

const [, , inputFile] = process.argv;
if (!inputFile) {
  console.error("Usage: node clean_fresh.js <yourfile.csv>");
  process.exit(1);
}
if (!fs.existsSync(inputFile)) {
  console.error("File not found:", inputFile);
  process.exit(1);
}

cleanCsv(inputFile);
