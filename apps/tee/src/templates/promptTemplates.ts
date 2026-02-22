export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

export const CHALLENGE_GENERATION_TEMPLATES: PromptTemplate[] = [
  {
    name: 'core_concept',
    template: `Explain the core concept of {topic} in the context of Web3/blockchain development.

Your response should:
1. Define the concept clearly
2. Explain its importance in the ecosystem
3. Provide a practical code example
4. Mention common use cases
5. Note any security considerations

Use clear, concise language and structure your answer with appropriate headings and code blocks.`,
    variables: ['topic'],
  },
  {
    name: 'security_considerations',
    template: `What are the security considerations when working with {topic} in smart contract development?

Your response should cover:
1. Common vulnerabilities related to {topic}
2. Best practices for secure implementation
3. Real-world examples of exploits (if applicable)
4. Tools and techniques for security testing
5. Checklist for security review

Provide code examples showing both vulnerable and secure patterns.`,
    variables: ['topic'],
  },
  {
    name: 'common_pitfalls',
    template: `Describe a common pitfall with {topic} and how to avoid it.

In your response:
1. Explain the pitfall clearly
2. Show code demonstrating the problematic pattern
3. Explain why it causes issues
4. Provide the correct solution
5. Discuss any trade-offs

Use concrete examples and explain the reasoning behind the best practices.`,
    variables: ['topic'],
  },
  {
    name: 'optimization',
    template: `How would you optimize a system that heavily uses {topic}?

Your response should address:
1. Performance bottlenecks specific to {topic}
2. Optimization strategies and techniques
3. Trade-offs between different approaches
4. Measurement and profiling methods
5. Code examples showing before/after optimization

Include specific metrics and benchmarks where applicable.`,
    variables: ['topic'],
  },
  {
    name: 'comparison',
    template: `Compare {topic} with an alternative approach in a real-world scenario.

Structure your response as follows:
1. Brief overview of both approaches
2. Comparison table of key features
3. Use cases where each approach excels
4. Code examples demonstrating both approaches
5. Decision criteria for choosing between them

Be objective and highlight both advantages and disadvantages.`,
    variables: ['topic'],
  },
];

export const EVALUATION_TEMPLATES: PromptTemplate[] = [
  {
    name: 'technical_depth',
    template: `Evaluate the technical depth of the following answer about {topic}:

Answer:
{answer}

Rate the technical depth on a scale of 0-100 based on:
1. Demonstration of deep understanding
2. Use of advanced concepts and patterns
3. Inclusion of code examples or technical details
4. Awareness of edge cases and trade-offs
5. Accuracy of technical statements

Provide a score and brief justification.`,
    variables: ['topic', 'answer'],
  },
  {
    name: 'completeness',
    template: `Assess the completeness of this answer to a question about {topic}:

Question: {question}
Answer: {answer}

Evaluate completeness on a scale of 0-100 considering:
1. Whether all aspects of the question were addressed
2. Depth of explanation
3. Coverage of important details
4. Inclusion of examples or illustrations
5. Overall thoroughness

Provide a score and specific feedback on what's missing.`,
    variables: ['topic', 'question', 'answer'],
  },
  {
    name: 'clarity',
    template: `Rate the clarity of this response about {topic}:

{answer}

Assess clarity on a scale of 0-100 based on:
1. Logical organization and structure
2. Use of clear, concise language
3. Appropriate use of headings and formatting
4. Effectiveness of code examples
5. Overall readability

Provide a score and suggestions for improvement.`,
    variables: ['topic', 'answer'],
  },
];

export const FALLBACK_TEMPLATES: PromptTemplate[] = [
  {
    name: 'explanation_fallback',
    template: `Explain the core concept of {topic} in Web3/blockchain development.

Key points to cover:
- Definition and purpose
- How it works
- Use cases and examples
- Best practices
- Common mistakes to avoid

Keep it clear and practical.`,
    variables: ['topic'],
  },
  {
    name: 'security_fallback',
    template: `What are the key security considerations for {topic}?

Address:
- Common vulnerabilities
- Security best practices
- Prevention techniques
- Testing methods
- Code review checklist

Provide concrete examples where possible.`,
    variables: ['topic'],
  },
  {
    name: 'optimization_fallback',
    template: `How can {topic} be optimized for better performance?

Cover:
- Performance bottlenecks
- Optimization strategies
- Tools and techniques
- Measurement approaches
- Code examples

Be specific and actionable.`,
    variables: ['topic'],
  },
  {
    name: 'testing_fallback',
    template: `What's the best approach to testing {topic}?

Include:
- Unit testing strategies
- Integration testing approaches
- Edge cases to consider
- Testing tools and frameworks
- Common testing mistakes

Provide practical advice and examples.`,
    variables: ['topic'],
  },
];

export class PromptTemplateManager {
  private challengeTemplates: Map<string, PromptTemplate>;
  private evaluationTemplates: Map<string, PromptTemplate>;
  private fallbackTemplates: Map<string, PromptTemplate>;

  constructor() {
    this.challengeTemplates = this.initChallengeTemplates();
    this.evaluationTemplates = this.initEvaluationTemplates();
    this.fallbackTemplates = this.initFallbackTemplates();
  }

  private initChallengeTemplates(): Map<string, PromptTemplate> {
    const map = new Map<string, PromptTemplate>();
    CHALLENGE_GENERATION_TEMPLATES.forEach((template) => {
      map.set(template.name, template);
    });
    return map;
  }

  private initEvaluationTemplates(): Map<string, PromptTemplate> {
    const map = new Map<string, PromptTemplate>();
    EVALUATION_TEMPLATES.forEach((template) => {
      map.set(template.name, template);
    });
    return map;
  }

  private initFallbackTemplates(): Map<string, PromptTemplate> {
    const map = new Map<string, PromptTemplate>();
    FALLBACK_TEMPLATES.forEach((template) => {
      map.set(template.name, template);
    });
    return map;
  }

  public getChallengeTemplate(name: string): PromptTemplate | undefined {
    return this.challengeTemplates.get(name);
  }

  public getEvaluationTemplate(name: string): PromptTemplate | undefined {
    return this.evaluationTemplates.get(name);
  }

  public getFallbackTemplate(name: string): PromptTemplate | undefined {
    return this.fallbackTemplates.get(name);
  }

  public fillTemplate(template: PromptTemplate, values: Record<string, string>): string {
    let filled = template.template;

    template.variables.forEach((variable) => {
      const placeholder = `{${variable}}`;
      const value = values[variable] || placeholder;
      filled = filled.replace(new RegExp(placeholder, 'g'), value);
    });

    return filled;
  }

  public getRandomChallengeTemplate(): PromptTemplate {
    const templates = Array.from(this.challengeTemplates.values());
    const index = Math.floor(Math.random() * templates.length);
    return templates[index];
  }

  public getChallengeTemplateNames(): string[] {
    return Array.from(this.challengeTemplates.keys());
  }

  public getEvaluationTemplateNames(): string[] {
    return Array.from(this.evaluationTemplates.keys());
  }

  public getFallbackTemplateNames(): string[] {
    return Array.from(this.fallbackTemplates.keys());
  }
}
