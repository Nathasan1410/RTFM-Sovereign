# Implementation Guide: AI-Guided Micro-Learning Flow

## Problem Statement

### Masalah Saat Ini

**Terlalu Generik & Teoretis**: AI saat ini memberikan pengajaran yang overly basic. Ketika user meminta cara membuat spesifik komponen (misal: card atau landing page), AI malah memberikan fundamental framework (sejarah React, getting started umum) yang tidak relevan dengan konteks.

**Dokumentasi Tidak Relevan**: AI memberikan link dokumentasi secara full (gelondongan), membuat user pemula kebingungan mencari bagian mana yang harus dibaca.

**Challenge Rancu**: Tugas atau challenge yang diberikan tidak memiliki arah proyektif yang jelas (contoh: sekadar disuruh menjelaskan "Singleton" atau "buat halaman React basic").

**Tidak Ada Verify Code di Frontend**: User tidak bisa memverifikasi kodenya sendiri melalui frontend.

## Core Objective

Mengubah cara AI mengajar dari **Theoretical-First** menjadi **Project-Based & Micro-Chunking**. AI harus bisa membimbing user selangkah demi selangkah membuat sesuatu yang nyata (seperti komponen UI), memecah roadmap menjadi tahapan kecil yang saling terhubung (Step 1 nyambung ke Step 2, dst).

## Key Features

### 1. Dynamic Micro-Roadmap Generator

AI memecah request user menjadi **5-10 micro-steps** yang masuk akal.

**Contoh Flow Card Component**:
```
Bikin kotak (HTML/Tailwind) ➔ Isi gambar ➔ Bikin kotak dalam kotak ➔ Isi tulisan ➔ Styling hover/padding ➔ Hasil akhir.
```

### 2. Laser-Focused Documentation

Dokumentasi yang disarankan hanya untuk scope spesifik di step tersebut. Jika step-nya tentang padding, AI hanya mengajari soal padding dan styling box, tidak menyinggung hooks atau state sampai itu benar-benar dibutuhkan.

### 3. AI Code Judge & Verifier

Sistem verifikasi di mana user mengirimkan hasil codingan-nya (bisa berupa satu atau beberapa file/folder). AI bertugas membedah kode tersebut dan memverifikasi apakah output-nya sudah sesuai dengan challenge di step berjalan.

### 4. Targeted Feedback & Highlighting

Jika kode user salah/kurang, AI tidak langsung memberikan jawaban. AI akan menyoroti (highlight) bagian dokumentasi yang terlewat dan memberikan hint spesifik (misal: "Kotaknya belum pas, coba cek lagi bagian flexbox di sini").

### 5. Fallback Code (Solusi AI)

AI menyimpan **"kunci jawaban"** atau ground-truth code untuk setiap step. Kunci ini hanya dikeluarkan jika:
- User sudah berhasil melewati challenge (sebagai bahan perbandingan/refleksi), atau
- User benar-benar stuck dan menyerah (give up)

## Expected User Experience (UX)

### Request: User meminta AI mengajari cara membuat sebuah fitur/komponen

**Mapping**: AI memberikan roadmap kecil dari tahap 1 sampai selesai.

**Action**: AI menyajikan Step 1 + teori singkat + dokumentasi spesifik + challenge.

**Submission**: User ngoding dan men-submit file kode.

**Verification**: AI mengecek kode. Lanjut ke Step 2 jika benar, beri hint jika salah.

**Completion**: User mendapatkan working component di akhir sesi dan merasa bangga karena "berhasil membuat sesuatu".

## Implementasi Requirements

### 1. Backend (TEE Service)

#### 1.1 Frontend - Verify Code Feature

**Lokasi**: `apps/web/app/roadmap/[id]/page.tsx`

**Requirement**:
- Tambahkan tombol "Verify Code" atau "Check Code" di setiap module
- Ketika diklik, kirim kode user ke backend untuk verifikasi
- Tampilkan status verifikasi (pending/verified/failed)
- Jika verified, lanjut ke step berikutnya
- Jika failed, tampilkan feedback dari AI

