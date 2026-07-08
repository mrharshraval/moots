const fs = require('fs');
const path = require('path');

const replaceInFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.match(/from\s+["']next-auth\/react["']/g)) {
    content = content.replace(/from\s+["']next-auth\/react["']/g, 'from "@/providers/auth-provider"');
    changed = true;
  }
  if (content.match(/from\s+["']next-auth["']/g)) {
    content = content.replace(/from\s+["']next-auth["']/g, 'from "@/providers/auth-provider"');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
};

const walk = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  });
};

walk('./src');
