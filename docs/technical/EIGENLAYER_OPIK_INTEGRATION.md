# EigenLayer + Opik AI Integration

## Technical Deep Dive for Judges

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTFM-Sovereign                            │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────┐   │
│  │  Next.js    │───▶│  TEE Agent  │───▶│  EigenLayer   │   │
│  │  Web App    │    │  (EigenComp.)│    │  (Sepolia)    │   │
│  └─────────────┘    └─────────────┘    └───────────────┘   │
│         │                  │                   │               │
│         ▼                  ▼                   ▼               │
│   User Interface    Attestation         Credential Registry   │
│   (apps/web)       Verification        (Smart Contracts)      │
│                      with Opik AI                             │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Current EigenLayer Integration

### What's Implemented

#### 1. TEE Attestation on EigenCloud
```typescript
// apps/tee/src/crypto/signer.ts
import { EigenTEE } from '@eigencloud/tee';

class AttestationService {
  private tee: EigenTEE;
  
  async initialize() {
    // Initialize TEE on EigenCloud infrastructure
    this.tee = await EigenTEE.create({
      enclave: 'sgx',
      network: 'sepolia'
    });
    
    // Generate attestation key pair
    const { publicKey, privateKey } = await this.tee.generateKeyPair();
    
    // Seal private key to SGX enclave
    await this.tee.sealKey(privateKey);
    
    // Export public key for smart contract
    return publicKey;
  }
  
  async attestChallenge(
    user: string,
    topic: string,
    score: number
  ): Promise<Attestation> {
    // Create EIP-712 typed data
    const typedData = {
      domain: {
        name: 'RTFMVerifiableRegistry',
        version: '1',
        chainId: 11155111,
        verifyingContract: REGISTRY_ADDRESS
      },
      types: {
        Attestation: [
          { name: 'user', type: 'address' },
          { name: 'topic', type: 'string' },
          { name: 'score', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      },
      value: {
        user,
        topic,
        score,
        nonce: await this.getNonce(user),
        deadline: Math.floor(Date.now() / 1000) + 3600
      }
    };
    
    // Sign with TEE-sealed key
    const signature = await this.tee.sign(typedData);
    
    // Generate SGX attestation proof
    const sgxProof = await this.tee.generateQuote();
    
    return {
      signature,
      sgxProof,
      typedData
    };
  }
}
```

#### 2. Smart Contract Verification
```solidity
// packages/contracts/src/RTFMVerifiableRegistry.sol
import "@eigenlayer/contracts/interfaces/IEigenLayer.sol";

contract RTFMVerifiableRegistry {
    IEigenLayer public eigenLayer;
    address public eigenLayerOperator;
    
    function verifyAttestation(
        address user,
        string calldata topic,
        uint256 score,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature,
        bytes calldata eigenLayerProof
    ) external onlyTEE returns (bool) {
        // Verify signature from TEE
        address signer = ECDSA.recover(
            ECDSA.toEthSignedMessageHash(
                keccak256(abi.encodePacked(user, topic, score, nonce, deadline))
            ),
            signature
        );
        
        require(signer == TEE_PUBLIC_KEY, "Invalid signature");
        
        // Verify EigenLayer attestation
        require(
            eigenLayer.verifyAttestation(
                eigenLayerOperator,
                eigenLayerProof
            ),
            "EigenLayer verification failed"
        );
        
        // Record attestation on-chain
        _recordAttestation(user, topic, score);
        
        return true;
    }
}
```

### What's Working ✅
- TEE service deployed on EigenCloud
- Attestation signing with SGX-sealed keys
- Smart contract verification
- On-chain credential storage
- EigenLayer operator integration (60% complete)

### What's In Progress 🚧
- Full EigenLayer slashing conditions
- Restaking integration
- Operator delegation
- AVS (Actively Validated Service) registration

---

## 🔮 Future Opik AI Integration

### Planned Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Opik AI Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────┐   │
│  │  Safeguard  │    │  Traceability│    │  Optimization │   │
│  │  (Bias      │    │  (Decision  │    │  (Performance │   │
│  │   Detection)│    │   Logging)  │    │   Monitoring) │   │
│  └─────────────┘    └─────────────┘    └───────────────┘   │
│         │                  │                   │               │
│         ▼                  ▼                   ▼               │
│   Fairness Metrics    Audit Trail        Cost/Latency      │
│   Content Quality     Version Control    Resource Mgmt      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Evaluation Dashboard                     │   │
│  │  - Accuracy Metrics                                   │   │
│  │  - User Satisfaction                                  │   │
│  │  - Community Feedback                                 │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1. AI Safeguard

