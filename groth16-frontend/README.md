# Groth16 Frontend - React ZK Proof Interface

A modern React web application for generating and verifying Groth16 zero-knowledge proofs on the Stellar blockchain. This frontend provides an intuitive interface for creating privacy-preserving proofs using circom circuits and Soroban smart contracts.

## 🚀 Overview

This React application serves as the user interface for the Groth16 verifier ecosystem, enabling users to:

- **🔢 Interactive Proof Generation**: Create zero-knowledge proofs for mathematical operations in-browser
- **⭐ Stellar Blockchain Integration**: Submit and verify proofs on Stellar testnet using Soroban contracts  
- **🎨 Modern UI/UX**: Clean, responsive interface built with React 19 and Vite
- **🔐 Privacy-First Design**: Generate proofs without revealing private inputs

## ✨ Key Features

### Zero-Knowledge Proof Generation
- **Client-Side Processing**: Generate proofs entirely in the browser using WebAssembly
- **Real-Time Circuit Execution**: Instant witness calculation and proof generation
- **Interactive Input Validation**: Real-time validation of circuit constraints
- **Proof Visualization**: JSON display of generated proof data structures

### Stellar Integration
- **Testnet Integration**: Connect to Stellar testnet for proof verification
- **Soroban Contract Calls**: Direct smart contract interaction for on-chain verification
- **Transaction Management**: Handle transaction signing and submission
- **Account Management**: Support for secret key input and validation

### Developer Experience
- **TypeScript Support**: Full type safety throughout the application
- **Hot Module Replacement**: Instant development feedback with Vite
- **Circuit Hot Reloading**: Automatic circuit recompilation and deployment
- **Error Boundaries**: Comprehensive error handling and user feedback

## 🛠️ Technical Architecture

### Frontend Stack
```
React 19.1.1          # UI framework with concurrent features
Vite 7.1.3            # Fast build tool and dev server
TypeScript 5.9.2      # Type-safe development
@stellar/stellar-sdk  # Blockchain interactions
snarkjs 0.7.5         # ZK proof generation
verifier-sdk          # Custom contract bindings
```

### Circuit Integration
```
multiplier2.circom    # Source circuit definition
multiplier2.wasm      # Compiled WASM for browser execution
multiplier2.zkey      # Proving key for proof generation
verification_key.json # Verification key for proof validation
```

### State Management
- **React Hooks**: Local component state management
- **useState**: Form inputs and application state
- **useEffect**: Circuit loading and cleanup
- **Error States**: Comprehensive error handling and display

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** or **pnpm** package manager
- **Modern Browser** with WebAssembly support

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Prepare circuit files:**
   ```bash
   npm run prepare-circuits
   ```
   This command:
   - Compiles the circom circuit to WebAssembly
   - Generates witness calculator
   - Copies necessary files to `public/circuits/`

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

### Circuit Commands

| Command | Description | Output |
|---------|-------------|--------|
| `npm run compile-circuits` | Compile circom to WASM | Generates WASM and witness calculator |
| `npm run setup-circuits` | Copy files to public directory | Prepares circuit files for browser use |
| `npm run prepare-circuits` | Run both compile and setup | Complete circuit preparation |

## 💻 Usage Guide

### 1. Generate Zero-Knowledge Proof

1. **Enter Private Inputs:**
   - Input field `a`: Enter first private number (e.g., `3`)
   - Input field `b`: Enter second private number (e.g., `11`)

2. **Generate Proof:**
   - Click **"Generate Proof"** button
   - Wait for circuit compilation and witness generation
   - View generated proof in JSON format

3. **Proof Components:**
   ```json
   {
     "pi_a": ["G1 point coordinates"],
     "pi_b": ["G2 point coordinates"], 
     "pi_c": ["G1 point coordinates"],
     "protocol": "groth16",
     "curve": "bn128"
   }
   ```

### 2. Verify on Stellar Blockchain

