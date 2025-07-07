```
TASK: Fix ShadCN UI Component Import Case Sensitivity Issues

OBJECTIVE: Systematically identify and fix all files in the codebase that are importing ShadCN UI components with incorrect case sensitivity (uppercase vs lowercase file paths).

INSTRUCTIONS:

1. SCAN ALL FILES:
   - Search through entire `src/` directory
   - Check all `.tsx`, `.ts`, `.jsx`, `.js` files
   - Look for import statements that reference `@/components/ui/` with uppercase component names

2. IDENTIFY PROBLEMATIC IMPORTS:
   Find imports matching these patterns:
   - `from '@/components/ui/Label'` (should be `label`)
   - `from '@/components/ui/Textarea'` (should be `textarea`)
   - `from '@/components/ui/Button'` (should be `button`)
   - `from '@/components/ui/Input'` (should be `input`)
   - `from '@/components/ui/Card'` (should be `card`)
   - `from '@/components/ui/Dialog'` (should be `dialog`)
   - `from '@/components/ui/Select'` (should be `select`)
   - `from '@/components/ui/Switch'` (should be `switch`)
   - `from '@/components/ui/Toast'` (should be `toast`)
   - `from '@/components/ui/Checkbox'` (should be `checkbox`)
   - `from '@/components/ui/RadioGroup'` (should be `radio-group`)
   - `from '@/components/ui/Calendar'` (should be `calendar`)
   - `from '@/components/ui/Popover'` (should be `popover`)
   - `from '@/components/ui/Avatar'` (should be `avatar`)
   - `from '@/components/ui/Badge'` (should be `badge`)
   - `from '@/components/ui/Tabs'` (should be `tabs`)
   - `from '@/components/ui/Form'` (should be `form`)
   - `from '@/components/ui/Separator'` (should be `separator`)
   - `from '@/components/ui/DropdownMenu'` (should be `dropdown-menu`)
   - `from '@/components/ui/NavigationMenu'` (should be `navigation-menu`)
   - `from '@/components/ui/Command'` (should be `command`)
   - `from '@/components/ui/Sheet'` (should be `sheet`)
   - `from '@/components/ui/Slider'` (should be `slider`)
   - `from '@/components/ui/Progress'` (should be `progress`)
   - `from '@/components/ui/Skeleton'` (should be `skeleton`)
   - `from '@/components/ui/Table'` (should be `table`)
   - `from '@/components/ui/Accordion'` (should be `accordion`)
   - `from '@/components/ui/AlertDialog'` (should be `alert-dialog`)
   - `from '@/components/ui/ContextMenu'` (should be `context-menu`)
   - `from '@/components/ui/HoverCard'` (should be `hover-card`)
   - `from '@/components/ui/Menubar'` (should be `menubar`)
   - `from '@/components/ui/ScrollArea'` (should be `scroll-area`)
   - `from '@/components/ui/Toggle'` (should be `toggle`)
   - `from '@/components/ui/ToggleGroup'` (should be `toggle-group`)
   - `from '@/components/ui/Tooltip'` (should be `tooltip`)

3. REPLACEMENT RULES:
   - File paths in imports must be lowercase
   - Component names in the import statement remain PascalCase
   - Example: `import { Label } from '@/components/ui/Label'` → `import { Label } from '@/components/ui/label'`
   - Example: `import { Textarea } from '@/components/ui/Textarea'` → `import { Textarea } from '@/components/ui/textarea'`

4. SEARCH COMMANDS TO RUN:
   ```bash
   # Search for all problematic imports
   grep -r "from '@/components/ui/[A-Z]" src/
   
   # Search for specific common issues
   grep -r "from '@/components/ui/Label'" src/
   grep -r "from '@/components/ui/Textarea'" src/
   grep -r "from '@/components/ui/Button'" src/
   grep -r "from '@/components/ui/Input'" src/
   grep -r "from '@/components/ui/Card'" src/
   grep -r "from '@/components/ui/Dialog'" src/
   grep -r "from '@/components/ui/Select'" src/
   ```

5. AUTOMATED FIXES:
   Run these replacement commands for each identified issue:
   ```bash
   # Fix Label imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Label/@\/components\/ui\/label/g' {} \;
   
   # Fix Textarea imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Textarea/@\/components\/ui\/textarea/g' {} \;
   
   # Fix Button imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Button/@\/components\/ui\/button/g' {} \;
   
   # Fix Input imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Input/@\/components\/ui\/input/g' {} \;
   
   # Fix Card imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Card/@\/components\/ui\/card/g' {} \;
   
   # Fix Dialog imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Dialog/@\/components\/ui\/dialog/g' {} \;
   
   # Fix Select imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Select/@\/components\/ui\/select/g' {} \;
   
   # Fix Switch imports
   find src -name "*.tsx" -o -name "*.ts" -exec sed -i 's/@\/components\/ui\/Switch/@\/components\/ui\/switch/g' {} \;
   
   # Add more replacement commands as needed for other components
   ```

6. VERIFICATION STEPS:
   - After making changes, run `npm run build` to test compilation
   - Check that all import statements now use lowercase file paths
   - Verify component names in imports remain PascalCase
   - Ensure no broken imports remain

7. FILES TO PRIORITIZE:
   Based on the error log, check these files first:
   - `src/app/(public)/booking/vehicle/page.tsx`
   - `src/app/auth/admin-login/page.tsx`
   - `src/components/admin/EditBookingModal.tsx`
   - `src/components/admin/WeeklyScheduleConfig.tsx`
   - `src/app/admin/availability/page.tsx`

8. FINAL VALIDATION:
   - Run `npm run build` to ensure no compilation errors
   - Check that all ShadCN UI components are properly imported
   - Verify the application builds successfully without webpack errors

EXPECTED OUTCOME: All ShadCN UI component imports should use lowercase file paths while maintaining PascalCase component names, eliminating all "Module not found" errors during build.
```