import { cerebrasLogger } from '../utils/logger';

export interface CerebrasRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface CerebrasResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  successCount: number;
  lastSuccessTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    successCount: 0,
  };

  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 60000;
  private readonly SUCCESS_THRESHOLD = 3;

  constructor(private readonly name: string) {
    cerebrasLogger.info({ name }, 'CircuitBreaker initialized');
  }

  public isOpen(): boolean {
    if (this.state.isOpen) {
      const elapsed = Date.now() - (this.state.lastFailureTime?.getTime() || 0);
      if (elapsed > this.RECOVERY_TIMEOUT) {
        this.state.isOpen = false;
        cerebrasLogger.info(
          { name: this.name },
          'Circuit breaker transitioning to half-open state'
        );
      }
    }
    return this.state.isOpen;
  }

  public recordSuccess(): void {
    this.state.successCount++;
    this.state.lastSuccessTime = new Date();

    if (!this.state.isOpen && this.state.successCount >= this.SUCCESS_THRESHOLD) {
      cerebrasLogger.info(
        { name: this.name, successCount: this.state.successCount },
        'Circuit breaker fully closed'
      );
      this.state.successCount = 0;
      this.state.failureCount = 0;
    }
  }

  public recordFailure(error: Error): void {
    this.state.failureCount++;
    this.state.lastFailureTime = new Date();

    cerebrasLogger.error(
      { name: this.name, failureCount: this.state.failureCount, error: error.message },
      'Circuit breaker failure recorded'
    );

    if (this.state.failureCount >= this.FAILURE_THRESHOLD) {
      this.state.isOpen = true;
      cerebrasLogger.warn(
        { name: this.name },
        'Circuit breaker opened due to repeated failures'
      );
    }
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  public reset(): void {
    cerebrasLogger.info({ name: this.name }, 'Circuit breaker manually reset');
    this.state = {
      isOpen: false,
      failureCount: 0,
      successCount: 0,
    };
  }
}

export class CerebrasService {
  private readonly baseURL = 'https://api.cerebras.ai/v1';
  private readonly defaultModel = 'llama-3.3-70b';
  private circuitBreaker: CircuitBreaker;

  constructor(private readonly apiKey: string) {
    this.circuitBreaker = new CircuitBreaker('CerebrasService');
    cerebrasLogger.info({ model: this.defaultModel }, 'CerebrasService initialized');
  }

  public async generateResponse(request: CerebrasRequest): Promise<string> {
    if (this.circuitBreaker.isOpen()) {
      cerebrasLogger.warn('Circuit breaker is open, using fallback response');
      return this.generateFallbackResponse(request);
    }

    try {
      const response = await this.callCerebrasAPI(request);
      this.circuitBreaker.recordSuccess();
      cerebrasLogger.info({ promptLength: request.prompt.length }, 'Cerebras API call successful');
      return response.choices[0].message.content;
    } catch (error) {
      this.circuitBreaker.recordFailure(error as Error);
      cerebrasLogger.error({ error }, 'Cerebras API call failed, using fallback');
      return this.generateFallbackResponse(request);
    }
  }

