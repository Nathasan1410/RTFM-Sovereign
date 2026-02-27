import { NextResponse } from 'next/server';
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateResponse } from '@/types/schemas';
import { z } from 'zod';
import { SKILL_STAKING_ABI, SKILL_STAKING_ADDRESS } from '@/config/contracts';

const TEE_SERVICE_URL = process.env.TEE_SERVICE_URL || 'http://localhost:3001';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo mode mock roadmap generator - Simulates 3-agent system (Architect, Specialist, Project Manager)
// Generates project-based micro-learning content with cumulative steps
function generateDemoRoadmap(topic: string, version: 'lite' | 'pro') {
  const topicLower = topic.toLowerCase();
  
  // Detect project type from topic
  let projectType = 'component';
  let projectName = topic;
  if (topicLower.includes('page') || topicLower.includes('landing')) {
    projectType = 'page';
    projectName = 'Landing Page';
  } else if (topicLower.includes('dashboard')) {
    projectType = 'dashboard';
    projectName = 'Dashboard';
  } else if (topicLower.includes('card')) {
    projectType = 'component';
    projectName = 'Card Component';
  } else if (topicLower.includes('form')) {
    projectType = 'form';
    projectName = 'Form Component';
  }

  const moduleCount = version === 'pro' ? 7 : 5;
  const modules: Array<{
    order: number;
    title: string;
    context: string;
    docUrl?: string;
    docs?: Array<{ title: string; url: string }>;
    challenge: string;
    verificationCriteria: string[];
    groundTruth?: string;
    starterCode?: string;
  }> = [];

  // Project-based learning path - each module builds on previous
  const learningPath = getProjectBasedLearningPath(projectType, topic) || [];

  for (let i = 1; i <= moduleCount; i++) {
    const pathItem = learningPath[i - 1] || learningPath[learningPath.length - 1] || learningPath[0];
    
    modules.push({
      order: i,
      title: `Step ${i}: ${pathItem.title}`,
      context: buildContext(i, topic, pathItem, modules),
      docUrl: pathItem.docUrl,
      docs: pathItem.docs,
      challenge: buildChallenge(i, topic, pathItem, projectType),
      verificationCriteria: pathItem.verificationCriteria,
      groundTruth: pathItem.groundTruth,
      starterCode: pathItem.starterCode
    });
  }

  return {
    title: `Build a ${projectName} with ${topic}`.slice(0, 100),
    modules
  };
}

