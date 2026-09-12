import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

function runPythonScript(command: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing: ${command}`, stderr || error.message);
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function POST() {
  const rootDir = process.cwd();

  try {
    console.log('[API /api/sync] Starting Google Sheets sync...');
    
    // Step 1: Download from Google Sheets into data/
    const syncScript = path.join(rootDir, '.agents', 'skills', 'data-sync', 'scripts', 'sync.py');
    const downloadOutput = await runPythonScript(`python "${syncScript}"`, rootDir);
    console.log('[API /api/sync] Download finished:\n', downloadOutput);

    // Step 2: Compile CSVs into src/lib/data.ts
    const compileScript = path.join(rootDir, 'sync_data_to_web.py');
    const compileOutput = await runPythonScript(`python "${compileScript}"`, rootDir);
    console.log('[API /api/sync] Data compilation finished:\n', compileOutput);

    return NextResponse.json({
      success: true,
      message: 'Data berhasil disinkronkan dari Google Sheets!',
      details: {
        download: downloadOutput.trim(),
        compile: compileOutput.trim(),
      },
    });
  } catch (err: any) {
    console.error('[API /api/sync] Failed:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal menyinkronkan data dari Google Sheets.',
      },
      { status: 500 }
    );
  }
}
