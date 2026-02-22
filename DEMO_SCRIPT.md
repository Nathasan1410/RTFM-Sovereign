# RTFM-Sovereign Demo Script

## Scene Breakdown (2:30 total)

### Scene 1: Hook (0:00-0:20)

**Visual:**
- Terminal showing complex code snippet or a fake resume scrolling rapidly
- Dark theme, monospaced font
- Text: "Over 9000 hours of experience" flashing

**Narrator (Voiceover):**
> "What if you can't trust resumes anymore? What happens when AI agents start interviewing candidates, but how do we know the human isn't cheating?"

**Audio:**
- Tense, minimal music (synth arpeggio)
- Sound effect: "glitch" on resume text

**Transition:**
- Screen fades to black
- RTFM-Sovereign logo appears (shield icon + lock)

**Duration:** 20 seconds

---

### Scene 2: The Problem (0:20-0:40)

**Visual:**
- Split screen (50/50)
- **Left Side**: Fake credential certificates appearing rapidly
- **Right Side**: Real person solving coding challenge
- Red overlay on left side: "UNVERIFIED"
- Green overlay on right side: "VERIFIED"

**Narrator:**
> "In the emerging agentic economy, autonomous hiring bots need to verify human skills. But how do you prove you actually know Solidity, not just that you pasted code from ChatGPT?"

**Audio:**
- Transition to slightly faster tempo
- Sound effect: "whoosh" on split screen

**Duration:** 20 seconds

---

### Scene 3: Solution Overview (0:40-1:00)

**Visual:**
- Animated architecture diagram (simple, clean)
- Components fade in sequentially:
  1. User (browser icon)
  2. Smart Contract (blockchain icon)
  3. TEE Enclave (lock icon with shield)
  4. Arrows showing data flow

**Narrator:**
> "Enter RTFM-Sovereign. A verifiable, ownerless skill examiner running in secure Intel SGX enclaves. Stake ETH, complete AI-generated challenges, and receive on-chain credentials that even hiring bots can trust."

**Audio:**
- Upbeat, confident music
- Sound effect: "ding" as each component appears

**Diagram Details:**
- Keep it simple (3 boxes connected by arrows)
- Use consistent colors (blue for blockchain, green for TEE)
- Animate arrows (flow direction: User → Contract → TEE → Contract)

**Duration:** 20 seconds

---

### Scene 4: Live Demo (1:00-2:00)

**Visual:**
- Full-screen screen recording of browser
- Clean browser window (no bookmarks, no extensions visible)
- Mouse movements shown (to prove interactivity)

**Narrator (Optional, minimal):**
> "Watch as we stake, complete a challenge, and receive a verifiable credential in under 60 seconds."

**Screen Recording Sequence:**

**4.1: Open App (0:00-0:10)**
- Navigate to: `https://rtfm-sovereign.vercel.app`
- Show "Connect Wallet" button
- Click and approve MetaMask connection

**4.2: Get Test Funds (0:10-0:20)**
- Click "Faucet" button
- Show MetaMask transaction popup
- Approve transaction
- Show wallet balance updating (0 → 0.01 ETH)

**4.3: Stake for Topic (0:20-0:40)**
- Navigate to "Challenges" page
- Type "Solidity" in topic input
- Click "Start Challenge"
- Show MetaMask popup (0.001 ETH)
- Confirm transaction
- Show "Challenge Active" status

**4.4: View Challenge (0:40-0:55)**
- Display generated questions
- Show documentation links (click one to show external page briefly)
- Type answer (or show pre-typed for demo speed)

**4.5: Submit & Verify (0:55-1:15)**
- Click "Submit Answer"
- Show "Verifying with TEE..." loading state
- Wait 2-3 seconds (simulated)
- Show "Attestation Complete!" success message
- Display score (e.g., "85/100 - PASSED")

**4.6: View on Etherscan (1:15-1:20)**
- Click "View on Etherscan" link
- Show Etherscan tab opening
- Scroll to "Events" section
- Highlight `AttestationSubmitted` event
- Close Etherscan tab

**4.7: Verify Skill (1:20-1:30)**
- Back to app, navigate to "Credentials" page
- Show "Solidity" with green checkmark
- Display: "Score: 85 | Verified: 2024-02-22"
- Click "Verify" button (simulated)
- Show "Credential Valid" popup

**Duration:** 60 seconds

---

### Scene 5: Sovereign Mechanics (1:30-2:20)

**Visual:**
- Etherscan page zoomed in
- Highlight specific transaction: `renounceOwnership`
- Show transaction details with animation
- Fade out transaction details
- Show text: "No Admin. No Company. Just Code."

**Narrator:**
> "Unlike traditional platforms, RTFM-Sovereign has no admin keys. Once deployed, the TEE agent operates autonomously, and there's no human who can change the rules or confiscate funds. This is true decentralization."

**Audio:**
- Dramatic, slower music
- Sound effect: "lock click" on renounceOwnership

