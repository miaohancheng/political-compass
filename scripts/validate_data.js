#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'locales');
const questionsPath = path.join(rootDir, 'config', 'questions.json');
const ideologiesPath = path.join(rootDir, 'config', 'ideologies.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectLeafKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectLeafKeys(item, `${prefix}${index}.`));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) => collectLeafKeys(value[key], `${prefix}${key}.`));
  }

  return [prefix.slice(0, -1)];
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function diffKeys(expectedKeys, actualKeys) {
  const expected = new Set(expectedKeys);
  const actual = new Set(actualKeys);

  const missing = expectedKeys.filter((key) => !actual.has(key));
  const extra = actualKeys.filter((key) => !expected.has(key));
  return { missing, extra };
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function loadLocaleFiles() {
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  return localeFiles.map((file) => ({
    file,
    code: file.replace(/\.json$/i, ''),
    path: path.join(localesDir, file),
    data: readJson(path.join(localesDir, file))
  }));
}

function main() {
  const errors = [];
  const locales = loadLocaleFiles();
  const questions = readJson(questionsPath);
  const ideologies = readJson(ideologiesPath);

  assert(Array.isArray(questions), '`config/questions.json` must be an array.', errors);
  assert(Array.isArray(ideologies), '`config/ideologies.json` must be an array.', errors);
  assert(locales.length > 0, 'No locale JSON files found under `locales/`.', errors);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const englishLocale = locales.find((entry) => entry.code === 'en');
  assert(Boolean(englishLocale), 'Missing required locale file: `locales/en.json`.', errors);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const enData = englishLocale.data;
  const questionCount = questions.length;
  const enQuestionCount = Object.keys(enData.questions || {}).length;

  assert(questionCount > 0, 'Questions array is empty.', errors);
  assert(
    enQuestionCount === questionCount,
    `Question count mismatch: config has ${questionCount}, en locale has ${enQuestionCount}.`,
    errors
  );

  locales.forEach((locale) => {
    const localeQuestionCount = Object.keys(locale.data.questions || {}).length;
    assert(
      localeQuestionCount === questionCount,
      `Question count mismatch in ${locale.file}: expected ${questionCount}, found ${localeQuestionCount}.`,
      errors
    );
  });

  const enLeafKeys = sortedUnique(collectLeafKeys(enData));
  locales.forEach((locale) => {
    const localeLeafKeys = sortedUnique(collectLeafKeys(locale.data));
    const { missing, extra } = diffKeys(enLeafKeys, localeLeafKeys);
    if (missing.length > 0) {
      errors.push(
        `${locale.file} is missing ${missing.length} keys. Sample: ${missing.slice(0, 8).join(', ')}`
      );
    }
    if (extra.length > 0) {
      errors.push(
        `${locale.file} has ${extra.length} extra keys. Sample: ${extra.slice(0, 8).join(', ')}`
      );
    }
  });

  const ideologyNames = ideologies.map((item) => item.name);
  const duplicateIdeologyNames = ideologyNames.filter(
    (name, index) => ideologyNames.indexOf(name) !== index
  );
  if (duplicateIdeologyNames.length > 0) {
    errors.push(
      `Duplicate ideology names in config: ${sortedUnique(duplicateIdeologyNames).join(', ')}`
    );
  }

  const expectedIdeologyKeys = sortedUnique([...ideologyNames, 'Unknown']);
  locales.forEach((locale) => {
    const ideologyKeys = sortedUnique(Object.keys(locale.data.ideologies || {}));
    const ideologyDescKeys = sortedUnique(Object.keys(locale.data.ideologyDescriptions || {}));

    const ideologyDiff = diffKeys(expectedIdeologyKeys, ideologyKeys);
    const descDiff = diffKeys(expectedIdeologyKeys, ideologyDescKeys);

    if (ideologyDiff.missing.length > 0 || ideologyDiff.extra.length > 0) {
      errors.push(
        `${locale.file} ideologies key mismatch. Missing: ${ideologyDiff.missing.join(', ') || 'none'}; extra: ${ideologyDiff.extra.join(', ') || 'none'}.`
      );
    }
    if (descDiff.missing.length > 0 || descDiff.extra.length > 0) {
      errors.push(
        `${locale.file} ideologyDescriptions key mismatch. Missing: ${descDiff.missing.join(', ') || 'none'}; extra: ${descDiff.extra.join(', ') || 'none'}.`
      );
    }
  });

  if (errors.length > 0) {
    console.error('Data validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(
    `Data validation passed. locales=${locales.length}, questions=${questionCount}, ideologies=${ideologyNames.length}`
  );
}

main();