1. **Get Testnet Account:**
   - Visit [Stellar Laboratory](https://laboratory.stellar.org)
   - Generate testnet keypair
   - Fund account with testnet XLM

2. **Submit Proof:**
   - Paste secret key in the verification section
   - Click **"Verify on Stellar Contract"**
   - Monitor transaction status and results

3. **Contract Response:**
   - `true`: Proof successfully verified on-chain
   - `false`: Proof verification failed
   - Error: Transaction or contract execution failed

## 🔧 Development

### Project Structure
```
groth16-frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── public/
│   └── circuits/            # Circuit files for browser
│       ├── multiplier2.wasm # Compiled circuit
│       ├── multiplier2_0001.zkey # Proving key
│       └── verification_key.json # Verification key
├── compile-circuits.js      # Circuit compilation script
├── setup-circuits.js       # Circuit setup automation
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite configuration
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Start dev server with HMR |
| Build | `npm run build` | Create production build |
| Preview | `npm run preview` | Preview production build |
| Lint | `npm run lint` | Run ESLint checks |
| Type Check | `npm run typecheck` | Run TypeScript validation |

### Environment Configuration

Create `.env.local` for custom configuration:
```env
VITE_CONTRACT_ID=your_contract_id_here
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK=testnet
```

### Circuit Development

To modify or add circuits:

1. **Edit Circuit File:**
   ```bash
   # Edit the circuit definition
   vim ../data/auxiliary/multiplier2.circom
   ```

2. **Recompile and Deploy:**
   ```bash
   npm run prepare-circuits
   ```

3. **Test in Browser:**
   - Refresh the application
   - Verify new circuit constraints work correctly

## 🔐 Security Considerations

### ⚠️ Important Warnings

**This is demonstration software - NOT for production use without security auditing.**

### Known Security Issues

1. **Private Key Storage**: Keys stored in browser localStorage (insecure)
2. **Circuit Validation**: Limited input validation on circuit parameters
3. **Trusted Setup**: Uses basic powers-of-tau ceremony (not production-grade)
4. **Error Handling**: May leak sensitive information through error messages
5. **CORS Configuration**: Permissive CORS settings for development

### Production Security Checklist

- [ ] **Implement secure key management** (hardware wallets, encrypted storage)
- [ ] **Add comprehensive input validation** (range checks, format validation)
- [ ] **Use production-grade trusted setup** (multi-party ceremony)
- [ ] **Implement proper error handling** (sanitized error messages)
- [ ] **Configure restrictive CORS** (specific domain allowlists)
- [ ] **Add rate limiting** (prevent spam proof generation)
- [ ] **Implement audit logging** (track proof generation and verification)

## 🐛 Troubleshooting

### Common Issues

**Circuit compilation fails:**
```bash
# Ensure circom is installed and in PATH
circom --version

# Check for syntax errors in circuit file
circom ../data/auxiliary/multiplier2.circom --r1cs --wasm
```

**WebAssembly loading errors:**
```javascript
// Check browser console for WASM loading errors
// Ensure files are served with correct MIME types
// Verify circuit files exist in public/circuits/
```

**Stellar transaction failures:**
```bash
# Verify account has sufficient XLM balance
# Check contract ID is correct and deployed
# Ensure network configuration matches deployment
```

**Proof generation hangs:**
```javascript
// Check browser console for JavaScript errors
// Verify witness calculator is loaded correctly
// Ensure inputs meet circuit constraints
```

### Debug Mode

Enable verbose logging:
```javascript
// Add to App.tsx for debugging
const DEBUG = true;
if (DEBUG) {
  console.log('Proof generation state:', { proof, inputs, isGenerating });
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Circuit Compilation**: Circuits compile without errors
- [ ] **Proof Generation**: Valid proofs generated for valid inputs
- [ ] **Input Validation**: Invalid inputs properly rejected
- [ ] **Stellar Integration**: Transactions submit successfully
- [ ] **Error Handling**: Errors displayed user-friendly messages
- [ ] **Responsive Design**: UI works on mobile and desktop

### Browser Compatibility

| Browser | Version | WebAssembly | Stellar SDK | Status |
|---------|---------|-------------|-------------|--------|
| Chrome | 120+ | ✅ | ✅ | Fully Supported |
| Firefox | 119+ | ✅ | ✅ | Fully Supported |
| Safari | 17+ | ✅ | ✅ | Fully Supported |
| Edge | 120+ | ✅ | ✅ | Fully Supported |

## 🚀 Performance Optimization

### Circuit Performance
- **Proof Generation**: ~2-5 seconds for simple circuits
- **WASM Loading**: ~500ms for circuit compilation
- **Witness Calculation**: <100ms for basic operations

### Bundle Optimization
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Optimize for production
npm run build -- --minify terser
```

### Memory Usage
- **Circuit Files**: ~2MB for WASM + proving key
- **Runtime Memory**: ~50MB during proof generation
- **Browser Cache**: Persistent caching for circuit files

## 📚 Additional Resources

### Documentation
- [Circom Language Reference](https://docs.circom.io/circom-language/basic-operators/)
- [snarkjs API Documentation](https://github.com/iden3/snarkjs)
- [Stellar SDK Guide](https://developers.stellar.org/docs/build/guides/sdks/)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/smart-contracts)

### Educational Content
- [Zero-Knowledge Proofs Explained](https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/)
- [Groth16 Protocol Overview](https://eprint.iacr.org/2016/260.pdf)
- [Circuit Design Best Practices](https://docs.circom.io/getting-started/writing-circuits/)

## 🤝 Contributing

We welcome contributions! Please consider:

1. **Code Quality**: Follow TypeScript best practices
2. **Testing**: Add tests for new features
3. **Documentation**: Update documentation for changes
4. **Security**: Consider security implications of changes
5. **Performance**: Profile performance impact of modifications

---

**⚠️ Development Note**: This frontend is part of a larger zero-knowledge proof ecosystem. See the [main project README](../README.md) for complete system documentation and deployment instructions.