// Project-based learning paths for common project types
function getProjectBasedLearningPath(projectType: string, topic: string) {
  const paths: Record<string, any[]> = {
    component: [
      {
        title: 'Project Setup & Structure',
        docUrl: 'https://react.dev/learn#react-documentation',
        docs: [
          { title: 'React: Your First Component', url: 'https://react.dev/learn/your-first-component' },
          { title: 'React: Project Structure', url: 'https://react.dev/learn/keeping-components-pure' }
        ],
        verificationCriteria: [
          'Project compiles without errors',
          'Basic component structure is created',
          'Component exports correctly'
        ],
        groundTruth: `import React from 'react';\n\nexport default function ${topic.replace(/\s/g, '')}() {\n  return (\n    <div className="container">\n      <h1>${topic}</h1>\n    </div>\n  );\n}`,
        starterCode: `// Create your component structure here\nexport default function Component() {\n  // TODO: Add your component code\n  return <div>Hello World</div>;\n}`
      },
      {
        title: 'Add Basic Styling with Tailwind',
        docUrl: 'https://tailwindcss.com/docs',
        docs: [
          { title: 'Tailwind: Flexbox', url: 'https://tailwindcss.com/docs/flex' },
          { title: 'Tailwind: Padding & Spacing', url: 'https://tailwindcss.com/docs/padding' }
        ],
        verificationCriteria: [
          'Component has proper padding',
          'Layout uses flexbox correctly',
          'Colors match design requirements'
        ],
        groundTruth: `export default function ${topic.replace(/\s/g, '')}() {\n  return (\n    <div className="flex flex-col p-6 bg-white rounded-lg shadow-md">\n      <h1 className="text-2xl font-bold text-gray-800">${topic}</h1>\n    </div>\n  );\n}`,
        starterCode: `// Add Tailwind classes for styling\nexport default function Component() {\n  return (\n    <div className="">\n      <h1 className="">${topic}</h1>\n    </div>\n  );\n}`
      },
      {
        title: 'Add Props & Dynamic Content',
        docUrl: 'https://react.dev/learn/passing-props-to-a-component',
        docs: [
          { title: 'React: Passing Props', url: 'https://react.dev/learn/passing-props-to-a-component' },
          { title: 'React: Component Props', url: 'https://react.dev/reference/react/Component#props' }
        ],
        verificationCriteria: [
          'Component accepts props',
          'Props are displayed correctly',
          'TypeScript interfaces are defined'
        ],
        groundTruth: `interface ${topic.replace(/\s/g, '')}Props {\n  title: string;\n  description?: string;\n}\n\nexport default function ${topic.replace(/\s/g, '')}({ title, description }: ${topic.replace(/\s/g, '')}Props) {\n  return (\n    <div className="flex flex-col p-6 bg-white rounded-lg shadow-md">\n      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>\n      {description && <p className="text-gray-600 mt-2">{description}</p>}\n    </div>\n  );\n}`,
        starterCode: `// Define props interface and use them\ninterface Props {\n  // Add your props here\n}\n\nexport default function Component({ }: Props) {\n  return <div></div>;\n}`
      },
      {
        title: 'Add Interactivity with State',
        docUrl: 'https://react.dev/reference/react/useState',
        docs: [
          { title: 'React: useState Hook', url: 'https://react.dev/reference/react/useState' },
          { title: 'React: Adding Interactivity', url: 'https://react.dev/learn/adding-interactivity' }
        ],
        verificationCriteria: [
          'useState hook is used correctly',
          'Event handlers are implemented',
          'State updates trigger re-renders'
        ],
        groundTruth: `import { useState } from 'react';\n\nexport default function ${topic.replace(/\s/g, '')}() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div className="flex flex-col p-6 bg-white rounded-lg shadow-md">\n      <h1 className="text-2xl font-bold">${topic}</h1>\n      <p className="text-gray-600 mt-2">Count: {count}</p>\n      <button \n        onClick={() => setCount(count + 1)}\n        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"\n      >\n        Increment\n      </button>\n    </div>\n  );\n}`,
        starterCode: `import { useState } from 'react';\n\nexport default function Component() {\n  // Add state here\n  const [value, setValue] = useState(0);\n  \n  return (\n    <div>\n      {/* Add interactive elements */}\n    </div>\n  );\n}`
      },
      {
        title: 'Polish & Best Practices',
        docUrl: 'https://react.dev/learn/keeping-components-pure',
        docs: [
          { title: 'React: Pure Components', url: 'https://react.dev/learn/keeping-components-pure' },
          { title: 'React: Code Best Practices', url: 'https://react.dev/learn/preserving-and-resetting-state' }
        ],
        verificationCriteria: [
          'Component follows React best practices',
          'Code is properly organized',
          'All edge cases are handled'
        ],
        groundTruth: `import { useState } from 'react';\n\ninterface ${topic.replace(/\s/g, '')}Props {\n  title: string;\n  description?: string;\n}\n\n/**\n * ${topic} Component\n * A reusable component with proper TypeScript typing\n */\nexport default function ${topic.replace(/\s/g, '')}({ \n  title, \n  description \n}: ${topic.replace(/\s/g, '')}Props) {\n  const [isExpanded, setIsExpanded] = useState(false);\n  \n  return (\n    <article className="flex flex-col p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">\n      <header>\n        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>\n        {description && (\n          <p className="text-gray-600 mt-2">{description}</p>\n        )}\n      </header>\n      \n      <button\n        onClick={() => setIsExpanded(!isExpanded)}\n        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"\n        aria-expanded={isExpanded}\n      >\n        {isExpanded ? 'Show Less' : 'Show More'}\n      </button>\n      \n      {isExpanded && (\n        <section className="mt-4 pt-4 border-t border-gray-200">\n          <p className="text-gray-700">Expanded content goes here...</p>\n        </section>\n      )}\n    </article>\n  );\n}`,
        starterCode: `// Final polished version with all features\nimport { useState } from 'react';\n\ninterface Props {\n  // Add your props\n}\n\nexport default function Component({ }: Props) {\n  // Add your implementation\n  return <div></div>;\n}`
      }
    ],
    page: [
      {
        title: 'Setup Next.js Project',
        docUrl: 'https://nextjs.org/docs',
        docs: [
          { title: 'Next.js: Getting Started', url: 'https://nextjs.org/docs/getting-started' },
          { title: 'Next.js: Project Structure', url: 'https://nextjs.org/docs/app/building-your-application/routing/colocation' }
        ],
        verificationCriteria: [
          'Next.js project is set up correctly',
          'Development server runs without errors',
          'Basic page structure exists'
        ],
        groundTruth: `// app/page.tsx\nexport default function Home() {\n  return (\n    <main className="min-h-screen p-8">\n      <h1 className="text-4xl font-bold">${topic}</h1>\n    </main>\n  );\n}`,
        starterCode: `// Create your page component\nexport default function Page() {\n  return (\n    <main>\n      <h1>${topic}</h1>\n    </main>\n  );\n}`
      },
      {
        title: 'Build Page Layout',
        docUrl: 'https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts',
        docs: [
          { title: 'Next.js: Layouts', url: 'https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts' },
          { title: 'Tailwind: Layout Utilities', url: 'https://tailwindcss.com/docs/layout' }
        ],
        verificationCriteria: [
          'Page has proper layout structure',
          'Navigation is implemented',
          'Responsive design is in place'
        ],
        groundTruth: `export default function Page() {\n  return (\n    <div className="flex flex-col min-h-screen">\n      <nav className="p-4 bg-gray-900 text-white">\n        <div className="container mx-auto">Navigation</div>\n      </nav>\n      <main className="flex-1 p-8">{/* Content */}</main>\n      <footer className="p-4 bg-gray-100">Footer</footer>\n    </div>\n  );\n}`,
        starterCode: `// Build your page layout\nexport default function Page() {\n  return (\n    <div className="">\n      {/* Add navigation, main content, footer */}\n    </div>\n  );\n}`
      },
      {
        title: 'Add Page Content Sections',
        docUrl: 'https://react.dev/learn',
        docs: [
          { title: 'React: Component Composition', url: 'https://react.dev/learn/passing-data-deeply' }
        ],
        verificationCriteria: [
          'All content sections are present',
          'Components are properly composed',
          'Content is well-organized'
        ],
        groundTruth: `function Hero() {\n  return <section className="py-20"><h2>Hero Section</h2></section>;\n}\n\nfunction Features() {\n  return <section className="py-16"><h2>Features</h2></section>;\n}\n\nexport default function Page() {\n  return (\n    <>\n      <Hero />\n      <Features />\n    </>\n  );\n}`,
        starterCode: `// Create content sections\nfunction Section1() { return <section></section>; }\nfunction Section2() { return <section></section>; }\n\nexport default function Page() {\n  return (\n    <>\n      <Section1 />\n      <Section2 />\n    </>\n  );\n}`
      },
      {
        title: 'Add Responsive Design',
        docUrl: 'https://tailwindcss.com/docs/responsive-design',
        docs: [
          { title: 'Tailwind: Responsive Design', url: 'https://tailwindcss.com/docs/responsive-design' }
        ],
        verificationCriteria: [
          'Page is responsive on all screen sizes',
          'Mobile-first approach is used',
          'Breakpoints are properly implemented'
        ],
        groundTruth: `export default function Page() {\n  return (\n    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n      <div className="p-4">Column 1</div>\n      <div className="p-4">Column 2</div>\n      <div className="p-4">Column 3</div>\n    </div>\n  );\n}`,
        starterCode: `// Add responsive classes\nexport default function Page() {\n  return (\n    <div className="grid grid-cols-1">\n      {/* Add responsive columns */}\n    </div>\n  );\n}`
      },
      {
        title: 'Add Interactivity & Forms',
        docUrl: 'https://react.dev/learn/forms',
        docs: [
          { title: 'React: Forms', url: 'https://react.dev/learn/forms' },
          { title: 'React: Event Handling', url: 'https://react.dev/reference/react-dom/components/common#react-event-object' }
        ],
        verificationCriteria: [
          'Forms work correctly',
          'Event handlers are implemented',
          'Form validation is in place'
        ],
        groundTruth: `'use client';\nimport { useState } from 'react';\n\nexport default function Page() {\n  const [email, setEmail] = useState('');\n  \n  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    console.log('Submitted:', email);\n  };\n  \n  return (\n    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">\n      <input\n        type="email"\n        value={email}\n        onChange={(e) => setEmail(e.target.value)}\n        className="w-full p-2 border rounded"\n        placeholder="Enter email"\n        required\n      />\n      <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">\n        Submit\n      </button>\n    </form>\n  );\n}`,
        starterCode: `'use client';\nimport { useState } from 'react';\n\nexport default function Page() {\n  // Add form state and handler\n  return (\n    <form>\n      {/* Add form fields */}\n    </form>\n  );\n}`
      }
    ],
    dashboard: [
      {
        title: 'Setup Dashboard Project',
        docUrl: 'https://nextjs.org/docs',
        docs: [
          { title: 'Next.js: App Router', url: 'https://nextjs.org/docs/app' }
        ],
        verificationCriteria: ['Project setup complete', 'Basic structure exists'],
        groundTruth: `export default function Dashboard() {\n  return (\n    <div className="grid grid-cols-4 gap-4 p-4">\n      <aside className="col-span-1">Sidebar</aside>\n      <main className="col-span-3">Content</main>\n    </div>\n  );\n}`,
        starterCode: `export default function Dashboard() {\n  return <div>Dashboard</div>;\n}`
      },
      {
        title: 'Build Dashboard Layout',
        docUrl: 'https://tailwindcss.com/docs/grid-template-columns',
        docs: [
          { title: 'Tailwind: Grid', url: 'https://tailwindcss.com/docs/grid-template-columns' }
        ],
        verificationCriteria: ['Sidebar exists', 'Main content area exists', 'Grid layout works'],
        groundTruth: `export default function Dashboard() {\n  return (\n    <div className="flex h-screen">\n      <aside className="w-64 bg-gray-800 text-white p-4">Sidebar</aside>\n      <main className="flex-1 p-8 overflow-auto">Main Content</main>\n    </div>\n  );\n}`,
        starterCode: `export default function Dashboard() {\n  return (\n    <div className="">\n      <aside>Sidebar</aside>\n      <main>Content</main>\n    </div>\n  );\n}`
      },
      {
        title: 'Add Data Visualization',
        docUrl: 'https://react.dev/reference/react/useEffect',
        docs: [
          { title: 'React: useEffect', url: 'https://react.dev/reference/react/useEffect' }
        ],
        verificationCriteria: ['Charts render correctly', 'Data is displayed'],
        groundTruth: `export default function Dashboard() {\n  const [data, setData] = useState([]);\n  \n  useEffect(() => {\n    // Fetch data\n  }, []);\n  \n  return (\n    <div className="grid grid-cols-3 gap-4">\n      <div className="p-4 bg-white rounded shadow">Stat 1</div>\n      <div className="p-4 bg-white rounded shadow">Stat 2</div>\n      <div className="p-4 bg-white rounded shadow">Stat 3</div>\n    </div>\n  );\n}`,
        starterCode: `import { useState, useEffect } from 'react';\n\nexport default function Dashboard() {\n  const [data, setData] = useState([]);\n  \n  useEffect(() => {\n    // Fetch data\n  }, []);\n  \n  return <div>{/* Add stats */}</div>;\n}`
      }
    ],
    form: [
      {
        title: 'Create Form Structure',
        docUrl: 'https://react.dev/learn/forms',
        docs: [
          { title: 'React: Forms', url: 'https://react.dev/learn/forms' }
        ],
        verificationCriteria: ['Form exists', 'Input fields are present'],
        groundTruth: `export default function Form() {\n  return (\n    <form className="max-w-md mx-auto p-4">\n      <input type="text" className="w-full p-2 border rounded" />\n      <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Submit</button>\n    </form>\n  );\n}`,
        starterCode: `export default function Form() {\n  return (\n    <form>\n      {/* Add inputs */}\n    </form>\n  );\n}`
      },
      {
        title: 'Add Form State Management',
        docUrl: 'https://react.dev/reference/react/useState',
        docs: [
          { title: 'React: Controlled Components', url: 'https://react.dev/learn/forms#keeping-the-input-values-in-sync-with-state' }
        ],
        verificationCriteria: ['Form state is managed', 'Inputs are controlled'],
        groundTruth: `export default function Form() {\n  const [formData, setFormData] = useState({ name: '', email: '' });\n  \n  const handleChange = (e) => {\n    setFormData({ ...formData, [e.target.name]: e.target.value });\n  };\n  \n  return (\n    <form>\n      <input name="name" value={formData.name} onChange={handleChange} />\n      <input name="email" value={formData.email} onChange={handleChange} />\n    </form>\n  );\n}`,
        starterCode: `export default function Form() {\n  const [formData, setFormData] = useState({});\n  \n  return (\n    <form>\n      {/* Add controlled inputs */}\n    </form>\n  );\n}`
      },
      {
        title: 'Add Form Validation',
        docUrl: 'https://react.dev/learn/form-actions',
        docs: [
          { title: 'React: Form Validation', url: 'https://react.dev/learn/form-actions' }
        ],
        verificationCriteria: ['Validation works', 'Error messages display'],
        groundTruth: `export default function Form() {\n  const [errors, setErrors] = useState({});\n  \n  const validate = () => {\n    const newErrors = {};\n    if (!formData.name) newErrors.name = 'Name is required';\n    setErrors(newErrors);\n    return Object.keys(newErrors).length === 0;\n  };\n  \n  return (\n    <form>\n      <input name="name" />\n      {errors.name && <span className="text-red-500">{errors.name}</span>}\n    </form>\n  );\n}`,
        starterCode: `export default function Form() {\n  const [errors, setErrors] = useState({});\n  \n  return (\n    <form>\n      {/* Add validation */}\n    </form>\n  );\n}`
      }
    ]
  };

  return paths[projectType] || paths.component;
}

