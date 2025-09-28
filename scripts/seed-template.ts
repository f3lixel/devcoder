import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Load Supabase credentials from environment or secrets file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyvxquavfhopegjagwqs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FileEntry {
  path: string;
  content: string;
}

function readDirectoryRecursive(dirPath: string, basePath: string = ''): FileEntry[] {
  const files: FileEntry[] = [];
  const items = readdirSync(dirPath);

  for (const item of items) {
    const fullPath = join(dirPath, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    
    // Skip node_modules, .git, .next, and other build directories
    if (item === 'node_modules' || item === '.git' || item === '.next' || item === 'dist' || item === 'build') {
      continue;
    }

    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...readDirectoryRecursive(fullPath, relativePath));
    } else {
      // Only include text files and common web development files
      const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css', '.scss', '.html', '.svg', '.env.example'];
      const hasValidExtension = textExtensions.some(ext => item.endsWith(ext));
      
      if (hasValidExtension || item === 'README.md' || item === 'package.json' || item === 'tsconfig.json') {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          files.push({
            path: relativePath,
            content
          });
        } catch (error) {
          console.warn(`Skipping binary file: ${relativePath}`);
        }
      }
    }
  }

  return files;
}

async function uploadTemplate() {
  console.log('🚀 Starting template upload to Supabase Storage...');
  
  // Read the next-shadcn-starter directory
  const templatePath = join(process.cwd(), '..', 'next-shadcn-starter');
  console.log(`📁 Reading template from: ${templatePath}`);
  
  const files = readDirectoryRecursive(templatePath);
  console.log(`📄 Found ${files.length} files to upload`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const storagePath = `templates/default/${file.path}`;
    
    try {
      const { error } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file.content, {
          contentType: 'text/plain',
          upsert: true
        });

      if (error) {
        console.error(`❌ Error uploading ${file.path}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Uploaded: ${file.path}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Exception uploading ${file.path}:`, error);
      errorCount++;
    }
  }

  console.log(`\n🎉 Upload complete!`);
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed uploads: ${errorCount} files`);
  
  if (errorCount === 0) {
    console.log('🎊 All files uploaded successfully!');
  }
}

// Run the upload
uploadTemplate().catch(console.error);




