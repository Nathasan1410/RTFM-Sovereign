# RTFM-Sovereign - 5 Minute Demo Script (Updated)

## 🎤 Complete Pitch Deck & Demo Flow

**Total Time:** 5-7 minutes  
**Target:** EigenCloud OIC 2026 Hackathon Judges  
**Goal:** Demonstrate verifiable learning with TEE + staking + EigenLayer integration

---

## [SLIDE 1] - Hook (0:00-0:15)

**Visual:** Black screen, white text

```
"RTFM. Read The F*cking Manual."
```

**Speaker:**
> "How many of you have ever tried to learn something new... and just gave up because the docs were too overwhelming?"
>
> [Pause for show of hands]
>
> "Yeah. Me too. That's why we built RTFM."

---

## [SLIDE 2] - Problem: The Vibecoder Trap (0:15-0:45)

**Visual:** Meme or screenshot of AI-generated code with 18 hours debugging

```
"Last week I used AI to ship a feature in 1 hour. 
Then spent 18 hours debugging it. 
Because I don't know what my AI writes.
I had no idea what my AI built.

If you're a vibecoder, you know this feeling."
```

**Speaker:**
> "AI made me productive. But it also made me dependent. I was copying code I didn't understand, building features I couldn't explain. And when something broke... I was stuck."
>
> "The problem isn't laziness. It's that we've lost the ability to learn from documentation."

---

## [SLIDE 3] - Problem: Broken Incentives (0:45-1:15)

**Visual:** Comparison table of current learning platforms

```
"The problem isn't laziness. It's incentives.

Free courses? No commitment. Completion rate is 3%.

Paid courses? $200 to $2000 — still no real incentives. 
The platform doesn't care if you finish or not.

Certificates? There's a lot of fake PDFs nowadays. 
Trust is all-time low. 
And the platform owns them — they can de-platform you anytime."
```

**Speaker:**
> "Think about it. Coursera, Udemy, Pluralsight... they all make money when you buy the course, not when you complete it. Their incentives are misaligned with yours."
>
> "And certificates? I can make a fake one in Photoshop in 5 minutes. Employers know this. Trust is broken."

---

## [SLIDE 4] - Solution: RTFM (1:15-1:45)

**Visual:** RTFM architecture diagram (User → AI → TEE → Blockchain)

```
"RTFM fixes this by forcing you to read the docs.

AI generates courses from any documentation — repos, API docs, manuals.

You stake to enroll. Complete the work → get refunded plus an on-chain cert. 
If you quit? You lose your stake. Simple."
```

**Speaker:**
> "Here's how we fix it: RTFM uses AI to generate personalized learning paths from ANY documentation. GitHub repos. API docs. User manuals."
>
> "But here's the key: you stake crypto to enroll. When you finish, you get your stake back PLUS an on-chain certificate that proves your skills. If you quit? You lose your stake. Now the incentives are aligned."

---

## [SLIDE 5] - Acknowledgment (1:45-2:00)

**Visual:** Overwhelming documentation screenshot (e.g., React docs with 100+ pages)

```
"But... Reading Docs can be quite overwhelming..."
```

**Speaker:**
> "Now, I know what you're thinking. 'Just read the docs?' It's not that simple. Documentation is overwhelming. Where do you even start?"
>
> "That's why we don't just say 'read the docs.' We guide you through them."

---

## [SLIDE 6] - Transition to Demo (2:00-2:15)

**Visual:** Screenshot of RTFM homepage

```
"Let me show you how we simplify the process."
```

**Speaker:**
> "Let me show you the live demo."

---

## 💻 LIVE DEMO (2:15-4:15)

### Demo Flow:

#### Step 1: Homepage (2:15-2:30)

**Action:** Navigate to https://rtfm-sovereign.vercel.app

**Speaker:**
> "This is the homepage. Clean, simple. I'm connected with my wallet — no email, no signup. Here, I enter what I want to learn. Let's say... 'React Cards'."

#### Step 2: Choose Mode (2:30-2:45)

**Action:** Show Learn Mode vs Proof Mode

**Speaker:**
> "Two options:
> - **Learn Mode** — Free, local verification. Good for practice.
> - **Proof Mode** — 0.001 ETH stake. On-chain verification. This is where the magic happens."
>
> "Let me show you Proof Mode..."

#### Step 3: Stake (2:45-3:00)

**Action:** Click "Stake 0.001 ETH", confirm transaction

**Speaker:**
> "I stake 0.001 ETH — that's about $3-4. This goes into the smart contract."
>
> "If I quit? I lose 80% — only get 20% back.
> If I finish and pass? I get 80% back and an on-chain certificate."
>
> "Transaction confirmed. Now it generates my roadmap."

#### Step 4: Roadmap (3:00-3:20)

**Action:** Show generated roadmap with modules

**Speaker:**
> "Done. Here's my learning path. Each module has official React docs links. No tutorials. Just the source material."
>
> "Notice — the AI didn't just give me a generic course. It read the React documentation and built a custom path for building Cards."

#### Step 5: Challenge (3:20-3:50)

**Action:** Open Module 1, show challenge and code editor

