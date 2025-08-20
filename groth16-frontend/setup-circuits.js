#!/usr/bin/env node
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupCircuits() {
  try {
    console.log('🔧 Setting up circuit files for browser proof generation...');
    
    const circuitPath = path.join(__dirname, '../data/auxiliary');
    const publicCircuitsPath = path.join(__dirname, 'public/circuits');
    
    // Ensure circuits directory exists
    await mkdir(publicCircuitsPath, { recursive: true });
    
    // Check if compiled WASM files exist
    const wasmPath = path.join(circuitPath, 'multiplier2_js/multiplier2.wasm');
    if (!existsSync(wasmPath)) {
      console.error('❌ WASM file not found. Please run `npm run compile-circuits` first.');
      console.log('💡 This will compile the circuit and generate the necessary WASM files.');
      process.exit(1);
    }
    
    // Copy necessary files to public directory
    const filesToCopy = [
      {
        src: path.join(circuitPath, 'multiplier2_js/multiplier2.wasm'),
        dest: path.join(publicCircuitsPath, 'multiplier2.wasm')
      },
      {
        src: path.join(circuitPath, 'multiplier2_0001.zkey'),  
        dest: path.join(publicCircuitsPath, 'multiplier2_0001.zkey')
      },
      {
        src: path.join(__dirname, '../data/verification_key.json'),
        dest: path.join(publicCircuitsPath, 'verification_key.json')
      }
    ];
    
    console.log('📁 Copying circuit files to public directory...');
    
    for (const file of filesToCopy) {
      if (existsSync(file.src)) {
        await copyFile(file.src, file.dest);
        console.log(`✅ Copied ${path.basename(file.src)}`);
      } else {
        console.error(`❌ Source file not found: ${file.src}`);
        if (file.src.includes('.wasm')) {
          console.log('💡 Run `npm run compile-circuits` to generate WASM files');
        }
        process.exit(1);
      }
    }
    
    console.log('🎉 Circuit setup complete! You can now generate real proofs.');
    console.log('💡 Run `npm run dev` to start the development server');
    
  } catch (error) {
    console.error('❌ Error setting up circuits:', error);
    process.exit(1);
  }
}

setupCircuits();
