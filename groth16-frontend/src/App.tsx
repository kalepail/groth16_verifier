import { useState } from 'react'
import { Buffer } from 'buffer'
import { Client as VerifierClient } from 'verifier-sdk'
import { Keypair, Networks, contract } from '@stellar/stellar-sdk'

const CONTRACT_ID = 'CDO3X7KEORX4VT4PZAQ6PE4APKF3JZ6WBFMARB25SAHO5RFHE3XH5KAO'
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org'

interface ProofData {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}

interface VerificationKey {
  vk_alpha_1: string[]
  vk_beta_2: string[][]
  vk_gamma_2: string[][]
  vk_delta_2: string[][]
  IC: string[][]
}

function App() {
  const [inputs, setInputs] = useState({ a: '3', b: '11' })
  const [proof, setProof] = useState<ProofData | null>(null)
  const [verificationKey, setVerificationKey] = useState<VerificationKey | null>(null)
  const [publicSignals, setPublicSignals] = useState<string[] | null>(null)
  const [manipulatedPublicSignals, setManipulatedPublicSignals] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [contractResult, setContractResult] = useState<any>(null)
  const [secretKey, setSecretKey] = useState('SDK7UGCN6FMRNG6UQU3GCYW56JB4PYQJ4D3UQZFTEB6ISF5FIM5PPIOS')

  // Generate proof using snarkjs
  const generateProof = async () => {
    if (!inputs.a || !inputs.b) {
      alert('Please enter values for a and b')
      return
    }

    setIsGenerating(true)
    try {
      // Import snarkjs dynamically to avoid build issues
      // @ts-ignore - snarkjs types may not be available
      const snarkjs = await import('snarkjs')

      // Calculate expected output
      const expectedOutput = BigInt(inputs.a) * BigInt(inputs.b)

      console.log(`Generating proof for ${inputs.a} * ${inputs.b} = ${expectedOutput}`)

      // Prepare circuit input
      const circuitInput = {
        a: inputs.a,
        b: inputs.b
      }

      console.log('Circuit input:', circuitInput)

      // Generate witness and proof using snarkjs
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        '/circuits/multiplier2.wasm',
        '/circuits/multiplier2_0001.zkey'
      )

      console.log('Generated proof:', proof)
      console.log('Public signals:', publicSignals)

      // Debug: Log the raw pi_b structure to understand format
      console.log('Raw proof.pi_b structure:')
      console.log('  pi_b[0] (X):', proof.pi_b[0])
      console.log('  pi_b[1] (Y):', proof.pi_b[1])
      if (proof.pi_b[2]) {
        console.log('  pi_b[2] (Z):', proof.pi_b[2])
      }

      console.log('Formatted proof:', proof)

      setProof(proof)
      const publicSignalsArray = publicSignals.map((signal: any) => signal.toString())
      setPublicSignals(publicSignalsArray)
      // Initialize the manipulation fields with the original signals
      setManipulatedPublicSignals([...publicSignalsArray])

      // Load verification key
      const vkResponse = await fetch('/circuits/verification_key.json')
      const vk = await vkResponse.json()
      setVerificationKey(vk)

      console.log(`✅ Real proof generated for ${inputs.a} * ${inputs.b} = ${expectedOutput}!`)
    } catch (error) {
      console.error('Error generating proof:', error)
      alert('Error generating proof: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsGenerating(false)
    }
  }

  // Convert proof format for Stellar contract
  const convertProofForStellar = (proof: ProofData, vk: VerificationKey) => {
    // BLS12-381 field modulus
    const FIELD_MODULUS = BigInt('0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab')

    // Helper: convert BigInt to big-endian 48-byte buffer (arkworks uses BE for field encoding)
    const bigIntToBE48 = (n: bigint): Buffer => {
      if (n < 0n) throw new Error('Negative field element')
      const buffer = Buffer.alloc(48)
      let temp = n
      for (let i = 47; i >= 0; i--) {
        buffer[i] = Number(temp & 0xFFn)
        temp >>= 8n
      }
      return buffer
    }

    // Helper: convert G1 point to arkworks uncompressed format (96 bytes)
    const convertG1Point = (point: string[]) => {
      if (Array.isArray(point) && point.length >= 2) {
        let x = BigInt(point[0])
        let y = BigInt(point[1])

        // Ensure coordinates are in the correct field
        x = x % FIELD_MODULUS
        y = y % FIELD_MODULUS

        const buffer = Buffer.alloc(96)

        // Arkworks G1 uncompressed format (96 bytes):
        // Simply X coordinate (48 bytes BE) followed by Y coordinate (48 bytes BE)
        // No additional flag bytes - the serialization is just the raw field elements
        const xBE = bigIntToBE48(x)
        const yBE = bigIntToBE48(y)

        xBE.copy(buffer, 0)  // X coordinate at bytes 0-47
        yBE.copy(buffer, 48) // Y coordinate at bytes 48-95

        return buffer
      }
      return Buffer.alloc(96)
    }

    // Helper: convert G2 point to arkworks uncompressed format (192 bytes)
    const convertG2Point = (point: string[][] | string[]) => {
      // Handle both formats that snarkjs might provide
      if (!Array.isArray(point)) {
        return Buffer.alloc(192)
      }

      // Check if we have a properly formatted G2 point
      if (point.length >= 2 && Array.isArray(point[0]) && Array.isArray(point[1])) {
        // Debug log to understand the input format
        console.log('Converting G2 point:', {
          X: point[0],
          Y: point[1],
          hasZ: point.length > 2
        })

        // Try both possible orderings to see which one works
        // Option 1: snarkjs uses [c1, c0] order (swap needed)
        let x0 = BigInt(point[0][1] || '0')  // c0 component of X
        let x1 = BigInt(point[0][0] || '0')  // c1 component of X
        let y0 = BigInt(point[1][1] || '0')  // c0 component of Y
        let y1 = BigInt(point[1][0] || '0')  // c1 component of Y

        // Ensure coordinates are in the correct field
        x0 = x0 % FIELD_MODULUS
        x1 = x1 % FIELD_MODULUS
        y0 = y0 % FIELD_MODULUS
        y1 = y1 % FIELD_MODULUS

        const buffer = Buffer.alloc(192)

        // Arkworks G2 uncompressed format (192 bytes):
        // X0 (48 bytes BE), X1 (48 bytes BE), Y0 (48 bytes BE), Y1 (48 bytes BE)
        // No additional flag bytes - the serialization is just the raw field elements
        const x0BE = bigIntToBE48(x0)
        const x1BE = bigIntToBE48(x1)
        const y0BE = bigIntToBE48(y0)
        const y1BE = bigIntToBE48(y1)

        x0BE.copy(buffer, 0)   // X0 at bytes 0-47
        x1BE.copy(buffer, 48)  // X1 at bytes 48-95
        y0BE.copy(buffer, 96)  // Y0 at bytes 96-143
        y1BE.copy(buffer, 144) // Y1 at bytes 144-191

        return buffer
      }
      return Buffer.alloc(192)
    }

    return {
      proof: {
        a: convertG1Point(proof.pi_a),
        b: convertG2Point(proof.pi_b),
        c: convertG1Point(proof.pi_c),
      },
      vk: {
        alpha: convertG1Point(vk.vk_alpha_1),
        beta: convertG2Point(vk.vk_beta_2),
        gamma: convertG2Point(vk.vk_gamma_2),
        delta: convertG2Point(vk.vk_delta_2),
        ic: vk.IC.map((point: string[]) => convertG1Point(point)),
      },
    }
  }

  // Verify proof on Stellar contract
  const verifyOnContract = async () => {
    if (!proof || !verificationKey || !publicSignals || manipulatedPublicSignals.length === 0
      // || !secretKey
    ) {
      alert('Please generate a proof first')
      return
    }

    setIsVerifying(true)
    try {
      const keypair = Keypair.fromSecret(secretKey)

      // Create signer for the client
      const walletSigner = contract.basicNodeSigner(keypair, Networks.TESTNET)

      const client = new VerifierClient({
        contractId: CONTRACT_ID,
        networkPassphrase: Networks.TESTNET,
        rpcUrl: SOROBAN_RPC_URL,
        allowHttp: false,
        publicKey: keypair.publicKey(),
        ...walletSigner,
      })

      // Convert proof and verification key to the format expected by the contract
      const { proof: stellarProof, vk: stellarVK } = convertProofForStellar(proof, verificationKey)

      // Debug: Log the original proof.pi_b values before conversion
      console.log('Original proof.pi_b before conversion:', proof.pi_b)

      // Debug: dump first bytes of G2 segments to ensure ordering matches arkworks (x0||x1||y0||y1)
      const segHex = (buf: Buffer, off: number) => Buffer.from(buf.subarray(off, off + 16)).toString('hex')
      console.log('vk.beta segments (first 16 bytes each):', {
        x0: segHex(stellarVK.beta, 0),
        x1: segHex(stellarVK.beta, 48),
        y0: segHex(stellarVK.beta, 96),
        y1: segHex(stellarVK.beta, 144),
      })
      console.log('proof.b segments (first 16 bytes each):', {
        x0: segHex(stellarProof.b, 0),
        x1: segHex(stellarProof.b, 48),
        y0: segHex(stellarProof.b, 96),
        y1: segHex(stellarProof.b, 144),
      })

      // Use manipulated public signals and convert to u256 format
      const stellarPublicSignals = manipulatedPublicSignals.map((signal: string) => BigInt(signal))

      console.log('Using manipulated public signals:', manipulatedPublicSignals)

      console.log('Calling contract with:', {
        vk: stellarVK,
        proof: stellarProof,
        pub_signals: stellarPublicSignals
      })

      const transaction = await client.verify_proof({
        vk: stellarVK,
        proof: stellarProof,
        pub_signals: stellarPublicSignals
      })

      // Sign and send the transaction
      const { result, getTransactionResponse } = await transaction.signAndSend({ force: true })

      console.log('Contract result:', result)
      setContractResult({
        txHash: getTransactionResponse?.txHash,
        ...result
      })

      console.log('Proof verification submitted to contract!')
    } catch (error) {
      console.error('Error verifying on contract:', error)
      alert('Error verifying on contract: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#ffffff', marginBottom: '20px' }}>Groth16 Proof Generator & Stellar Verifier</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ffffff', marginBottom: '15px' }}>Circuit: Multiplier2 (c = a * b)</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
            Input a:
            <input
              type="number"
              value={inputs.a}
              onChange={(e) => setInputs(prev => ({ ...prev, a: e.target.value }))}
              style={{ marginLeft: '10px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '200px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
            Input b:
            <input
              type="number"
              value={inputs.b}
              onChange={(e) => setInputs(prev => ({ ...prev, b: e.target.value }))}
              style={{ marginLeft: '10px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', width: '200px' }}
            />
          </label>
        </div>
        <button
          onClick={generateProof}
          disabled={isGenerating}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            marginTop: '5px'
          }}
        >
          {isGenerating ? 'Generating Proof...' : 'Generate Proof'}
        </button>
      </div>

      {proof && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Generated Proof</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            color: '#333',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            border: '1px solid #ddd',
            maxHeight: '400px'
          }}>
            {JSON.stringify({ proof, publicSignals }, null, 2)}
          </pre>
        </div>
      )}

      {proof && manipulatedPublicSignals.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>🔧 Manipulate Public Signals (for testing verification failure)</h3>
          <p style={{ fontSize: '14px', color: '#ffffff', marginBottom: '15px', lineHeight: '1.4' }}>
            Edit the public signals below to forge/modify the proof data. This should cause verification to fail and return <code style={{ backgroundColor: '#333', color: '#ff6b6b', padding: '3px 6px', borderRadius: '3px', fontWeight: 'bold' }}>false</code>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {manipulatedPublicSignals.map((signal, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ffffff',
                  whiteSpace: 'nowrap'
                }}>
                  Signal {index}:
                </label>
                <input
                  type="text"
                  value={signal}
                  onChange={(e) => {
                    const newSignals = [...manipulatedPublicSignals]
                    newSignals[index] = e.target.value
                    setManipulatedPublicSignals(newSignals)
                  }}
                  style={{
                    width: '200px',
                    padding: '6px 8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    border: '2px solid #e74c3c',
                    borderRadius: '4px',
                    backgroundColor: '#fff5f5',
                    color: '#333',
                    outline: 'none'
                  }}
                />
                <span style={{
                  fontSize: '12px',
                  color: '#cccccc',
                  marginLeft: '10px',
                  whiteSpace: 'nowrap'
                }}>
                  Original: <code style={{ backgroundColor: '#444', color: '#87ceeb', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>{publicSignals?.[index]}</code>
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: '#ffb3b3', marginTop: '12px', fontWeight: '500', lineHeight: '1.3' }}>
            💡 Try changing any values to see verification fail. The proof was generated for the original values shown on the right.
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ffffff', marginBottom: '15px' }}>Stellar Contract Verification</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Secret Key (for signing transactions): 
            <input 
              type="password" 
              value={secretKey} 
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="S..."
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#ffffff' }}>Contract ID: </strong>
          <code style={{ backgroundColor: '#333', color: '#87ceeb', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{CONTRACT_ID}</code>
        </div>
        <button
          onClick={verifyOnContract}
          disabled={isVerifying || !proof}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isVerifying || !proof) ? 'not-allowed' : 'pointer',
            marginTop: '5px'
          }}
        >
          {isVerifying ? 'Verifying on Contract...' : 'Verify on Stellar Contract'}
        </button>
      </div>

      {contractResult && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>Contract Verification Result</h3>
          <pre style={{
            backgroundColor: '#f0f8ff',
            color: '#333',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            border: '1px solid #cce7ff',
            maxHeight: '400px'
          }}>
            {JSON.stringify(contractResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', fontSize: '13px', color: '#cccccc', lineHeight: '1.4' }}>
        <p><strong style={{ color: '#ffffff', fontSize: '14px' }}>Instructions:</strong></p>
        <ol>
          <li>Enter two numbers for the multiplication circuit</li>
          <li>Click "Generate Proof" to create a zero-knowledge proof that you know a and b such that c = a * b</li>
          <li><strong>Optional:</strong> Modify the public signals in the red manipulation field to forge/tamper with the proof</li>
          <li>Enter a Stellar testnet secret key (fund it at https://laboratory.stellar.org)</li>
          <li>Click "Verify on Stellar Contract" to submit the proof to the blockchain (should return false if signals were tampered)</li>
        </ol>
      </div>
    </div>
  )
}

export default App