**Speaker:**
> "I'm in Module 1 now. The challenge is clear — build a basic Card component. I can read the docs links if I'm stuck. Then I write my code here in the editor."
>
> "Notice — I can't skip this. I have to actually build something."

#### Step 6: AI Judge (3:50-4:15)

**Action:** Submit code, show AI verification

**Speaker:**
> "Now the AI judge analyzes my code against the rubric. Does it meet the requirements? Pass or fail. No bluffing."
>
> [Wait for result]
>
> "Passed! Now I can move to the next module. This continues until I complete all modules."

---

## [SLIDE 7] - Technical Deep Dive: EigenLayer Integration (4:15-4:45)

**Visual:** EigenLayer + EigenCloud architecture diagram

```
"Deployment on EigenLayer
Using EigenAI (GPT-OSS-120B)
Future Compatibility with Opik AI:
  • AI Safeguard
  • Traceability
  • Optimization & Evaluation

People can see what's going on behind.
No one can freeze/seize/de-platform you."
```

**Speaker:**
> "Here's what makes this different:
> 
> **First**, we're deployed on EigenLayer. This means our TEE attestations are backed by Ethereum's economic security.
> 
> **Second**, we use EigenAI with GPT-OSS-120B for code verification. This is open-source, auditable, and runs in TEEs.
> 
> **Third**, we're building integration with Opik AI for:
> - **AI Safeguard**: Prevent biased or malicious grading
> - **Traceability**: Track every AI decision
> - **Optimization**: Continuous improvement of AI judges
> - **Evaluation**: Transparent scoring metrics
> 
> **Most importantly**: Everything is transparent. You can see exactly how the AI grades your code. And because it's on EigenLayer, no one can freeze, seize, or de-platform your credentials. They're yours forever."

---

## [SLIDE 8] - Transparency & Trust (4:45-5:15)

**Visual:** Code verification flow with visibility

```
"Transparency by Design:
✓ AI grading rubric visible before submission
✓ Code verification process auditable
✓ TEE attestation publicly verifiable
✓ On-chain credential history
✓ Open-source AI models (GPT-OSS-120B)

Future: A/B Testing for Trust
- Multiple AI judges per submission
- Community-voted grading rubrics
- Transparent accuracy metrics"
```

**Speaker:**
> "Trust isn't optional. It's built in:
> 
> Before you submit, you see the exact rubric. After submission, you can audit how the AI graded you. The TEE attestation is publicly verifiable on-chain.
> 
> **For the future**: We're planning A/B testing where multiple AI judges grade the same submission. The community can vote on which rubrics are fairest. We'll publish accuracy metrics openly.
> 
> This isn't just 'trust us.' It's 'verify us.'"

---

## [SLIDE 9] - Roadmap (5:15-5:45)

