#![cfg(test)]
extern crate std;

use ark_bls12_381::{Fq, Fq2};
use ark_serialize::CanonicalSerialize;
use core::str::FromStr;
use soroban_sdk::{
    crypto::bls12_381::{Fr, G1Affine, G2Affine, G1_SERIALIZED_SIZE, G2_SERIALIZED_SIZE},
    Env, Vec, U256,
};
use std::fs;
use serde_json::Value;

use crate::{Groth16Verifier, Groth16VerifierClient, Proof, VerificationKey};

fn g1_from_coords(env: &Env, x: &str, y: &str) -> G1Affine {
    let ark_g1 = ark_bls12_381::G1Affine::new(Fq::from_str(x).unwrap(), Fq::from_str(y).unwrap());
    let mut buf = [0u8; G1_SERIALIZED_SIZE];
    ark_g1.serialize_uncompressed(&mut buf[..]).unwrap();
    G1Affine::from_array(env, &buf)
}

fn g2_from_coords(env: &Env, x1: &str, x2: &str, y1: &str, y2: &str) -> G2Affine {
    let x = Fq2::new(Fq::from_str(x1).unwrap(), Fq::from_str(x2).unwrap());
    let y = Fq2::new(Fq::from_str(y1).unwrap(), Fq::from_str(y2).unwrap());
    let ark_g2 = ark_bls12_381::G2Affine::new(x, y);
    let mut buf = [0u8; G2_SERIALIZED_SIZE];
    ark_g2.serialize_uncompressed(&mut buf[..]).unwrap();
    G2Affine::from_array(env, &buf)
}

fn create_client(e: &Env) -> Groth16VerifierClient {
    Groth16VerifierClient::new(e, &e.register(Groth16Verifier {}, ()))
}

fn load_verification_key(env: &Env) -> VerificationKey {
    let vk_data = fs::read_to_string("data/verification_key.json").unwrap();
    let vk_json: Value = serde_json::from_str(&vk_data).unwrap();
    
    // Parse alpha (G1 point)
    let alpha_x = vk_json["vk_alpha_1"][0].as_str().unwrap();
    let alpha_y = vk_json["vk_alpha_1"][1].as_str().unwrap();
    let alpha = g1_from_coords(env, alpha_x, alpha_y);
    
    // Parse beta (G2 point)
    let beta_x1 = vk_json["vk_beta_2"][0][0].as_str().unwrap();
    let beta_x2 = vk_json["vk_beta_2"][0][1].as_str().unwrap();
    let beta_y1 = vk_json["vk_beta_2"][1][0].as_str().unwrap();
    let beta_y2 = vk_json["vk_beta_2"][1][1].as_str().unwrap();
    let beta = g2_from_coords(env, beta_x1, beta_x2, beta_y1, beta_y2);
    
    // Parse gamma (G2 point)
    let gamma_x1 = vk_json["vk_gamma_2"][0][0].as_str().unwrap();
    let gamma_x2 = vk_json["vk_gamma_2"][0][1].as_str().unwrap();
    let gamma_y1 = vk_json["vk_gamma_2"][1][0].as_str().unwrap();
    let gamma_y2 = vk_json["vk_gamma_2"][1][1].as_str().unwrap();
    let gamma = g2_from_coords(env, gamma_x1, gamma_x2, gamma_y1, gamma_y2);
    
    // Parse delta (G2 point)
    let delta_x1 = vk_json["vk_delta_2"][0][0].as_str().unwrap();
    let delta_x2 = vk_json["vk_delta_2"][0][1].as_str().unwrap();
    let delta_y1 = vk_json["vk_delta_2"][1][0].as_str().unwrap();
    let delta_y2 = vk_json["vk_delta_2"][1][1].as_str().unwrap();
    let delta = g2_from_coords(env, delta_x1, delta_x2, delta_y1, delta_y2);
    
    // Parse IC points
    let ic_array = vk_json["IC"].as_array().unwrap();
    let mut ic_points = std::vec::Vec::new();
    for ic_point in ic_array {
        let ic_x = ic_point[0].as_str().unwrap();
        let ic_y = ic_point[1].as_str().unwrap();
        ic_points.push(g1_from_coords(env, ic_x, ic_y));
    }
    let ic = Vec::from_slice(env, &ic_points);
    
    VerificationKey {
        alpha,
        beta,
        gamma,
        delta,
        ic,
    }
}

fn load_proof(env: &Env) -> Proof {
    let proof_data = fs::read_to_string("data/proof.json").unwrap();
    let proof_json: Value = serde_json::from_str(&proof_data).unwrap();
    
    // Parse pi_a (G1 point)
    let pi_a_x = proof_json["pi_a"][0].as_str().unwrap();
    let pi_a_y = proof_json["pi_a"][1].as_str().unwrap();
    let a = g1_from_coords(env, pi_a_x, pi_a_y);
    
    // Parse pi_b (G2 point)
    let pi_b_x1 = proof_json["pi_b"][0][0].as_str().unwrap();
    let pi_b_x2 = proof_json["pi_b"][0][1].as_str().unwrap();
    let pi_b_y1 = proof_json["pi_b"][1][0].as_str().unwrap();
    let pi_b_y2 = proof_json["pi_b"][1][1].as_str().unwrap();
    let b = g2_from_coords(env, pi_b_x1, pi_b_x2, pi_b_y1, pi_b_y2);
    
    // Parse pi_c (G1 point)
    let pi_c_x = proof_json["pi_c"][0].as_str().unwrap();
    let pi_c_y = proof_json["pi_c"][1].as_str().unwrap();
    let c = g1_from_coords(env, pi_c_x, pi_c_y);
    
    Proof { a, b, c }
}