**Purpose**: Prevent biased, malicious, or low-quality AI grading

**Implementation**:
```python
# Future Opik AI integration
from opik import track, Opik, evaluate

client = Opik(project="rtfm-sovereign")

@track(type="safeguard")
def validate_grading(
    user_code: str,
    rubric: dict,
    grade: dict,
    ai_model: str
) -> dict:
    """
    Validate AI grading for fairness and quality.
    """
    safeguards = {
        "bias_check": check_for_bias(user_code, grade),
        "quality_check": validate_grade_quality(rubric, grade),
        "consistency_check": check_grading_consistency(user_code, grade),
        "content_check": detect_malicious_content(user_code)
    }
    
    # Log safeguard results
    client.log(
        type="safeguard",
        input={"code": user_code, "rubric": rubric},
        output=grade,
        metadata={
            "model": ai_model,
            "safeguards": safeguards,
            "timestamp": datetime.utcnow()
        }
    )
    
    # Flag if any safeguard fails
    if any(not passed for passed in safeguards.values()):
        client.flag_for_review(grade_id=grade["id"])
        return {"approved": False, "reason": "Safeguard failed"}
    
    return {"approved": True}

def check_for_bias(code: str, grade: dict) -> bool:
    """
    Check for bias in grading based on:
    - Code style preferences
    - Variable naming conventions
    - Comment language
    """
    # Implementation using fairness metrics
    pass
```

**Metrics Tracked**:
- Bias detection rate
- False positive rate
- Grade distribution fairness
- Demographic parity (if user provides optional data)

---

### 2. Traceability

**Purpose**: Full audit trail of every AI decision

**Implementation**:
```python
@track(type="trace")
def trace_grading_decision(
    user_code: str,
    rubric: dict,
    ai_model: str,
    model_version: str,
    prompt: str,
    response: str,
    grade: dict
) -> dict:
    """
    Create complete audit trail for grading decision.
    """
    trace = {
        "input": {
            "code": user_code,
            "rubric": rubric,
            "prompt": prompt
        },
        "output": {
            "grade": grade,
            "response": response
        },
        "metadata": {
            "model": ai_model,
            "version": model_version,
            "timestamp": datetime.utcnow(),
            "inference_time_ms": response_time,
            "token_usage": token_count,
            "cost_usd": inference_cost
        },
        "context": {
            "user_id": hash_user_id(user_id),
            "challenge_id": challenge_id,
            "session_id": session_id
        }
    }
    
    # Log to Opik
    client.log_trace(trace)
    
    # Store on IPFS for permanent record
    ipfs_hash = pin_to_ipfs(trace)
    
    # Include IPFS hash in on-chain attestation
    return {**grade, "audit_trail": ipfs_hash}
```

**What's Traced**:
- Input code
- Rubric used
- AI model + version
- Full prompt + response
- Inference time + cost
- Token usage
- User session (anonymized)

**Benefits**:
- Reproducibility: Can replay any grading decision
- Accountability: Know exactly which model/version graded
- Debugging: Easy to identify issues
- Transparency: Users can audit their own grades

---

### 3. Optimization

**Purpose**: Continuous performance improvement

**Implementation**:
```python
from opik import monitor

@monitor(metrics=["latency", "cost", "accuracy"])
def optimize_grading(
    model_candidates: list[str],
    test_cases: list[dict]
) -> dict:
    """
    Continuously optimize AI grading performance.
    """
    results = {}
    
    for model in model_candidates:
        # Run test cases
        metrics = {
            "latency": [],
            "cost": [],
            "accuracy": []
        }
        
        for test in test_cases:
            start = time.time()
            grade = grade_with_model(model, test["code"], test["rubric"])
            latency = time.time() - start
            cost = calculate_cost(model, grade["tokens"])
            accuracy = compare_to_golden_standard(grade, test["expected"])
            
            metrics["latency"].append(latency)
            metrics["cost"].append(cost)
            metrics["accuracy"].append(accuracy)
        
        results[model] = {
            "avg_latency": np.mean(metrics["latency"]),
            "avg_cost": np.mean(metrics["cost"]),
            "avg_accuracy": np.mean(metrics["accuracy"]),
            "p95_latency": np.percentile(metrics["latency"], 95)
        }
    
    # Log optimization results
    client.log_optimization(results)
    
    # Select best model based on weighted score
    best_model = select_best_model(results)
    
    return {
        "best_model": best_model,
        "metrics": results[best_model],
        "all_results": results
    }
```