// Build context that references previous steps
function buildContext(stepNum: number, topic: string, pathItem: any, previousModules: any[]) {
  const previousStep = stepNum > 1 ? previousModules[stepNum - 2] : null;
  const previousContext = previousStep ? ` In Step ${stepNum - 1}, you learned: ${previousStep.title.split(': ')[1]}.` : '';
  
  return `In Step ${stepNum}, you'll learn to ${pathItem.title.toLowerCase()}.${previousContext} This builds toward your final ${topic} project.`;
}

// Build specific, actionable challenge
function buildChallenge(stepNum: number, topic: string, pathItem: any, projectType: string) {
  return `# Step ${stepNum}: ${pathItem.title}\n\n## Objective\nBuild the ${pathItem.title.toLowerCase()} for your ${topic} project.\n\n## Requirements\n${pathItem.verificationCriteria.map((c: string) => `- ${c}`).join('\n')}\n\n## Documentation\nStudy these resources before coding:\n${pathItem.docs.map((d: any) => `- [${d.title}](${d.url})`).join('\n')}\n\n## Deliverables\nCreate/modify the component files to implement the required functionality.\n\n## Success Criteria\nCheck off each item when complete:\n${pathItem.verificationCriteria.map((c: string) => `- [ ] ${c}`).join('\n')}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, version = 'lite', userAddress, mode = 'learn' } = GenerateRequestSchema.parse(body);

    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      return NextResponse.json(
        { error: 'Topic must be at least 3 characters long' },
        { status: 400 }
      );
    }

    const finalUserAddress = userAddress || '0x0000000000000000000000000000000000000';
    console.log('[API Generate] User Address:', finalUserAddress);
    console.log('[API Generate] Topic:', cleanTopic);
    console.log('[API Generate] Mode:', mode);
    console.log('[API Generate] Demo Mode:', DEMO_MODE);

    // Demo mode: Generate mock roadmap without calling TEE service
    if (DEMO_MODE) {
      console.log('[API Generate] Using demo mode - generating mock roadmap');
      const demoRoadmap = generateDemoRoadmap(cleanTopic, version);
      
      const validatedResponse = {
        title: demoRoadmap.title,
        modules: demoRoadmap.modules
      };

      const validated = GenerateResponseSchema.parse(validatedResponse);

      return NextResponse.json({
        ...validated,
        sessionId: null,
        userAddress: finalUserAddress
      });
    }

    // For proof mode, verify staking status (handled by frontend, just pass through)
    const requestBody: any = {
      topic: cleanTopic,
      userAddress: finalUserAddress,
      mode: version === 'pro' ? 'deep' : 'lite'
    };

    // Use the new Dynamic Roadmap Generator
    console.log('[API Generate] Calling TEE service:', `${TEE_SERVICE_URL}/roadmap/generate-dynamic`);
    console.log('[API Generate] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${TEE_SERVICE_URL}/roadmap/generate-dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // Add timeout
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    console.log('[API Generate] TEE response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('[API Generate] TEE service failed, falling back to demo mode:', errorData.error);
      // Fallback to demo mode if TEE service fails
      const demoRoadmap = generateDemoRoadmap(cleanTopic, version);

      const validatedResponse = {
        title: demoRoadmap.title,
        modules: demoRoadmap.modules
      };

      const validated = GenerateResponseSchema.parse(validatedResponse);

      return NextResponse.json({
        ...validated,
        sessionId: null,
        userAddress: finalUserAddress
      });
    }

    const data = await response.json();
    console.log('[API Generate] TEE response received:', {
      milestones: data.milestones?.length,
      sessionId: data.session_id
    });
    
    // Map DynamicMilestones to ModuleContent (Micro-Steps flattened)
    const modules = [];
    let orderCounter = 1;

    if (data.milestones && Array.isArray(data.milestones)) {
      for (const milestone of data.milestones) {
        if (milestone.micro_steps && Array.isArray(milestone.micro_steps)) {
          for (const step of milestone.micro_steps) {
            // Aggregate verification criteria
            const criteria = [];
            if (step.verification?.auto_check?.checks) {
              criteria.push(...step.verification.auto_check.checks.map((c: any) => c.description));
            }
            if (step.verification?.manual_verification?.steps) {
              criteria.push(...step.verification.manual_verification.steps);
            }
            if (criteria.length === 0) {
              criteria.push("Complete the step objectives");
            }

            // Aggregate documentation
            const docs = [];
            if (step.documentation?.required_docs) {
              docs.push(...step.documentation.required_docs.map((d: any) => ({
                title: d.topic || "Documentation",
                url: d.url
              })));
            }

            // Construct Challenge text
            let challengeText = `${step.challenge?.description || step.step_objective}\n\n`;
            
            if (step.challenge?.requirements) {
              challengeText += `### Requirements:\n`;
              if (step.challenge.requirements.must_include) {
                step.challenge.requirements.must_include.forEach((req: string) => challengeText += `- ${req}\n`);
              }
              if (step.challenge.requirements.constraints) {
                challengeText += `\n**Constraints:**\n`;
                step.challenge.requirements.constraints.forEach((req: string) => challengeText += `- ${req}\n`);
              }
            }

            if (step.challenge?.deliverables) {
               challengeText += `\n### Deliverables:\n`;
               if (step.challenge.deliverables.file_names) {
                 challengeText += `Files: ${step.challenge.deliverables.file_names.join(', ')}\n`;
               }
            }

            modules.push({
              order: orderCounter++,
              title: step.step_title || `Step ${step.step_id}`,
              context: `${step.theory?.explanation || milestone.description}\n\nKey Concepts: ${(step.theory?.key_concepts || []).join(', ')}`,
              docUrl: docs.length > 0 ? docs[0].url : undefined,
              docs: docs,
              challenge: challengeText,
              verificationCriteria: criteria,
              groundTruth: step.ground_truth?.final_code,
              starterCode: step.challenge?.deliverables?.code_snippets?.[0] || ""
            });
          }
        }
      }
    }

    // Fallback if no milestones/micro-steps (should not happen with TEE fallback)
    if (modules.length === 0) {
       // ... existing fallback logic or error?
       // Let's assume TEE returns correct structure or we handle error above
    }

    const validatedResponse = {
      title: data.project_title || `Mastering ${cleanTopic}`,
      modules: modules
    };

    // Validate against schema (schema constraints relaxed in previous step)
    const validated = GenerateResponseSchema.parse(validatedResponse);

    let sessionId = null;
    if (finalUserAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        const sessionResponse = await fetch(`${TEE_SERVICE_URL}/session/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: finalUserAddress,
            goldenPath: {
              // Pass the flattened modules as milestones to session
              milestones: validated.modules.map((m, idx) => ({
                id: idx + 1,
                title: m.title,
                description: m.context,
                difficulty: 'medium' as const
              }))
            }
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          sessionId = sessionData.sessionId;
          console.log('[API Generate] TEE Session created:', sessionId);
        } else {
          console.warn('[API Generate] Failed to create TEE session');
        }
      } catch (error) {
        console.warn('[API Generate] Error creating TEE session:', error);
      }
    }

    return NextResponse.json({
      ...validated,
      sessionId,
      userAddress: finalUserAddress
    });
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}