**API Endpoint**:
```typescript
// apps/tee/src/server.ts
app.post('/verify-code', async (req, res) => {
  try {
    const { sessionId, milestoneId, code } = req.body;
    
    const verificationResult = await judgingEngine.verifyCode({
      sessionId,
      milestoneId,
      userCode: code
    });
    
    res.json({
      verified: verificationResult.verified,
      score: verificationResult.score,
      feedback: verificationResult.feedback,
      nextStep: verificationResult.passed ? milestoneId + 1 : milestoneId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Frontend Implementation**:
```typescript
// apps/web/app/roadmap/[id]/page.tsx
const [verifyingCode, setVerifyingCode] = useState(false);
const [verificationResult, setVerificationResult] = useState<{verified: boolean; score?: number} | null>(null);

const handleVerifyCode = async () => {
  setVerifyingCode(true);
  
  try {
    const response = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        milestoneId: currentMilestone.id,
        code: userCode
      })
    });
    
    const result = await response.json();
    setVerificationResult(result);
    
    if (result.verified) {
      // Lanjut ke step berikutnya
      setCurrentMilestone(result.nextStep);
      updateMilestoneScore(currentMilestone.id, result.score);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    setVerifyingCode(false);
  }
};

// Render tombol verify
<button
  onClick={handleVerifyCode}
  disabled={verifyingCode}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
>
  {verifyingCode ? 'Verifying...' : 'Verify Code'}
</button>

{verificationResult && (
  <div className="mt-4 p-4 rounded bg-gray-100">
    {verificationResult.verified ? (
      <div className="text-green-600">
        ✓ Verified! Score: {verificationResult.score}/100
      </div>
    ) : (
      <div className="text-red-600">
        ✗ Verification Failed
        <p className="text-sm mt-2">{verificationResult.feedback}</p>
      </div>
    )}
  </div>
)}
```

#### 1.2 Enhance Micro-Step Generation

**Requirement**: SwarmAgent harus menghasilkan micro-steps yang sangat detail dengan:

1. **Step Objective yang Jelas**: Tidak generik, tapi spesifik untuk task tersebut
2. **Prerequisites yang Terinci**: Konsep apa yang harus dipahami sebelum step ini
3. **Teori Singkat**: Penjelasan konsep yang relevan, bukan teori panjang
4. **Dokumentasi Laser-Focused**: Link spesifik ke bagian yang dibutuhkan, bukan dokumentasi full
5. **Challenge yang Actionable**: Instruksi konkret untuk membuat sesuatu, bukan "buat halaman React basic"
6. **Verification Checklist**: Checklist item yang bisa dicek oleh user
7. **Documentation References**: Link ke dokumentasi yang relevan dengan scope step
8. **Next Step Hint**: Hint untuk langkah berikutnya
9. **Ground Truth Code**: Code contoh yang bisa dijadikan referensi

**Contoh Micro-Step Format**:
```typescript
interface MicroStep {
  step_id: number;
  step_title: string;
  step_objective: string;
  
  prerequisites: {
    concepts: string[];           // Konsep yang harus dipahami
    previous_steps: number[];      // Step yang harus selesai sebelumnya
    files_needed: string[];         // File yang harus sudah ada
  };
  
  theory: {
    explanation: string;             // Penjelasan singkat konsep
    key_concepts: string[];        // Poin-poin penting
    duration_minutes: number;          // Estimasi waktu
  };
  
  documentation: {
    required_docs: Array<{
      topic: string;              // Topik spesifik
      url: string;               // Link ke dokumentasi
      relevance: string;           // Kenapa relevan
      sections_to_read: string[];  // Bagian mana yang harus dibaca
    }>;
  };
  
  challenge: {
    title: string;
    description: string;
    requirements: {
      must_include: string[];      // Fitur yang harus ada
      must_not_include: string[];  // Fitur yang tidak boleh ada
      constraints: string[];         // Batasan teknis
    };
    deliverables: {
      file_names: string[];        // Nama file yang harus dibuat
      folder_structure: string;      // Struktur folder
      code_snippets: string[];      // Snippet contoh (optional)
    };
    success_criteria: {
      checks: string[];            // Checklist yang bisa dicek
      metrics: {
        min_lines_of_code: number;
        must_use_concepts: string[];
      };
    };
  };
  