**Visual Effects:**
- Use screen recording annotation (circle, arrows) to highlight transaction
- Zoom in/out smoothly (don't jump)

**Duration:** 50 seconds

---

### Scene 6: Outro (2:20-2:30)

**Visual:**
- Split screen:
  - **Left**: GitHub repo page (scrolling code)
  - **Right**: "Built for EigenCloud OIC 2026" badge
- Fade both sides
- RTFM-Sovereign logo appears
- Text: "RTFM-Sovereign: Read The Verifiable Manual"

**Narrator:**
> "RTFM-Sovereign. Built for the EigenCloud Open Innovation Challenge 2026. A step toward a future where skills are verifiable, credentials are trustworthy, and agents can hire humans with confidence."

**Audio:**
- Inspiring, uplifting music (fading in)
- Sound effect: "whoosh" on logo reveal

**Duration:** 10 seconds

**Final Frame:**
- Logo centered
- QR code to GitHub repo (optional)
- "Built by [Your Name]" text
- "EigenCloud OIC 2026" badge

**Fade to black**

---

## Technical Notes

### Recording Tools

| Tool | Purpose | Settings |
|-------|----------|----------|
| **OBS Studio** | Screen recording | 1080p, 30fps, high quality |
| **MetaMask** | Wallet interaction | Fresh profile, testnet mode |
| **Chrome/Brave** | Browser | Dark mode, clear cache before demo |
| **Terminal (Warp)** | Code showcase | Dracula theme, consistent font |
| **Audio Editor (Audacity)** | Voiceover & music | Export as MP3, 192kbps |

### Preparation Checklist

**Before Recording:**
- [ ] Test all flows on Sepolia testnet
- [ ] Ensure wallet has ≥ 0.01 ETH
- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions (except MetaMask)
- [ ] Set up screen recording (test audio)
- [ ] Have backup wallet with funds (in case of error)
- [ ] Verify TEE service is operational
- [ ] Prepare demo answers (for speed)

**During Recording:**
- [ ] Speak slowly and clearly (if voiceover)
- [ ] Avoid "um" and "uh" pauses
- [ ] Keep mouse movements smooth (don't rush)
- [ ] Wait for transaction confirmations (don't skip)
- [ ] Double-check all popups are visible
- [ ] Ensure network indicator shows "Sepolia"

**After Recording:**
- [ ] Export in 1080p MP4
- [ ] Add subtitles/captions (for accessibility)
- [ ] Compress if needed (target < 100MB)
- [ ] Upload to YouTube (unlisted for judges)
- [ ] Update README with video link

### Network & Timing

**Best Times to Record:**
- **Early morning (UTC 8:00-10:00)**: Low gas prices
- **Weekends**: Less network congestion
- **Avoid**: Major crypto events (ETH conference, etc.)

**Backup Plan:**
- If Sepolia is congested, use local fork for demo
- Mention in video: "Simulated on local fork for demonstration purposes"

---

## Alternative Short Version (1:00)

If you need a shorter video for social media:

**Structure:**
1. **Hook** (0:10): Problem statement
2. **Demo** (0:40): Stake → Challenge → Verify (fast)
3. **Outro** (0:10): "Built for EigenCloud"

**Cuts:**
- Jump between steps quickly
- Remove detailed explanations
- Focus on visual impact

---

## Audio Script (Optional Voiceover)

**Scene 1:**
"In a world where AI agents are increasingly handling hiring, how can you prove your skills are real? Not just copied from ChatGPT, but truly verified?"

**Scene 2:**
"Traditional credentials are easy to fake. Anyone can buy a certificate or generate a resume. But in the agentic economy, trust needs to be cryptographic."

**Scene 3:**
"RTFM-Sovereign changes this. Using secure enclaves and on-chain verification, we create credentials that even AI hiring bots can trust. No central authority, no company to vouch for you."

**Scene 4:**
"Watch as we stake ETH, complete an AI-generated challenge, and receive a cryptographic credential in under 60 seconds. All verifiable on-chain."

**Scene 5:**
"Unlike traditional platforms, RTFM-Sovereign has no admin. Once deployed, the TEE agent operates autonomously. No human can change the rules or confiscate your funds. This is true decentralization."

**Scene 6:**
"RTFM-Sovereign: Read The Verifiable Manual. Built for the EigenCloud Open Innovation Challenge 2026. A step toward a future where skills are verifiable, credentials are trustworthy, and agents can hire humans with confidence."

---

## Post-Production

### Distribution

- **YouTube**: Upload as "Unlisted" (share link with judges)
- **GitHub**: Add to README.md as "Demo Video"
- **Twitter/X**: Short clip (15-30 seconds) with link
- **LinkedIn**: Full video with description

### Promotion Hashtags

`#EigenCloud #OIC2026 #Web3 #Solidity #Blockchain #TEE`

---

## Common Issues & Fixes

**Issue**: Transaction takes too long
- **Fix**: Edit out waiting time or use fast-forward effect

**Issue**: MetaMask popup blocks view
- **Fix**: Record popup separately, splice in editing

**Issue**: Network error during demo
- **Fix**: Have backup recording, mention "simulated on fork"

**Issue**: Audio quality poor
- **Fix**: Rerecord voiceover, keep screen recording

---

## Final Checklist

- [ ] Video length: 2:30 (±10 seconds)
- [ ] Resolution: 1080p minimum
- [ ] Audio: Clear, background music balanced
- [ ] All flows visible: Connect → Stake → Challenge → Verify
- [ ] Etherscan shown with actual transaction
- [ ] "Sovereign" mechanics explained
- [ ] Outro with GitHub link and credits
- [ ] YouTube link added to README.md
- [ ] Video tested on multiple devices (mobile, desktop)