**Visual:** Roadmap timeline (honest about what's done vs. coming)

```
"Roadmap

✅ DONE:
- Smart contract staking system
- TEE-powered attestation
- AI challenge generation
- Frontend application
- EigenLayer deployment

🚧 COMING SOON:
- Visible code generation process
- Agentic AI maintenance (self-improving)
- A/B testing for AI judges
- Stablecoin support (USDC, DAI, USDT)
- Multi-chain deployment (Polygon, Arbitrum)
- Mobile app (React Native)

🔮 FUTURE:
- Opik AI integration (safeguards + traceability)
- Enterprise features (team challenges)
- DAO governance (community-owned)
- Cross-platform credential portability"
```

**Speaker:**
> "Here's where we are:
> 
> **Done**: Smart contracts, TEE service, AI generation, frontend, EigenLayer deployment.
> 
> **Coming Soon**: We're making the code generation process visible step-by-step. The system will be maintained by Agentic AI — self-improving. A/B testing for trust. And stablecoin support so you can stake with USDC instead of ETH.
> 
> **Future**: Opik AI integration, enterprise features, and eventually DAO governance. This won't be my project. It'll be yours."

---

## [SLIDE 10] - Stablecoin Support (5:45-6:00)

**Visual:** Stablecoin logos (USDC, DAI, USDT)

```
"Stablecoin Support (Coming Q2 2026)

Stake with:
- USDC
- DAI
- USDT
- Any ERC-20 token

Why?
- No ETH volatility risk
- Predictable learning costs
- Easier for enterprises
- Global accessibility"
```

**Speaker:**
> "One more thing: We're adding stablecoin support. Stake with USDC, DAI, or USDT instead of ETH. No volatility risk. Predictable costs. Better for enterprises and global users."

---

## [SLIDE 11] - Call to Action (6:00-6:30)

**Visual:** QR code + links

```
"Try it now:
rtfm-sovereign.vercel.app

Build with us:
github.com/your-org/rtfm-sovereign

Verify credentials:
sepolia.etherscan.io/address/0x7006e886e56426Fbb942B479AC8eF5C47a7531f1

Powered by EigenCloud ⚡"
```

**Speaker:**
> "Try it yourself at rtfm-sovereign.vercel.app. The code is open source. Build on EigenCloud with us.
> 
> This is sovereign learning. You own your path. You own your credentials. No gatekeepers.
> 
> Thank you!"

---

## 🎬 Backup Plans

### If Demo Fails:

1. **Wallet Connection Issue:**
   - "Let me show you the recorded version..."
   - Switch to backup video

2. **Staking Transaction Fails:**
   - "We're on testnet, let me show you the completed flow..."
   - Show screenshots

3. **AI Takes Too Long:**
   - "The AI is generating... let me show you a completed example..."
   - Open pre-generated roadmap

4. **Network Issues:**
   - Have offline screenshots ready
   - Use local mock mode: `NEXT_PUBLIC_DEMO_MODE=true`

### Pre-Demo Checklist:

- [ ] Wallet connected (MetaMask/WalletConnect)
- [ ] Have 0.01 ETH in wallet (for staking demo)
- [ ] Test staking flow once before recording
- [ ] Clear browser cache
- [ ] Check network status (Sepolia RPC)
- [ ] Have backup screenshots ready
- [ ] Test audio/video recording
- [ ] Verify EigenLayer integration is working
- [ ] Test Opik AI logging (if enabled)

---

## 📊 Timing Breakdown

| Section | Time | Cumulative |
|---------|------|------------|
| Slide 1 (Hook) | 0:15 | 0:15 |
| Slide 2 (Vibecoder) | 0:30 | 0:45 |
| Slide 3 (Incentives) | 0:30 | 1:15 |
| Slide 4 (Solution) | 0:30 | 1:45 |
| Slide 5 (Acknowledgment) | 0:15 | 2:00 |
| Slide 6 (Transition) | 0:15 | 2:15 |
| **LIVE DEMO** | **2:00** | **4:15** |
| Slide 7 (EigenLayer + Opik) | 0:30 | 4:45 |
| Slide 8 (Transparency) | 0:30 | 5:15 |
| Slide 9 (Roadmap) | 0:30 | 5:45 |
| Slide 10 (Stablecoins) | 0:15 | 6:00 |
| Slide 11 (CTA) | 0:30 | 6:30 |

**Total:** 6:30 minutes (can trim to 5:00 by shortening demo)

---

## 🎯 Key Messages to Hit

1. ✅ **Problem:** Vibecoder dependency + broken incentives
2. ✅ **Solution:** AI-generated courses from docs
3. ✅ **Differentiation:** Staking + on-chain verification
4. ✅ **Technology:** TEE attestation (EigenCloud) + EigenLayer
5. ✅ **Future:** Opik AI integration (safeguards, traceability)
6. ✅ **Transparency:** A/B testing, visible rubrics, open metrics
7. ✅ **Roadmap:** Stablecoins, multi-chain, DAO governance
8. ✅ **Value:** Sovereign credentials you own
9. ✅ **Demo:** Working product (not just slides)

---

## 📝 Speaker Notes

### Tone:
- **Casual** - You're a vibecoder too
- **Honest** - Admit roadmap gaps (what's done vs. planned)
- **Confident** - You have the solution
- **Visionary** - Show the future of sovereign learning

### Body Language:
- Make eye contact with camera
- Use hand gestures when explaining
- Smile when showing the demo
- Pause for emphasis after key points
- Show enthusiasm when mentioning EigenLayer + Opik

### Voice:
- Vary your tone (don't be monotone)
- Speak slower than normal
- Emphasize key words: "EigenLayer", "Opik AI", "on-chain", "verify", "sovereign", "transparent"
- Pause before big reveals (TEE verification, roadmap)

### Key Points to Stress:
1. **EigenLayer integration** - This is real, deployed, working
2. **Opik AI compatibility** - Future plan for trust & transparency
3. **A/B testing** - Building trust through multiple judges
4. **Stablecoins** - Making it accessible (no ETH volatility)
5. **Sovereignty** - No one can freeze/seize/de-platform you

---

## 🔗 Resources

- **Live Demo:** https://rtfm-sovereign.vercel.app
- **GitHub:** https://github.com/your-org/rtfm-sovereign
- **Docs:** https://github.com/your-org/rtfm-sovereign/tree/main/docs
- **Contracts:** https://sepolia.etherscan.io/address/0x7006e886e56426Fbb942B479AC8eF5C47a7531f1
- **EigenLayer:** https://www.eigenlayer.org/
- **Opik AI:** https://www.comet.com/site/products/opik/

---

## 🎯 For Extended Version (7-10 minutes)

If you have more time, add these sections:

### Technical Deep Dive (add 2 minutes)
- Show actual EigenLayer contract code
- Demonstrate TEE attestation verification
- Walk through Opik AI logging interface
- Show A/B testing architecture diagram

### Q&A Preparation (add 1-3 minutes)
Common questions:
1. "How do you prevent AI bias?" → Opik AI safeguards
2. "What if the AI grades wrong?" → A/B testing + appeal process
3. "Why EigenLayer?" → Economic security + verifiability
4. "How do you make money?" → Treasury fees (20% on failed stakes)
5. "What's the moat?" → Network effects + on-chain credentials

---

*Last Updated: 2026-02-28*  
*Version: 2.0.0 (Updated with EigenLayer + Opik + Roadmap)*  
*Status: Ready for EigenCloud OIC 2026 Submission*
