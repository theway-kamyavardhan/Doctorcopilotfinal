const fs = require('fs');
const path = require('path');

const filesToClean = [
  'src/components/auth/Login.jsx',
  'src/components/doctor/DoctorLayout.jsx',
  'src/components/patient/PatientLayout.jsx',
  'src/pages/doctor/DoctorDashboard.jsx',
  'src/pages/patient/PatientDashboard.jsx',
  'src/pages/patient/Reports.jsx',
  'src/components/landing/Landing.jsx',
];

for (const filePath of filesToClean) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Strip the import if it exists
  content = content.replace(/import useViewport from "\.\.\/\.\.\/hooks\/useViewport";\n?/g, '');
  content = content.replace(/const \{ isMobile \} = useViewport\(\);\n?/g, '');
  
  // For PatientLayout and DoctorLayout
  content = content.replace(/if \(isMobile\) return <(Patient|Doctor)MobileLayout \{\.\.\.sharedProps\} \/>;\n?/g, '');
  
  // For PatientDashboard, DoctorDashboard, Login, Landing
  content = content.replace(/if \(isMobile\) \{[\s\S]*?return <[\s\S]*?\/>;\n\s*\}/g, '');
  
  // For Reports (which might have a different structure)
  content = content.replace(/if \(isMobile\) \{[\s\S]*?return \([\s\S]*?\);\n\s*\}/g, '');
  
  // Cleanup any remaining `if (isMobile)` blocks
  content = content.replace(/if \(isMobile\) \{[\s\S]*?return <[^>]+>;\n\s*\}/g, '');

  fs.writeFileSync(fullPath, content);
}
console.log('Cleanup script finished.');
