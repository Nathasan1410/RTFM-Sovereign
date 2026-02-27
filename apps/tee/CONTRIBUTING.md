# Contributing to TEE Service

**Thank you for contributing to the EigenLayer Hackathon project!**

---

## 🎯 How to Contribute

### 1. Report Bugs

- Use GitHub Issues
- Include steps to reproduce
- Add environment details
- Attach logs if relevant

### 2. Suggest Features

- Open GitHub Issue with "enhancement" label
- Describe the use case
- Explain benefits
- Provide examples if possible

### 3. Submit Code

- Fork the repository
- Create feature branch
- Make changes
- Write tests
- Submit pull request

---

## 🛠️ Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/eigenlayer-hackathon.git
cd apps/tee
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Start Development Server

```bash
pnpm run dev
```

---

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style
- Add type definitions
- Use ESLint:
  ```bash
  pnpm run lint
  ```

### Code Organization

- Keep functions small (< 50 lines)
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Group related functionality

### Testing

- Write tests for new features
- Maintain > 80% coverage
- Run tests before committing:
  ```bash
  pnpm test
  ```

---

## 🔄 Pull Request Process

### 1. Create Branch

```bash
git checkout -b feature/amazing-feature
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions

### 2. Make Changes

- Follow coding standards
- Add/update tests
- Update documentation
- Commit frequently

### 3. Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**
```
feat(agents): add roadmap caching

- Implement LRU cache for generated roadmaps
- Add cache invalidation on topic change
- Configure cache size via environment

Closes #123
```

```
fix(api): resolve 400 error on invalid JSON

- Add request validation middleware
- Return 400 for malformed JSON
- Add error handling tests
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Maintenance

### 4. Push and Create PR

```bash
git push origin feature/amazing-feature
```

Then on GitHub:
1. Click "New Pull Request"
2. Select your branch
3. Fill in PR template
4. Request review

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
describe('LLMService', () => {
  it('should initialize with valid providers', () => {
    const service = new LLMService(
      '', // cerebras
      'gsk_test', // groq
      '', // brave
      '', // hyperbolic
      '', // eigen
      '0x...test', // eigenPrivateKey
      'test' // serper
    );
    
    expect(service.hasWebSearch()).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Roadmap Generation', () => {
  it('should generate roadmap for React topic', async () => {
    const response = await request(app)
      .post('/roadmap/generate-dynamic')
      .send({
        topic: 'React Hooks',
        mode: 'deep'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.milestones).toBeDefined();
  });
});
```

### Run Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Specific test file
pnpm test -- LLMService.test.ts

# Watch mode
pnpm test -- --watch
```

---

## 📚 Documentation

### When to Update Docs

- New features
- Changed behavior
- Bug fixes affecting users
- Configuration changes
- API changes

### Documentation Standards

- Use clear, concise language
- Include examples
- Add troubleshooting sections
- Link to related docs
- Keep code snippets up-to-date

### Build Documentation

```bash
# Check markdown links
# (manual for now)

# Preview locally
# Open .md files in browser or markdown editor
```

---

## 🔒 Security Guidelines

### Handling Secrets

- **Never** commit `.env` files
- **Never** commit private keys
- Use environment variables
- Use secrets manager in production

### Security Checklist

Before submitting:
- [ ] No secrets in code
- [ ] No secrets in logs
- [ ] Input validation added
- [ ] Authentication implemented
- [ ] Rate limiting configured

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Email: security@example.com

Include:
- Description of vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

---

## 🎨 Code Style

### TypeScript Style

```typescript
// Use interfaces for object types
interface RoadmapModule {
  order: number;
  title: string;
  context: string;
}

// Use type aliases for unions
type Difficulty = 'easy' | 'medium' | 'hard';

// Use async/await for async code
async function generateRoadmap(topic: string): Promise<RoadmapResponse> {
  const result = await llmService.generateJson(prompt);
  return result;
}

// Use destructuring
const { topic, mode } = request.body;

// Use optional chaining
const apiKey = config?.api?.key;

// Use nullish coalescing
const port = config.port ?? 3000;
```

### Error Handling

```typescript
// Use try/catch for async operations
try {
  const result = await api.call();
  return result;
} catch (error) {
  logger.error({ error }, 'API call failed');
  throw new Error('Operation failed');
}

// Use custom error types
class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
```

### Logging

```typescript
// Use logger service
logger.info({ userId, topic }, 'Roadmap generated');
logger.warn({ retries }, 'API retry');
logger.error({ error, endpoint }, 'Request failed');

// Include context
logger.debug({ 
  prompt, 
  tokens: response.usage 
}, 'LLM request completed');
```

---

## 📦 Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─ Bug fixes (backwards compatible)
  │     └─────── New features (backwards compatible)
  └───────────── Breaking changes
```

### Release Steps

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push to GitHub
5. Create GitHub release
6. Deploy to production

---

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- GitHub release notes
- Project website (if applicable)

---

## ❓ Questions?

- **General questions:** GitHub Discussions
- **Bug reports:** GitHub Issues
- **Security issues:** security@example.com
- **Chat:** Discord #tee-service

---

**Thank you for contributing! 🎉**
