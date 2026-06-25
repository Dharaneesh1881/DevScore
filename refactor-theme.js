import fs from 'fs';
import path from 'path';

const map = {
    // Backgrounds
    '[#0f0f1a]': '[var(--bg-base)]',
    '[#0d0d1a]': '[var(--bg-surface)]',
    '[#1a1a2e]': '[var(--bg-surface-alt)]',
    '[#13132a]': '[var(--bg-surface-alt)]', // tooltip bg

    // Borders
    '[#2a2a4a]': '[var(--border-color)]',
    '[#3a3a5a]': '[var(--border-light)]',

    // Text
    'text-white': 'text-[var(--text-strong)]',
    '[#e0e0e0]': '[var(--text-main)]',
    '[#ccc]': '[var(--text-muted)]',
    '[#888]': '[var(--text-muted)]',
    '[#666]': '[var(--text-faint)]',
    '[#555]': '[var(--text-faint)]',
    '[#444]': '[var(--text-faintest)]',
    'bg-white/10': 'bg-[var(--text-strong)]/10',

    // Accents (optional, keep blue but maybe tweak opacity)
    // We will leave #4e9af1 and #2f80ed alone as primary blue works in both modes.
};

const dirsToMigrate = [
    'frontend/src/components',
    'frontend/src/pages',
];

const excludeFiles = [
    'AdminDashboard.jsx',
    'AdminLogin.jsx'
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            if (excludeFiles.some(ex => fullPath.includes(ex))) {
                continue;
            }

            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            for (const [key, value] of Object.entries(map)) {
                // Simple replace all using string split/join
                content = content.split(key).join(value);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Migrated: ${fullPath}`);
            }
        }
    }
}

dirsToMigrate.forEach(processDir);
console.log('Done refactoring theme colors.');