  verification: {
    auto_check: {
      enabled: boolean;
      checks: Array<{
        type: 'file_exists' | 'syntax' | 'import' | 'export';
        description: string;
      }>;
    };
    manual_verification: {
      description: string;
      steps: string[];
    };
  };
  
  ground_truth: {
    final_code: string;           // Code lengkap yang benar
    key_explanation: string[];     // Penjelasan bagian penting
    test_commands: string[];       // Command untuk testing
  };
  
  documentation_references: Array<{
    topic: string;
    url: string;
    relevance: string;
  }>;
  
  next_step_hint: string;
}
```

#### 1.3 Dynamic Roadmap Generation

**Requirement**: ArchitectAgent harus menghasilkan golden path yang dinamis berdasarkan topik spesifik, bukan template statis.

**API Endpoint Baru**:
```typescript
// apps/tee/src/server.ts
app.post('/roadmap/generate-dynamic', async (req, res) => {
  try {
    const { topic, userAddress, mode = 'lite' | 'deep' } = req.body;
    
    const goldenPath = await architectAgent.generateDynamicGoldenPath(topic, mode);
    
    res.json({
      project_id: generateId(),
      project_title: goldenPath.project_title,
      tech_stack: goldenPath.tech_stack,
      milestones: goldenPath.milestones,
      total_steps: goldenPath.milestones.reduce((sum, m) => sum + m.micro_steps.length, 0),
      estimated_duration_hours: goldenPath.estimated_duration
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**ArchitectAgent Method Baru**:
```typescript
// apps/tee/src/agents/architect/ArchitectAgent.ts
public async generateDynamicGoldenPath(
  topic: string,
  mode: 'lite' | 'deep'
): Promise<DynamicGoldenPath> {
  agentLogger.info({ topic, mode }, 'Generating dynamic golden path');
  
  // Step 1: Analisis topik untuk memahami konteks
  const topicAnalysis = await this.analyzeTopic(topic);
  
  // Step 2: Generate milestones yang context-aware
  const milestones = await this.generateContextAwareMilestones(topic, topicAnalysis);
  
  // Step 3: Generate micro-steps untuk setiap milestone
  const goldenPath = {
    project_id: generateId(),
    project_title: topic,
    tech_stack: topicAnalysis.tech_stack,
    milestones: milestones.map((m, idx) => ({
      milestone_id: idx + 1,
      title: m.title,
      description: m.description,
      micro_steps: m.micro_steps,
      success_criteria: m.success_criteria,
      deep_mode: mode === 'deep',
      estimated_time: m.estimated_time,
      prerequisites: m.prerequisites,
      rubric: m.rubric,
      key_concepts: m.key_concepts
    })),
    estimated_duration: milestones.reduce((sum, m) => sum + m.estimated_time, 0)
  };
  
  return goldenPath;
}

private async analyzeTopic(topic: string): Promise<TopicAnalysis> {
  const analysisPrompt = `Analyze this learning topic: "${topic}"

IMPORTANT: 
- Identify the specific TYPE of project/component (e.g., landing page, card component, dashboard, form, etc.)
- Identify the TECH STACK needed (framework, language, tools)
- Identify the KEY CONCEPTS that should be learned
- Break down into LOGICAL PHASES (5-10 phases)

Return analysis as JSON:
{
  "project_type": "component | page | feature | system",
  "tech_stack": {
    "framework": "React | Vue | Angular | None",
    "language": "JavaScript | TypeScript | Python",
    "styling": "Tailwind CSS | CSS Modules | Styled Components",
    "tools": ["tool1", "tool2"]
  },
  "key_concepts": ["concept1", "concept2", ...],
  "phases": [
    {
      "phase_number": 1,
      "phase_title": "Setup & Configuration",
      "key_concepts": ["concept1", "concept2"],
      "estimated_time_minutes": 30
    },
    ...
  ]
}`;

  const analysis = await this.llmService.generateAnalysis(analysisPrompt);
  return JSON.parse(analysis);
}
```

#### 1.4 Context-Aware Milestone Generation

**Requirement**: Milestone harus mengerti context dari step sebelumnya dan step sesudahnya.

**Prompt Engineering**:
```typescript
const generateMilestonePrompt = (
  milestoneNumber: number,
  topic: string,
  previousMilestone?: Milestone,
  nextMilestone?: Milestone,
  topicAnalysis: TopicAnalysis
): string => {
  const context = previousMilestone 
    ? `Previous step completed: "${previousMilestone.title}". User has learned: ${previousMilestone.key_concepts.join(', ')}.
    
Next milestone to complete: "${nextMilestone ? nextMilestone.title : 'FINAL PROJECT'}".
    
Focus on building upon previous work and preparing for next step.`
    : `This is the FIRST milestone for topic: "${topic}".

User is starting fresh. Focus on fundamental setup and getting started.`;
  
  return `Generate a detailed milestone (Step ${milestoneNumber}) for: ${topic}

CONTEXT:
${context}

PROJECT TYPE: ${topicAnalysis.project_type}
TECH STACK: ${JSON.stringify(topicAnalysis.tech_stack)}

REQUIREMENTS:
1. Generate ${microStepCount} micro-steps (3-7 steps)
2. Each micro-step must be ACTIONABLE and COMPLETABLE in 15-30 minutes
3. Include SPECIFIC prerequisites from previous milestones
4. Provide LASER-FOCUSED documentation (only what's needed for THIS step)
5. Create ACTIONABLE challenge (not "build React component")
6. Include verification checklist user can check off
7. Include ground truth code as reference
8. Connect to next milestone logically

OUTPUT FORMAT (JSON):
{
  "title": "Milestone Title",
  "description": "What this milestone achieves",
  "micro_steps": [
    {
      "step_id": ${milestoneNumber}_1,
      "step_title": "Specific Task Title",
      "step_objective": "Clear objective of what user will accomplish",
      "prerequisites": {
        "concepts": ["concept1", "concept2"],
        "previous_steps": [${milestoneNumber - 1}],
        "files_needed": ["file1.ts", "file2.ts"]
      },
      "theory": {
        "explanation": "Brief explanation of key concept",
        "key_concepts": ["concept1", "concept2"],
        "duration_minutes": 15
      },
      "documentation": {
        "required_docs": [
          {
            "topic": "Specific documentation topic",
            "url": "https://react.dev/...",
            "relevance": "Why this is needed for THIS step",
            "sections_to_read": ["Section 1", "Section 2"]
          }
        ]
      },
      "challenge": {
        "title": "Challenge Title",
        "description": "Specific task description",
        "requirements": {
          "must_include": ["feature1", "feature2"],
          "must_not_include": ["pattern1"],
          "constraints": ["Use TypeScript", "Max 100 lines"]
        },
        "deliverables": {
          "file_names": ["Component.tsx"],
          "folder_structure": "src/components/",
          "code_snippets": ["Example snippet"]
        },
        "success_criteria": {
          "checks": [
            "Component renders without errors",
            "All required features implemented"
          ],
          "metrics": {
            "min_lines_of_code": 50,
            "must_use_concepts": ["concept1", "concept2"]
          }
        }
      },
      "verification": {
        "auto_check": {
          "enabled": true,
          "checks": [
            { "type": "file_exists", "description": "Check file exists" },
            { "type": "syntax", "description": "Check for syntax errors" }
          ]
        },
        "manual_verification": {
          "description": "How user can verify manually",
          "steps": ["Step 1", "Step 2", "Step 3"]
        }
      },
      "ground_truth": {
        "final_code": "Complete working code",
        "key_explanation": ["Explanation 1", "Explanation 2"],
        "test_commands": ["npm run dev", "npm test"]
      },
      "documentation_references": [
        { "topic": "Relevant Topic", "url": "https://...", "relevance": "Connection to current step" }
      ],
      "next_step_hint": "Brief hint about what's coming next"
    }
  ]
}`;
};
```

### 2. Frontend (Next.js)

#### 2.1 Code Editor Enhancement

**Requirement**: Editor kode di frontend harus memiliki:
- Syntax highlighting
- Auto-save (ke local storage)
- Preview live
- Error highlighting
- Line numbers

**Implementasi**:
```typescript
// apps/web/components/code-editor.tsx
import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';

export default function CodeEditor({ 
  code, 
  setCode, 
  language = 'typescript',
  sessionId,
  milestoneId 
}) {
  const [savedCode, setSavedCode] = useState<string | null>(null);
  
  // Auto-save ke local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code) {
        localStorage.setItem(`code_${sessionId}_${milestoneId}`, code);
        setSavedCode(new Date());
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [code, sessionId, milestoneId]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 border-b">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50">
          <button
            onClick={() => setCode('')}
            className="px-3 py-1 bg-red-500 text-white"
          >
            Reset Code
          </button>
          {savedCode && (
            <span className="text-xs text-gray-500">
              Last saved: {savedCode.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: { renderType: 'on' },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: 'advanced'
          }}
        />
      </div>
      
      {/* Live Preview */}
      <div className="w-1/2 border-l bg-gray-900">
        <div className="p-4">
          <h3 className="text-lg font-bold mb-2">Preview</h3>
          <iframe
            srcDoc={code}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
```

#### 2.2 Step-by-Step Progress UI

**Requirement**: UI harus menunjukkan progress secara visual:
- Timeline dengan milestone yang aktif
- Micro-step yang sedang dikerjakan
- Checklist untuk setiap micro-step
- Status verifikasi untuk setiap step

**Implementasi**:
```typescript
// apps/web/components/step-progress.tsx
interface StepProgressProps {
  milestones: Milestone[];
  currentMilestone: number;
  currentMicroStep: number;
  completedMicroSteps: number[];
  verificationResults: Map<number, VerificationResult>;
}

export default function StepProgress({
  milestones,
  currentMilestone,
  currentMicroStep,
  completedMicroSteps,
  verificationResults
}: StepProgressProps) {
  return (
    <div className="space-y-6">
      {milestones.map((milestone, milestoneIdx) => (
        <div key={milestone.id} className={`
          border-l-4 ${milestoneIdx < currentMilestone ? 'bg-white' : 'bg-gray-50'}
          ${milestoneIdx === currentMilestone ? 'border-blue-500 border-2' : 'border-gray-300'}
        `}>
          {/* Milestone Header */}
          <div className="p-4 bg-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {milestoneIdx + 1}. {milestone.title}
              </h3>
              {milestoneIdx < currentMilestone && (
                <span className="text-sm text-green-600">✓ Completed</span>
              )}
              {milestoneIdx === currentMilestone && (
                <span className="text-sm text-blue-600">→ In Progress</span>
              )}
            </div>
          </div>
          
          {/* Micro-steps */}
          <div className="p-4 space-y-3">
            {milestone.micro_steps.map((step, stepIdx) => {
            const isCompleted = completedMicroSteps.includes(step.step_id);
            const isCurrent = currentMilestone === milestoneIdx && 
                            currentMicroStep === step.step_id;
            
            return (
              <div
                key={step.step_id}
                className={`
                  p-4 rounded border-l-4
                  ${isCompleted ? 'bg-green-50 border-green-500' : 
                   isCurrent ? 'bg-blue-50 border-blue-500' : 
                   'bg-white border-gray-300'}
                `}
              >
                {/* Step Header */}
                <div className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isCompleted ? 'bg-green-600' : 
                     isCurrent ? 'bg-blue-600' : 'bg-gray-400'}
                  `}>
                    <span className="text-white font-bold">{step.step_id}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{step.step_title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {step.step_objective}
                    </p>
                  </div>
                </div>
                
                {/* Verification Result */}
                {verificationResults.has(step.step_id) && (
                  <div className={`
                    mt-3 p-3 rounded
                    ${verificationResults.get(step.step_id)?.verified ? 'bg-green-100' : 'bg-red-100'}
                  `}>
                    {verificationResults.get(step.step_id)?.verified ? (
                      <div className="text-green-700">
                        <span className="font-bold">✓</span> Verified - 
                        Score: {verificationResults.get(step.step_id)?.score}/100
                      </div>
                    ) : (
                      <div className="text-red-700">
                        <span className="font-bold">✗</span> Failed
                        <p className="text-sm mt-1">
                          {verificationResults.get(step.step_id)?.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Instruksi untuk Qwen

### Bagian 1: Backend - Dynamic Roadmap Generator

**Tugas**: Implementasikan fitur untuk menghasilkan roadmap yang dinamis dan context-aware.

**File yang Perlu Diedit/Dibuat**:
1. `apps/tee/src/agents/architect/ArchitectAgent.ts`
   - Tambahkan method `generateDynamicGoldenPath(topic, mode)`
   - Tambahkan method `analyzeTopic(topic)` untuk menganalisis topik
   - Tambahkan method `generateContextAwareMilestones(topic, analysis)` untuk generate milestones yang context-aware
   - Tambahkan method `generateMicroStep(...)` untuk generate micro-steps detail

2. `apps/tee/src/agents/types/delegation.types.ts`
   - Perbarui interface `DelegationPayload` untuk menyertakan `topic_analysis`
   - Tambahkan interface `TopicAnalysis` untuk menyimpan hasil analisis topik
   - Tambahkan interface `DynamicGoldenPath` untuk format baru

3. `apps/tee/src/server.ts`
   - Tambahkan endpoint `POST /roadmap/generate-dynamic`
   - Handle request body dengan `{ topic, userAddress, mode }`
   - Panggil `architectAgent.generateDynamicGoldenPath()`
   - Return response dengan format `DynamicGoldenPath`

**Catatan Penting**:
- Jangan gunakan template statis untuk roadmap
- Gunakan prompt engineering yang menghasilkan milestones berbeda berdasarkan topik
- Setiap milestone harus terhubung secara logis (step 1 membangun di step 2)
- Mikro-steps harus sangat detail dengan semua field yang ditentukan
- Ground truth code harus tersedia untuk setiap micro-step

### Bagian 2: Backend - Verify Code Feature

**Tugas**: Implementasikan endpoint untuk verifikasi kode user.

**File yang Perlu Diedit/Dibuat**:
1. `apps/tee/src/server.ts`
   - Tambahkan endpoint `POST /verify-code`
   - Endpoint harus menerima `{ sessionId, milestoneId, code }`
   - Panggil `judgingEngine.verifyCode()` dengan parameter yang sesuai
   - Return response dengan `{ verified, score, feedback, nextStep }`

2. `apps/tee/src/judging/JudgingEngine.ts`
   - Perbarui method `verifyCode()` untuk menerima sessionId, milestoneId, userCode
   - Implementasikan logic verifikasi menggunakan AST dan AI judge
   - Return result dengan format `VerificationResult`

**Catatan Penting**:
- Verifikasi harus menggunakan JudgingEngine yang sudah ada (AST + AI)
- Score harus dihitung berdasarkan rubric (completeness, code quality, best practices)
- Feedback harus spesifik dan actionable
- Jika verified, nextStep harus milestoneId + 1
- Jika failed, nextStep harus milestoneId (stay di milestone yang sama)

### Bagian 3: Frontend - Verify Code UI

**Tugas**: Tambahkan fitur verifikasi kode di frontend.

**File yang Perlu Diedit/Dibuat**:
1. `apps/web/app/roadmap/[id]/page.tsx`
   - Tambahkan state untuk `verifyingCode` dan `verificationResult`
   - Tambahkan method `handleVerifyCode()` untuk kirim kode ke backend
   - Render tombol "Verify Code" di setiap module
   - Tampilkan status verifikasi dengan visual feedback (✓/✗)
   - Jika verified, lanjut ke step berikutnya otomatis
   - Jika failed, tampilkan feedback dari AI

2. `apps/web/app/api/verify-code/route.ts` (buat file baru)
   - Buat API route untuk handle POST request
   - Forward request ke TEE service
   - Handle error dengan baik

**Catatan Penting**:
- Tombol verify harus mudah ditemukan di setiap module
- Status verifikasi harus jelas (pending/verified/failed)
- Feedback harus ditampilkan dengan format yang mudah dibaca
- Transisi ke step berikutnya harus smooth

### Bagian 4: Frontend - Enhanced Code Editor

**Tugas**: Upgrade editor kode dengan fitur tambahan.

**File yang Perlu Diedit/Dibuat**:
1. `apps/web/components/code-editor.tsx` (buat file baru)
   - Implementasikan code editor dengan Monaco Editor
   - Tambahkan fitur auto-save ke local storage
   - Tambahkan live preview untuk hasil codingan
   - Tambahkan syntax highlighting dan error checking

2. Update module pages untuk menggunakan CodeEditor
   - Import CodeEditor component
   - Ganti textarea dengan CodeEditor

**Catatan Penting**:
- Editor harus user-friendly dengan syntax highlighting
- Auto-save harus berjalan di background
- Live preview harus update secara real-time
- Error checking harus memberikan feedback visual

### Bagian 5: Frontend - Step Progress UI

**Tugas**: Implementasikan UI untuk menunjukkan progress step-by-step.

**File yang Perlu Diedit/Dibuat**:
1. `apps/web/components/step-progress.tsx` (buat file baru)
   - Implementasikan timeline dengan milestone
   - Tampilkan micro-steps dengan status (completed/in-progress/pending)
   - Tampilkan hasil verifikasi untuk setiap micro-step
   - Gunakan visual indicators (✓, →, ⏳)

2. Update module pages untuk menggunakan StepProgress
   - Import StepProgress component
   - Tampilkan progress timeline di bawah roadmap

**Catatan Penting**:
- UI harus intuitif dan menunjukkan progress dengan jelas
- User harus bisa melihat status setiap micro-step
- Visual feedback untuk completion dan verification harus jelas
- Timeline harus menunjukkan alur pembelajaran

## Testing Checklist

### Backend Testing
- [ ] Dynamic roadmap generation menghasilkan milestones yang context-aware
- [ ] Micro-steps memiliki semua field yang diperlukan
- [ ] Ground truth code tersedia untuk setiap step
- [ ] Verify code endpoint bekerja dengan benar
- [ ] Verifikasi menggunakan JudgingEngine (AST + AI)

### Frontend Testing
- [ ] Tombol verify code muncul di setiap module
- [ ] Verifikasi mengirim data ke backend dengan benar
- [ ] Feedback verifikasi ditampilkan dengan jelas
- [ ] Code editor memiliki syntax highlighting
- [ ] Auto-save ke local storage bekerja
- [ ] Live preview update real-time
- [ ] Step progress UI menunjukkan timeline dengan benar

### Integration Testing
- [ ] Flow dari roadmap generation → verify code → next step bekerja end-to-end
- [ ] User bisa menyelesaikan seluruh roadmap dari awal sampai akhir
- [ ] Ground truth code muncul sebagai referensi setelah step selesai
- [ ] Progress tersimpan dan bisa dilanjutkan di sesi berbeda

## Prioritas Implementasi

### Priority 1 (Critical)
1. Backend - Verify Code Feature
2. Frontend - Verify Code UI

### Priority 2 (High)
3. Backend - Dynamic Roadmap Generator
4. Frontend - Enhanced Code Editor

### Priority 3 (Medium)
5. Frontend - Step Progress UI

---

**Catatan untuk Developer**:
- Implementasikan fitur satu per satu dan test secara menyeluruh
- Setiap fitur harus di-test end-to-end sebelum lanjut ke fitur berikutnya
- Gunakan error handling yang robust untuk API calls
- Pastikan UX konsisten di seluruh aplikasi
