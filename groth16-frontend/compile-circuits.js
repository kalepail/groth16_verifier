#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

async function compileCircuits() {
  try {
    console.log('🔧 Compiling circuit files...');
    
    const circuitPath = path.join(__dirname, '../data/auxiliary');
    
    // Check if the circuit file exists
    const circuitFile = path.join(circuitPath, 'multiplier2.circom');
    if (!existsSync(circuitFile)) {
      console.error('❌ Circuit file not found:', circuitFile);
      process.exit(1);
    }
    
    // Check if WASM files already exist
    const wasmPath = path.join(circuitPath, 'multiplier2_js/multiplier2.wasm');
    const jsDir = path.join(circuitPath, 'multiplier2_js');
    
    if (existsSync(wasmPath) && existsSync(jsDir)) {
      console.log('✅ WASM files already exist, skipping compilation');
      console.log('💡 To force recompilation, delete the multiplier2_js directory first');
      return;
    }
    
    console.log('📦 Compiling circuit to WASM...');
    
    // Compile circuit to generate WASM and JS files
    // Find system circom, avoiding npm package version
    let circomCmd = 'circom';
    try {
      const { stdout: whichOutput } = await execAsync('which -a circom');
      const circomPaths = whichOutput.trim().split('\n');
      // Prefer system circom over node_modules version
      const systemCircom = circomPaths.find(path => !path.includes('node_modules'));
      if (systemCircom) {
        circomCmd = systemCircom;
        console.log(`Using system circom at: ${circomCmd}`);
      } else {
        console.log('Using first available circom from PATH');
        circomCmd = circomPaths[0];
      }
    } catch {
      console.log('Using circom from PATH');
    }
    
    const { stdout, stderr } = await execAsync(`"${circomCmd}" multiplier2.circom --r1cs --wasm --sym -p bls12381`, {
      cwd: circuitPath
    });
    
    if (stdout) {
      console.log('Compiler output:', stdout);
    }
    if (stderr && !stderr.includes('Everything went okay')) {
      console.warn('Compiler warnings:', stderr);
    }
    
    // Verify compilation was successful
    if (existsSync(wasmPath)) {
      console.log('✅ Circuit compiled successfully');
      console.log('📁 Generated files:');
      console.log(`   - multiplier2.r1cs`);
      console.log(`   - multiplier2.sym`);
      console.log(`   - multiplier2_js/multiplier2.wasm`);
      console.log(`   - multiplier2_js/witness_calculator.js`);
      console.log(`   - multiplier2_js/generate_witness.js`);
      console.log('💡 Run `npm run setup-circuits` to copy files to public directory');
    } else {
      console.error('❌ Compilation failed - WASM file not found');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error compiling circuits:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    process.exit(1);
  }
}

compileCircuits();
