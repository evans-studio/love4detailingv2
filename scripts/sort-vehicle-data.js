const fs = require('fs');
const path = require('path');

// Read and fix the current vehicle data
const dataPath = path.join(__dirname, '..', 'vehicle-size-data.json');
let rawData = fs.readFileSync(dataPath, 'utf8').trim();

// Fix malformed JSON structure
console.log('🔧 Checking JSON structure...');

// Check if it's missing array wrapper
if (!rawData.startsWith('[')) {
  console.log('🔧 Adding missing array wrapper...');
  rawData = '[' + rawData;
}

if (!rawData.endsWith(']')) {
  console.log('🔧 Adding missing array closing...');
  rawData = rawData + ']';
}

// Fix malformed JSON if needed (multiple arrays concatenated)
if (rawData.includes('][')) {
  console.log('🔧 Fixing concatenated arrays...');
  // Split on array boundaries and rejoin
  const sections = rawData.split('][');
  let fixedData = sections[0]; // First section
  
  for (let i = 1; i < sections.length; i++) {
    // Remove leading [ and add comma
    const section = sections[i].replace(/^\s*\[/, '');
    fixedData += ',' + section;
  }
  
  rawData = fixedData;
}

const data = JSON.parse(rawData);

console.log('Original data:', data.length, 'entries');

// Sort by make (alphabetically), then by model (alphabetically)
const sortedData = [...data].sort((a, b) => {
  // First sort by make (case insensitive)
  const makeA = a.make.toLowerCase().trim();
  const makeB = b.make.toLowerCase().trim();
  const makeComparison = makeA.localeCompare(makeB);
  
  if (makeComparison !== 0) {
    return makeComparison;
  }
  
  // If make is the same, sort by model (case insensitive)
  const modelA = a.model.toLowerCase().trim();
  const modelB = b.model.toLowerCase().trim();
  return modelA.localeCompare(modelB);
});

console.log('Sorted data:', sortedData.length, 'entries');

// Show sample of sorted data
console.log('\nFirst 15 entries after sorting:');
sortedData.slice(0, 15).forEach((item, index) => {
  console.log(`${(index + 1).toString().padStart(2, ' ')}. ${item.make} ${item.model} (${item.size})`);
});

console.log('\nLast 15 entries after sorting:');
sortedData.slice(-15).forEach((item, index) => {
  const entryNumber = sortedData.length - 14 + index;
  console.log(`${entryNumber.toString().padStart(4, ' ')}. ${item.make} ${item.model} (${item.size})`);
});

// Verify sorting
let isSorted = true;
for (let i = 1; i < sortedData.length; i++) {
  const prev = sortedData[i-1];
  const curr = sortedData[i];
  
  const prevMake = prev.make.toLowerCase().trim();
  const currMake = curr.make.toLowerCase().trim();
  const prevModel = prev.model.toLowerCase().trim();
  const currModel = curr.model.toLowerCase().trim();
  
  if (prevMake > currMake || (prevMake === currMake && prevModel > currModel)) {
    isSorted = false;
    console.log(`❌ Sorting error at index ${i}: ${prev.make} ${prev.model} vs ${curr.make} ${curr.model}`);
    break;
  }
}

if (isSorted) {
  console.log('\n✅ Data is correctly sorted');
} else {
  console.log('\n❌ Data sorting verification failed');
  process.exit(1);
}

// Write the sorted data back to the file
fs.writeFileSync(dataPath, JSON.stringify(sortedData, null, 2), 'utf8');

console.log('\n🎯 Successfully sorted and saved vehicle-size-data.json');
console.log('📊 Data is now organized alphabetically by make, then by model');

// Show make distribution
const makeStats = {};
sortedData.forEach(item => {
  makeStats[item.make] = (makeStats[item.make] || 0) + 1;
});

console.log('\n📈 Vehicle distribution by make:');
Object.entries(makeStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([make, count]) => {
    console.log(`   ${make}: ${count} entries`);
  });

console.log(`\n📋 Total makes: ${Object.keys(makeStats).length}`);
console.log(`📋 Total entries: ${sortedData.length}`);