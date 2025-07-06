const fs = require('fs');
const path = require('path');

console.log('🔧 Starting vehicle data repair and sorting...');

// Read the current vehicle data
const dataPath = path.join(__dirname, '..', 'vehicle-size-data.json');
let rawData = fs.readFileSync(dataPath, 'utf8').trim();

console.log('📄 Original file size:', rawData.length, 'characters');

// Fix the JSON structure completely
console.log('🔧 Completely restructuring JSON...');

// Remove any array brackets first
rawData = rawData.replace(/^\s*\[/, '').replace(/\]\s*$/, '');

// Split by '},\s*{' pattern to get individual objects
const objectMatches = rawData.split(/},\s*{/);

console.log('📊 Found', objectMatches.length, 'potential vehicle objects');

const vehicles = [];

objectMatches.forEach((objStr, index) => {
  try {
    // Clean up the object string
    let cleanObj = objStr.trim();
    
    // Add back the braces if needed
    if (!cleanObj.startsWith('{')) {
      cleanObj = '{' + cleanObj;
    }
    if (!cleanObj.endsWith('}')) {
      cleanObj = cleanObj + '}';
    }
    
    // Remove any trailing commas or extra characters
    cleanObj = cleanObj.replace(/,\s*}$/, '}');
    cleanObj = cleanObj.replace(/}\s*,.*$/, '}');
    
    const vehicle = JSON.parse(cleanObj);
    
    // Validate required fields
    if (vehicle.make && vehicle.model && vehicle.size) {
      vehicles.push({
        make: vehicle.make.trim(),
        model: vehicle.model.trim(),
        trim: vehicle.trim || '',
        size: vehicle.size.trim()
      });
    } else {
      console.log(`⚠️  Skipping invalid vehicle at index ${index}:`, cleanObj.substring(0, 100));
    }
  } catch (error) {
    console.log(`❌ Failed to parse vehicle at index ${index}:`, error.message);
    console.log('   Object string:', objStr.substring(0, 100));
  }
});

console.log('✅ Successfully parsed', vehicles.length, 'vehicles');

// Sort by make (alphabetically), then by model (alphabetically)
console.log('🔄 Sorting vehicles alphabetically...');
const sortedVehicles = vehicles.sort((a, b) => {
  // First sort by make (case insensitive)
  const makeA = a.make.toLowerCase();
  const makeB = b.make.toLowerCase();
  const makeComparison = makeA.localeCompare(makeB);
  
  if (makeComparison !== 0) {
    return makeComparison;
  }
  
  // If make is the same, sort by model (case insensitive)
  const modelA = a.model.toLowerCase();
  const modelB = b.model.toLowerCase();
  return modelA.localeCompare(modelB);
});

console.log('✅ Sorting completed');

// Show sample of sorted data
console.log('\n📋 First 10 entries after sorting:');
sortedVehicles.slice(0, 10).forEach((vehicle, index) => {
  console.log(`${(index + 1).toString().padStart(2, ' ')}. ${vehicle.make} ${vehicle.model} (${vehicle.size})`);
});

console.log('\n📋 Last 10 entries after sorting:');
sortedVehicles.slice(-10).forEach((vehicle, index) => {
  const entryNumber = sortedVehicles.length - 9 + index;
  console.log(`${entryNumber.toString().padStart(4, ' ')}. ${vehicle.make} ${vehicle.model} (${vehicle.size})`);
});

// Verify sorting
console.log('\n🔍 Verifying sort order...');
let isSorted = true;
for (let i = 1; i < sortedVehicles.length; i++) {
  const prev = sortedVehicles[i-1];
  const curr = sortedVehicles[i];
  
  const prevMake = prev.make.toLowerCase();
  const currMake = curr.make.toLowerCase();
  const prevModel = prev.model.toLowerCase();
  const currModel = curr.model.toLowerCase();
  
  if (prevMake > currMake || (prevMake === currMake && prevModel > currModel)) {
    isSorted = false;
    console.log(`❌ Sort error at ${i}: ${prev.make} ${prev.model} vs ${curr.make} ${curr.model}`);
    break;
  }
}

if (isSorted) {
  console.log('✅ Sort order verified - data is correctly sorted');
} else {
  console.log('❌ Sort verification failed');
  process.exit(1);
}

// Write the sorted data back to the file
console.log('\n💾 Writing sorted data to file...');
fs.writeFileSync(dataPath, JSON.stringify(sortedVehicles, null, 2), 'utf8');

console.log('🎯 Successfully repaired and sorted vehicle-size-data.json');
console.log('📊 Final statistics:');
console.log(`   • Total vehicles: ${sortedVehicles.length}`);

// Show make distribution
const makeStats = {};
sortedVehicles.forEach(vehicle => {
  makeStats[vehicle.make] = (makeStats[vehicle.make] || 0) + 1;
});

console.log(`   • Total makes: ${Object.keys(makeStats).length}`);
console.log('\n📈 Top 10 makes by vehicle count:');
Object.entries(makeStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([make, count]) => {
    console.log(`      ${make}: ${count} vehicles`);
  });

console.log('\n✨ Vehicle data is now properly formatted and sorted alphabetically!');