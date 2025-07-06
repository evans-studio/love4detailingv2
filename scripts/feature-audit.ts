import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

interface Feature {
  id: string;
  type: 'button' | 'link' | 'form' | 'api' | 'interaction';
  name: string;
  location: string;
  line: number;
  code: string;
  description: string;
  dependencies?: string[];
  expectedBehavior: string;
}

interface FeatureInventory {
  buttons: Feature[];
  links: Feature[];
  forms: Feature[];
  apiEndpoints: Feature[];
  interactions: Feature[];
  totalCount: number;
  lastUpdated: string;
}

async function auditFeatures(): Promise<FeatureInventory> {
  const features: FeatureInventory = {
    buttons: [],
    links: [],
    forms: [],
    apiEndpoints: [],
    interactions: [],
    totalCount: 0,
    lastUpdated: new Date().toISOString()
  };

  // Scan all TypeScript and TSX files
  const files = await glob('src/**/*.{tsx,ts}', { ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'] });
  
  let buttonCounter = 1;
  let linkCounter = 1;
  let formCounter = 1;
  let apiCounter = 1;
  let interactionCounter = 1;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // Find buttons with onClick handlers
      const buttonMatch = trimmedLine.match(/<Button.*?onClick.*?>/);
      if (buttonMatch) {
        const buttonText = extractButtonText(trimmedLine, lines, index);
        features.buttons.push({
          id: `BTN-${buttonCounter.toString().padStart(3, '0')}`,
          type: 'button',
          name: `${buttonText} Button`,
          location: `${file}:${lineNumber}`,
          line: lineNumber,
          code: trimmedLine,
          description: `Button that ${inferButtonAction(trimmedLine)}`,
          expectedBehavior: inferExpectedBehavior(trimmedLine),
        });
        buttonCounter++;
      }

      // Find Links with href
      const linkMatch = trimmedLine.match(/<Link.*?href.*?>/);
      if (linkMatch) {
        const linkText = extractLinkText(trimmedLine, lines, index);
        const href = extractHref(trimmedLine);
        features.links.push({
          id: `LNK-${linkCounter.toString().padStart(3, '0')}`,
          type: 'link',
          name: `${linkText} Link`,
          location: `${file}:${lineNumber}`,
          line: lineNumber,
          code: trimmedLine,
          description: `Link to ${href}`,
          expectedBehavior: `Navigate to ${href}`,
        });
        linkCounter++;
      }

      // Find forms with onSubmit
      const formMatch = trimmedLine.match(/onSubmit.*?=/);
      if (formMatch) {
        const formName = inferFormName(file, lines, index);
        features.forms.push({
          id: `FRM-${formCounter.toString().padStart(3, '0')}`,
          type: 'form',
          name: `${formName} Form`,
          location: `${file}:${lineNumber}`,
          line: lineNumber,
          code: trimmedLine,
          description: `Form submission handler for ${formName}`,
          expectedBehavior: 'Submit form data and handle response',
        });
        formCounter++;
      }

      // Find API calls
      const apiMatch = trimmedLine.match(/fetch\(['"`]\/api\/(.*?)['"`]/);
      if (apiMatch) {
        const endpoint = apiMatch[1];
        const method = inferHttpMethod(trimmedLine, lines, index);
        features.apiEndpoints.push({
          id: `API-${apiCounter.toString().padStart(3, '0')}`,
          type: 'api',
          name: `${method} /api/${endpoint}`,
          location: `${file}:${lineNumber}`,
          line: lineNumber,
          code: trimmedLine,
          description: `API call to ${endpoint}`,
          expectedBehavior: `Make ${method} request to /api/${endpoint}`,
        });
        apiCounter++;
      }

      // Find other interactions (onClick without Button, onChange, etc.)
      const interactionMatches = [
        trimmedLine.match(/onClick.*?=/),
        trimmedLine.match(/onChange.*?=/),
        trimmedLine.match(/onFocus.*?=/),
        trimmedLine.match(/onBlur.*?=/),
      ].filter(Boolean);

      if (interactionMatches.length > 0 && !trimmedLine.includes('<Button')) {
        const elementType = extractElementType(trimmedLine);
        features.interactions.push({
          id: `INT-${interactionCounter.toString().padStart(3, '0')}`,
          type: 'interaction',
          name: `${elementType} Interaction`,
          location: `${file}:${lineNumber}`,
          line: lineNumber,
          code: trimmedLine,
          description: `Interactive ${elementType} element`,
          expectedBehavior: 'Respond to user interaction',
        });
        interactionCounter++;
      }
    });
  }

  features.totalCount = features.buttons.length + features.links.length + 
                      features.forms.length + features.apiEndpoints.length + 
                      features.interactions.length;

  return features;
}

// Helper functions
function extractButtonText(line: string, lines: string[], index: number): string {
  const match = line.match(/>(.*?)</);
  if (match) return match[1].trim();
  
  // Look for text in children components or next lines
  const nextLine = lines[index + 1]?.trim();
  if (nextLine) {
    const nextMatch = nextLine.match(/^\s*(.*?)\s*$/);
    if (nextMatch) return nextMatch[1];
  }
  
  return 'Unknown';
}

function extractLinkText(line: string, lines: string[], index: number): string {
  const match = line.match(/>(.*?)</);
  if (match) return match[1].trim();
  
  const nextLine = lines[index + 1]?.trim();
  if (nextLine) {
    const nextMatch = nextLine.match(/^\s*(.*?)\s*$/);
    if (nextMatch) return nextMatch[1];
  }
  
  return 'Unknown';
}

function extractHref(line: string): string {
  const match = line.match(/href=['"`]([^'"`]*)['"`]/);
  return match ? match[1] : 'unknown';
}

function inferButtonAction(line: string): string {
  if (line.includes('router.push')) return 'navigates';
  if (line.includes('onClick=')) return 'performs action';
  if (line.includes('handleSubmit')) return 'submits form';
  return 'performs action';
}

function inferExpectedBehavior(line: string): string {
  if (line.includes('router.push')) {
    const match = line.match(/router\.push\(['"`]([^'"`]*)['"`]\)/);
    return match ? `Navigate to ${match[1]}` : 'Navigate to target page';
  }
  if (line.includes('onClick=')) return 'Execute click handler';
  return 'Perform intended action';
}

function inferFormName(file: string, lines: string[], index: number): string {
  const fileName = path.basename(file, path.extname(file));
  if (fileName.includes('Form')) return fileName.replace('Form', '');
  
  // Look for component name or form context
  for (let i = Math.max(0, index - 10); i < Math.min(lines.length, index + 5); i++) {
    const line = lines[i];
    if (line.includes('function ') || line.includes('const ')) {
      const match = line.match(/(?:function|const)\s+(\w+)/);
      if (match) return match[1];
    }
  }
  
  return fileName;
}

function inferHttpMethod(line: string, lines: string[], index: number): string {
  // Look for method in options object
  for (let i = index; i < Math.min(lines.length, index + 10); i++) {
    const checkLine = lines[i];
    if (checkLine.includes('method:')) {
      const match = checkLine.match(/method:\s*['"`](\w+)['"`]/);
      if (match) return match[1].toUpperCase();
    }
  }
  
  return 'GET'; // Default assumption
}

function extractElementType(line: string): string {
  const match = line.match(/<(\w+)/);
  return match ? match[1] : 'element';
}

// Generate markdown report
function generateMarkdownReport(features: FeatureInventory): string {
  return `# Love4Detailing Complete Feature Inventory
_Last Updated: ${new Date(features.lastUpdated).toLocaleString()}_  
_Total Features: ${features.totalCount}_

## 📊 Feature Summary
- **Buttons**: ${features.buttons.length}
- **Links**: ${features.links.length}  
- **Forms**: ${features.forms.length}
- **API Endpoints**: ${features.apiEndpoints.length}
- **Other Interactions**: ${features.interactions.length}

## 🔍 How to Use This Inventory
1. Each feature has a unique ID (e.g., BTN-001)
2. Test each feature systematically
3. Mark as ✅ (working) or ❌ (broken)
4. Use the location to quickly find and fix issues

## 🔲 Button Features (${features.buttons.length})

${features.buttons.map(feature => `
### ${feature.id}: ${feature.name}
- **Location**: \`${feature.location}\`
- **Description**: ${feature.description}  
- **Expected**: ${feature.expectedBehavior}
- **Code**: \`${feature.code}\`
- **Status**: [ ] Test Required

`).join('')}

## 🔗 Link Features (${features.links.length})

${features.links.map(feature => `
### ${feature.id}: ${feature.name}
- **Location**: \`${feature.location}\`
- **Description**: ${feature.description}
- **Expected**: ${feature.expectedBehavior}
- **Code**: \`${feature.code}\`
- **Status**: [ ] Test Required

`).join('')}

## 📝 Form Features (${features.forms.length})

${features.forms.map(feature => `
### ${feature.id}: ${feature.name}
- **Location**: \`${feature.location}\`
- **Description**: ${feature.description}
- **Expected**: ${feature.expectedBehavior}
- **Code**: \`${feature.code}\`
- **Status**: [ ] Test Required

`).join('')}

## 🌐 API Endpoints (${features.apiEndpoints.length})

${features.apiEndpoints.map(feature => `
### ${feature.id}: ${feature.name}
- **Location**: \`${feature.location}\`
- **Description**: ${feature.description}
- **Expected**: ${feature.expectedBehavior}
- **Code**: \`${feature.code}\`
- **Status**: [ ] Test Required

`).join('')}

## ⚡ Other Interactions (${features.interactions.length})

${features.interactions.map(feature => `
### ${feature.id}: ${feature.name}
- **Location**: \`${feature.location}\`
- **Description**: ${feature.description}
- **Expected**: ${feature.expectedBehavior}
- **Code**: \`${feature.code}\`
- **Status**: [ ] Test Required

`).join('')}

---
*Generated by Love4Detailing Feature Audit System*
`;
}

// Main execution
async function main() {
  console.log('🔍 Starting feature audit...');
  
  const features = await auditFeatures();
  
  console.log(`📊 Audit Complete!`);
  console.log(`Found ${features.totalCount} interactive features:`);
  console.log(`  - ${features.buttons.length} buttons`);
  console.log(`  - ${features.links.length} links`);
  console.log(`  - ${features.forms.length} forms`);
  console.log(`  - ${features.apiEndpoints.length} API endpoints`);
  console.log(`  - ${features.interactions.length} other interactions`);
  
  // Save JSON inventory
  fs.writeFileSync('feature-inventory.json', JSON.stringify(features, null, 2));
  console.log('💾 Saved inventory to feature-inventory.json');
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(features);
  fs.writeFileSync('FEATURE-INVENTORY.md', markdownReport);
  console.log('📄 Generated FEATURE-INVENTORY.md');
  
  return features;
}

// Export for use in other scripts
export { auditFeatures, type Feature, type FeatureInventory };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}