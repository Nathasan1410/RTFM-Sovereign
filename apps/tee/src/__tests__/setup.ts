/**
 * Jest Setup File
 *
 * Mocks problematic modules that use ES modules
 * which ts-jest has trouble transforming
 */

// Mock p-map
jest.mock('p-map', () => ({
  default: jest.fn(async (items, mapper) => {
    return Promise.all(items.map(mapper));
  })
}));

// Mock openai
jest.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }]
        })
      }
    };
  }
}));

// Mock @cerebras
jest.mock('@cerebras/cerebras_cloud_sdk', () => ({
  CerebrasCloud: class MockCerebras {
    chat = {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }]
        })
      }
    };
  }
}));