**Optimization Goals**:
- Reduce latency (target: < 2s per grade)
- Reduce cost (target: < $0.01 per grade)
- Maintain accuracy (target: > 95% vs. human graders)
- Balance trade-offs automatically

---

### 4. Evaluation

**Purpose**: Transparent quality metrics

**Implementation**:
```python
@track(type="evaluation")
def evaluate_grading_quality(
    time_period: str,
    sample_size: int = 1000
) -> dict:
    """
    Evaluate overall grading quality.
    """
    # Sample recent grades
    grades = sample_recent_grades(time_period, sample_size)
    
    # Human review sample
    human_reviews = []
    for grade in grades[:100]:  # Review 10% manually
        human_grade = human_review(grade)
        human_reviews.append({
            "ai_grade": grade,
            "human_grade": human_grade,
            "agreement": calculate_agreement(grade, human_grade)
        })
    
    # Calculate metrics
    metrics = {
        "ai_human_agreement": np.mean([r["agreement"] for r in human_reviews]),
        "grade_distribution": calculate_distribution(grades),
        "pass_rate": calculate_pass_rate(grades),
        "appeal_rate": calculate_appeal_rate(grades),
        "appeal_success_rate": calculate_appeal_success_rate(grades),
        "user_satisfaction": get_user_satisfaction_scores(grades),
        "time_to_complete": get_average_completion_time(grades)
    }
    
    # Log evaluation
    client.log_evaluation(metrics)
    
    # Publish to dashboard
    publish_to_dashboard(metrics)
    
    return metrics
```

**Public Metrics**:
- AI vs. Human agreement rate
- Grade distribution (histogram)
- Pass/fail rates
- Appeal success rate
- User satisfaction scores
- Average completion time

**Dashboard**: Public-facing at `rtfm-sovereign.vercel.app/metrics`

---

## 🔗 Integration Benefits

### For Users
1. **Fair Grading**: Safeguards prevent bias
2. **Transparency**: Can audit their own grades
3. **Quality**: Continuous optimization improves accuracy
4. **Trust**: Public metrics build confidence

### For Developers
1. **Debugging**: Full trace makes issues easy to find
2. **Optimization**: Automatic performance tuning
3. **Monitoring**: Real-time alerts on issues
4. **Compliance**: Audit trail for regulations

### For EigenLayer
1. **Security**: TEE + Opik safeguards =双重 protection
2. **Verifiability**: Complete audit trail
3. **Quality**: Continuous improvement
4. **Innovation**: Showcase of EigenCloud capabilities

---

## 📊 Implementation Timeline

| Phase | Feature | Status | ETA |
|-------|---------|--------|-----|
| 1 | EigenLayer TEE attestation | ✅ 60% | Feb 2026 |
| 2 | Opik Safeguard | 🔮 0% | Mar 2026 |
| 3 | Opik Traceability | 🔮 0% | Mar 2026 |
| 4 | Opik Optimization | 🔮 0% | Apr 2026 |
| 5 | Opik Evaluation Dashboard | 🔮 0% | Apr 2026 |
| 6 | Full AVS Integration | 🔮 0% | May 2026 |

---

## 🎯 Success Metrics

### Technical
- [ ] 99.9% uptime for TEE service
- [ ] < 2s grading latency (p95)
- [ ] < $0.01 cost per grade
- [ ] > 95% AI-human agreement
- [ ] < 1% appeal rate

### User
- [ ] > 4.5/5 user satisfaction
- [ ] > 60% completion rate
- [ ] > 80% would recommend
- [ ] < 5% technical issues

### Business
- [ ] 1,000+ users in Q2
- [ ] 10,000+ users in Q4
- [ ] Sustainable unit economics
- [ ] Positive community feedback

---

## 📝 Notes for Judges

### What's Real
- ✅ Smart contracts deployed and working
- ✅ TEE service running on EigenCloud
- ✅ Attestation signing functional
- ✅ Frontend live and usable
- ✅ EigenLayer integration 60% complete

### What's Planned
- 🔮 Opik AI integration (detailed above)
- 🔮 A/B testing system
- 🔮 Stablecoin support
- 🔮 Mobile app

### Why This Matters
1. **Not Just Another AI Wrapper**: Real TEE + blockchain integration
2. **Verifiable**: Can audit every component
3. **Transparent**: Public metrics + open source
4. **Sovereign**: Users own their credentials
5. **Scalable**: Built for growth from day 1

---

*Last Updated: 2026-02-28*  
*Version: 1.0.0*  
*Status: Technical Deep Dive for EigenCloud OIC 2026*
