// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SkillAttestation
 * @dev Verification Layer: Handles data attestation, signature verification, and IPFS hashes.
 *      Only the TEE can submit attestations.
 */
contract SkillAttestation is EIP712, Ownable {
    using ECDSA for bytes32;

    struct Attestation {
        uint256 score;           // 0-100
        uint256 timestamp;       // block.timestamp
        bytes signature;         // TEE EIP-712 signature (65 bytes)
        string ipfsHash;         // Code history snapshot
        bool exists;             // Verification flag
        uint256[] milestoneScores; // Individual milestone scores
    }

    // Mapping from user => skill topic => Attestation
    mapping(address => mapping(string => Attestation)) public attestations;
    // Count of attestations per user
    mapping(address => uint256) public userAttestationCount;
    // Array of skill topics attested for a user (for enumeration)
    mapping(address => string[]) public userAttestedSkills;

    address public teeSigner;

    event AttestationSubmitted(address indexed user, string indexed skill, uint256 score, uint256 timestamp);
    event TEESignerUpdated(address indexed newSigner);

    // EIP-712 TypeHash
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256("Attestation(address user,string skill,uint256 score,uint256 nonce)");

    modifier onlyTEE() {
        require(msg.sender == teeSigner, "Only TEE can call this function");
        _;
    }

    constructor(address _teeSigner) EIP712("RTFM-Sovereign", "1") Ownable(msg.sender) {
        teeSigner = _teeSigner;
    }

    /**
     * @notice Updates the TEE signer address.
     * @param _newSigner The new TEE signer address.
     */
    function updateTEESigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid address");
        teeSigner = _newSigner;
        emit TEESignerUpdated(_newSigner);
    }

    /**
     * @notice Submits an attestation for a user's skill.
     * @dev Called by the TEE (Agent 2) after successful completion.
     * @param user The user address being attested.
     * @param skill The skill topic (e.g., "react-card").
     * @param score The final score (0-100).
     * @param signature The TEE's EIP-712 signature.
     * @param ipfsHash The IPFS hash of the code snapshot.
     * @param milestoneScores The scores for individual milestones.
     */
    function submitAttestation(
        address user,
        string calldata skill,
        uint256 score,
        bytes calldata signature,
        string calldata ipfsHash,
        uint256[] calldata milestoneScores
    ) external onlyTEE {
        require(score <= 100, "Invalid score");
        require(signature.length == 65, "Invalid signature length");
        require(!attestations[user][skill].exists, "Attestation already exists");

        // Verify EIP-712 signature
        // Note: We use a nonce of 0 here for simplicity as the uniqueness is enforced by !exists check
        // Ideally, we should track nonces, but userAttestationCount can serve as a nonce proxy if needed.
        // For this implementation, we verify the signer matches the teeSigner state variable.
        // However, since msg.sender is ALREADY checked to be teeSigner by onlyTEE modifier,
        // the signature verification is double-checking that the DATA was signed by the TEE.
        // This is important because the TEE constructs the signature over the data.
        
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            keccak256(bytes(skill)),
            score,
            0 // nonce placeholder
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner == teeSigner, "Invalid signature");

        attestations[user][skill] = Attestation({
            score: score,
            timestamp: block.timestamp,
            signature: signature,
            ipfsHash: ipfsHash,
            exists: true,
            milestoneScores: milestoneScores
        });

        userAttestationCount[user]++;
        userAttestedSkills[user].push(skill);

        emit AttestationSubmitted(user, skill, score, block.timestamp);
    }

    /**
     * @notice Verifies if an attestation exists and returns its details.
     * @param user The user address.
     * @param skill The skill topic.
     * @return exists Whether the attestation exists.
     * @return score The score.
     * @return timestamp The timestamp.
     * @return signature The signature.
     */
    function verifyAttestation(address user, string calldata skill) 
        external 
        view 
        returns (bool exists, uint256 score, uint256 timestamp, bytes memory signature) 
    {
        Attestation memory att = attestations[user][skill];
        return (att.exists, att.score, att.timestamp, att.signature);
    }

    /**
     * @notice Returns the list of skills attested for a user.
     * @param user The user address.
     * @return The list of skill topics.
     */
    function getAttestationHistory(address user) external view returns (string[] memory) {
        return userAttestedSkills[user];
    }
}
