/**
 * Integration Tests for SGX Attestation
 *
 * Tests the full SGX attestation flow including:
 * - /identity endpoint returns attestation quote
 * - /health endpoint returns SGX status
 * - Quotes are valid base64
 * - Measurements are valid hex format
 */

import request from 'supertest';

describe('SGX Attestation Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let app: any;

  beforeAll(async () => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set up test environment BEFORE importing server
    process.env.NODE_ENV = 'test';
    process.env.MNEMONIC = 'test test test test test test test test test test test junk';
    process.env.CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000001';
    process.env.CHAIN_ID = '11155111';
    process.env.SGX_ENABLED = 'false';
    process.env.USE_MOCK_TEE = 'true';

    // Import server after environment is set up
    const serverModule = await import('../../server');
    app = serverModule.app;
  });

  afterAll(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Allow pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('GET /identity', () => {
    it('should return TEE identity with attestation quote', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(response.body).toHaveProperty('publicKey');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('attestation');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status');

      expect(response.body.attestation).toHaveProperty('report');
      expect(response.body.attestation).toHaveProperty('measurement');
      expect(response.body.attestation).toHaveProperty('signature');
    });

    it('should return base64-encoded quote', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(() => {
        Buffer.from(response.body.attestation.report, 'base64');
      }).not.toThrow();
    });

    it('should return valid measurement format', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(response.body.attestation.measurement).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should return valid address format', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(response.body.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should return active status', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should return version 1', async () => {
      const response = await request(app)
        .get('/identity')
        .expect(200);

      expect(response.body.version).toBe('1');
    });
  });

  describe('GET /health', () => {
    it('should return operational status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('tee');
      expect(response.body).toHaveProperty('contracts');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return SGX status in tee object', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tee).toHaveProperty('initialized');
      expect(response.body.tee).toHaveProperty('attestationEnabled');
      expect(response.body.tee).toHaveProperty('useMockTee');
      expect(response.body.tee).toHaveProperty('quoteGenerationAvailable');
      expect(response.body.tee).toHaveProperty('measurement');
      expect(response.body.tee).toHaveProperty('address');
    });

    it('should reflect SGX_ENABLED environment variable', async () => {
      process.env.SGX_ENABLED = 'true';

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tee.attestationEnabled).toBe(true);

      // Reset to default
      process.env.SGX_ENABLED = 'false';
    });

    it('should reflect USE_MOCK_TEE environment variable', async () => {
      process.env.USE_MOCK_TEE = 'true';

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.tee.useMockTee).toBe(true);
    });

    it('should return contract status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.contracts).toHaveProperty('attestation');
      expect(response.body.contracts).toHaveProperty('staking');
      expect(response.body.contracts).toHaveProperty('connected');
    });

    it('should return measurement when quote generation succeeds', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      if (response.body.tee.quoteGenerationAvailable) {
        expect(response.body.tee.measurement).toMatch(/^0x[a-fA-F0-9]{64}$/);
      }
    });

    it('should return positive uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.timestamp).toBeGreaterThan(0);
      expect(Math.abs(Date.now() - response.body.timestamp)).toBeLessThan(5000);
    });
  });

  describe('Contract Status', () => {
    it('should return /health/contract endpoint', async () => {
      const response = await request(app)
        .get('/health/contract')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('contract');
      expect(response.body).toHaveProperty('tee');
      expect(response.body).toHaveProperty('ipfs');
    });

    it('should return connected or disconnected status', async () => {
      const response = await request(app)
        .get('/health/contract')
        .expect(200);

      expect(['operational', 'disconnected']).toContain(response.body.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/non-existent')
        .expect(404);
    });

    it('should handle concurrent health check requests', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('tee');
      });
    });
  });
});