fn load_public_signals(env: &Env) -> Vec<Fr> {
    let public_data = fs::read_to_string("data/public.json").unwrap();
    let public_json: Value = serde_json::from_str(&public_data).unwrap();
    
    let public_array = public_json.as_array().unwrap();
    let mut signals = std::vec::Vec::new();
    for signal in public_array {
        let signal_str = signal.as_str().unwrap();
        let signal_u32: u32 = signal_str.parse().unwrap();
        signals.push(Fr::from_u256(U256::from_u32(env, signal_u32)));
    }
    
    Vec::from_slice(env, &signals)
}

#[test]
fn test() {
    // Initialize the test environment
    let env = Env::default();

    // Load verification key, proof, and public signals from JSON files
    let vk = load_verification_key(&env);
    let proof = load_proof(&env);
    let public_signals = load_public_signals(&env);

    // Create the contract client
    let client = create_client(&env);

    // Test Case 1: Verify the proof with the correct public output (loaded from `data/public.json`)
    let res = client.verify_proof(&vk, &proof, &public_signals);
    assert_eq!(res, true);

    // Print out the budget report showing CPU and memory cost breakdown for
    // different operations (zero-value operations omitted for brevity)
    env.cost_estimate().budget().print();
    /*
    =================================================================
    Cpu limit: 100000000; used: 40968821
    Mem limit: 41943040; used: 297494
    =================================================================
    CostType                           cpu_insns      mem_bytes      
    WasmInsnExec                       0              0              
    MemAlloc                           12089          3401           
    MemCpy                             3091           0              
    MemCmp                             928            0              
    DispatchHostFunction               0              0              
    VisitObject                        5917           0              
    ValSer                             0              0              
    ValDeser                           0              0              
    ComputeSha256Hash                  3738           0              
    ComputeEd25519PubKey               0              0              
    VerifyEd25519Sig                   0              0              
    VmInstantiation                    0              0              
    VmCachedInstantiation              0              0              
    InvokeVmFunction                   0              0              
    ComputeKeccak256Hash               0              0              
    DecodeEcdsaCurve256Sig             0              0              
    RecoverEcdsaSecp256k1Key           0              0              
    Int256AddSub                       0              0              
    Int256Mul                          0              0              
    Int256Div                          0              0              
    Int256Pow                          0              0              
    Int256Shift                        0              0              
    ChaCha20DrawBytes                  0              0              
    ParseWasmInstructions              0              0              
    ParseWasmFunctions                 0              0              
    ParseWasmGlobals                   0              0              
    ParseWasmTableEntries              0              0              
    ParseWasmTypes                     0              0              
    ParseWasmDataSegments              0              0              
    ParseWasmElemSegments              0              0              
    ParseWasmImports                   0              0              
    ParseWasmExports                   0              0              
    ParseWasmDataSegmentBytes          0              0              
    InstantiateWasmInstructions        0              0              
    InstantiateWasmFunctions           0              0              
    InstantiateWasmGlobals             0              0              
    InstantiateWasmTableEntries        0              0              
    InstantiateWasmTypes               0              0              
    InstantiateWasmDataSegments        0              0              
    InstantiateWasmElemSegments        0              0              
    InstantiateWasmImports             0              0              
    InstantiateWasmExports             0              0              
    InstantiateWasmDataSegmentBytes    0              0              
    Sec1DecodePointUncompressed        0              0              
    VerifyEcdsaSecp256r1Sig            0              0              
    Bls12381EncodeFp                   2644           0              
    Bls12381DecodeFp                   29550          0              
    Bls12381G1CheckPointOnCurve        13538          0              
    Bls12381G1CheckPointInSubgroup     3652550        0              
    Bls12381G2CheckPointOnCurve        23684          0              
    Bls12381G2CheckPointInSubgroup     4231288        0              
    Bls12381G1ProjectiveToAffine       185284         0              
    Bls12381G2ProjectiveToAffine       0              0              
    Bls12381G1Add                      7689           0              
    Bls12381G1Mul                      2458985        0              
    Bls12381G1Msm                      0              0              
    Bls12381MapFpToG1                  0              0              
    Bls12381HashToG1                   0              0              
    Bls12381G2Add                      0              0              
    Bls12381G2Mul                      0              0              
    Bls12381G2Msm                      0              0              
    Bls12381MapFp2ToG2                 0              0              
    Bls12381HashToG2                   0              0              
    Bls12381Pairing                    30335852       294093         
    Bls12381FrFromU256                 1994           0              
    Bls12381FrToU256                   0              0              
    Bls12381FrAddSub                   0              0              
    Bls12381FrMul                      0              0              
    Bls12381FrPow                      0              0              
    Bls12381FrInv                      0              0              
    =================================================================
    */

    // Test Case 2: Verify the proof with an incorrect public output (22)
    let incorrect_output = Vec::from_array(&env, [Fr::from_u256(U256::from_u32(&env, 22))]);
    let res = client.verify_proof(&vk, &proof, &incorrect_output);
    assert_eq!(res, false);
}