  private async callCerebrasAPI(request: CerebrasRequest): Promise<CerebrasResponse> {
    const url = `${this.baseURL}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const body = {
      model: request.model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as CerebrasResponse;
  }

  private generateFallbackResponse(request: CerebrasRequest): string {
    const prompt = request.prompt.toLowerCase();

    if (prompt.includes('explain') || prompt.includes('what is')) {
      return this.generateExplanationFallback(request);
    } else if (prompt.includes('security') || prompt.includes('vulnerability')) {
      return this.generateSecurityFallback(request);
    } else if (prompt.includes('optimization') || prompt.includes('gas')) {
      return this.generateOptimizationFallback(request);
    } else if (prompt.includes('test') || prompt.includes('verify')) {
      return this.generateTestingFallback(request);
    }

    return this.generateGenericFallback(request);
  }

  private generateExplanationFallback(request: CerebrasRequest): string {
    return `Based on your question about "${request.prompt.substring(0, 50)}...", here's a comprehensive explanation:

This concept involves several key principles that are fundamental to the technology stack:

1. Core Concept: The fundamental idea revolves around managing state and operations in a decentralized manner, ensuring that all participants can verify the integrity of the system.

2. Implementation Details: In practice, this is achieved through careful design of data structures and functions that maintain consistency across the network while allowing for valid state transitions.

3. Best Practices: When working with this concept, always ensure proper error handling, validate all inputs, and consider edge cases that might lead to unexpected behavior.

4. Security Considerations: Pay special attention to access control mechanisms and ensure that only authorized entities can perform sensitive operations.

For more detailed information and code examples, I recommend reviewing the official documentation and studying production implementations.`;
  }

  private generateSecurityFallback(request: CerebrasRequest): string {
    return `Security Analysis for: "${request.prompt.substring(0, 50)}..."

Key Security Considerations:

1. Input Validation: Always validate all external inputs and sanitize user-provided data to prevent injection attacks.

2. Access Control: Implement proper role-based access control (RBAC) to ensure that users can only perform actions they're authorized for.

3. Reentrancy Protection: Use the Checks-Effects-Interactions pattern and consider implementing reentrancy guards where applicable.

4. Integer Overflow/Underflow: In modern frameworks (Solidity 0.8+), this is handled automatically, but be aware of this when working with older codebases.

5. Front-Running: Consider using commit-reveal schemes or time-based delays to prevent front-running attacks.

6. Private Key Management: Never expose private keys. Use secure key management services and hardware security modules when available.

7. Audit Trails: Maintain comprehensive logs of all sensitive operations to enable forensic analysis if needed.

Recommendation: Always have your code audited by professional security firms before deploying to production.`;
  }

  private generateOptimizationFallback(request: CerebrasRequest): string {
    return `Optimization Strategy for: "${request.prompt.substring(0, 50)}..."

Performance Optimization Guidelines:

1. Gas Optimization:
   - Use calldata instead of memory for read-only function parameters
   - Pack struct variables to save storage slots
   - Use uint256 for arithmetic operations
   - Batch operations when possible
   - Use unchecked blocks when overflow is impossible

2. Storage Optimization:
   - Minimize SSTORE operations
   - Use memory for temporary variables
   - Consider using mappings instead of arrays for lookups
   - Implement caching mechanisms for frequently accessed data

3. Algorithmic Optimization:
   - Choose O(1) over O(n) algorithms where possible
   - Use Merkle trees for batch verification
   - Implement lazy loading for large datasets
   - Consider off-chain computation with on-chain verification

4. Concurrency Optimization:
   - Design for parallel processing where applicable
   - Use async/await patterns for I/O operations
   - Implement connection pooling for database/network access
   - Cache expensive computations

5. Bundle Optimization (Frontend):
   - Code splitting for smaller bundles
   - Lazy loading for non-critical components
   - Tree shaking to remove unused code
   - Image optimization and CDN usage

Monitoring: Always profile your application to identify actual bottlenecks before optimizing.`;
  }

  private generateTestingFallback(request: CerebrasRequest): string {
    return `Testing Strategy for: "${request.prompt.substring(0, 50)}..."

Comprehensive Testing Framework:

1. Unit Testing:
   - Test individual functions in isolation
   - Cover both happy paths and error cases
   - Use mocking for external dependencies
   - Aim for >90% code coverage

2. Integration Testing:
   - Test component interactions
   - Verify data flow between modules
   - Test API endpoints thoroughly
   - Include end-to-end scenarios

3. Property-Based Testing:
   - Test with random inputs
   - Verify invariants and properties
   - Find edge cases automatically
   - Use tools like QuickCheck or Hypothesis

4. Fuzz Testing:
   - Generate random test inputs
   - Test for security vulnerabilities
   - Use specialized fuzzing tools
   - Monitor for crashes and exceptions

5. Load Testing:
   - Simulate high traffic scenarios
   - Test system under stress
   - Identify performance bottlenecks
   - Verify scalability characteristics

6. Security Testing:
   - Perform manual code reviews
   - Use static analysis tools
   - Conduct penetration testing
   - Verify access controls

Best Practices:
- Write tests before code (TDD) when possible
- Keep tests independent and repeatable
- Use descriptive test names
- Maintain test documentation
- Run tests in CI/CD pipeline`;
  }

  private generateGenericFallback(request: CerebrasRequest): string {
    return `Response to: "${request.prompt.substring(0, 50)}..."

This is a template response generated by the fallback system. While the Cerebras AI service is currently unavailable, here are some general guidelines:

1. Understand the Context: Always start by clarifying what specific aspect you're interested in. Different use cases may require different approaches.

2. Research Thoroughly: Consult official documentation, community resources, and best practices before implementing solutions.

3. Start Simple: Begin with a basic implementation and iteratively add complexity as needed. This approach makes debugging easier and helps validate assumptions early.

4. Test Rigorously: Implement comprehensive testing at each stage of development. This includes unit tests, integration tests, and end-to-end tests.

5. Seek Feedback: Don't hesitate to ask questions in community forums or review similar projects for inspiration.

6. Document Your Work: Clear documentation helps others understand your implementation and makes future maintenance easier.

For specific technical assistance, please try again later when the AI service is available, or consult the relevant technical documentation directly.`;
  }

  public async generateMultipleResponses(requests: CerebrasRequest[]): Promise<string[]> {
    cerebrasLogger.info({ count: requests.length }, 'Generating multiple responses');

    const responses = await Promise.all(
      requests.map((request) => this.generateResponse(request))
    );

    cerebrasLogger.info({ count: responses.length }, 'Multiple responses generated');

    return responses;
  }

  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}
