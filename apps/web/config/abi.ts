export const REGISTRY_ABI = [
  {
    "type": "function",
    "name": "stakeForChallenge",
    "inputs": [{ "name": "topic", "type": "string", "internalType": "string" }],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "recordAttestation",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "topic", "type": "string", "internalType": "string" },
      { "name": "score", "type": "uint256", "internalType": "uint256" },
      { "name": "nonce", "type": "uint256", "internalType": "uint256" },
      { "name": "signature", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stakes",
    "inputs": [
      { "name": "", "type": "address", "internalType": "address" },
      { "name": "", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "deadline", "type": "uint256", "internalType": "uint256" },
      { "name": "status", "type": "uint8", "internalType": "enum IRTFMSovereign.State" },
      { "name": "attemptNumber", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Staked",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "topicHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "deadline", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AttestationRecorded",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "topicHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "score", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const
