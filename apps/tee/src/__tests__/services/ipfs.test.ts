import axios from 'axios';
import { gzip as zlibGzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { IPFSService, IPFSCredentials, IPFSSnapshot, createIPFSService } from '../../services/ipfs';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

const gzip = promisify(zlibGzip);

describe('IPFSService', () => {
  let ipfsService: IPFSService;
  let mockCredentials: IPFSCredentials;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCredentials = {
      apiKey: 'test-api-key',
      secretApiKey: 'test-secret-key'
    };
    ipfsService = new IPFSService(mockCredentials);
  });

  describe('uploadCodeSnapshot', () => {
    it('should upload snapshot and return IPFS hash', async () => {
      const mockSnapshot: IPFSSnapshot = {
        project: 'test-project',
        user: '0x1234567890123456789012345678901234567890',
        milestones: [
          {
            id: 1,
            code: 'function test() {}',
            score: 85,
            feedback: 'Good work',
            timestamp: Date.now()
          }
        ],
        final_score: 85,
        attestation_tx: null
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          IpfsHash: 'QmTestHash123',
          PinSize: 1234,
          Timestamp: Date.now()
        }
      });

      const ipfsHash = await ipfsService.uploadCodeSnapshot(mockSnapshot);

      expect(ipfsHash).toBe('QmTestHash123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        expect.objectContaining({
          pinataContent: mockSnapshot,
          pinataMetadata: expect.objectContaining({
            name: expect.stringContaining('test-project'),
            keyvalues: expect.objectContaining({
              project: 'test-project',
              user: '0x1234567890123456789012345678901234567890',
              finalScore: '85'
            })
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'pinata_api_key': 'test-api-key',
            'pinata_secret_api_key': 'test-secret-key'
          })
        })
      );
    });

    it('should use JWT authentication when provided', async () => {
      const mockSnapshot: IPFSSnapshot = {
        project: 'test-project',
        user: '0x1234567890123456789012345678901234567890',
        milestones: [],
        final_score: 0,
        attestation_tx: null
      };

      const serviceWithJWT = new IPFSService({
        ...mockCredentials,
        jwt: 'test-jwt-token'
      });

      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmTestHash456' }
      });

      await serviceWithJWT.uploadCodeSnapshot(mockSnapshot);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-jwt-token'
          })
        })
      );
    });

    it('should throw error when upload fails', async () => {
      const mockSnapshot: IPFSSnapshot = {
        project: 'test-project',
        user: '0x1234567890123456789012345678901234567890',
        milestones: [],
        final_score: 0,
        attestation_tx: null
      };

      const mockError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(mockError);

      await expect(ipfsService.uploadCodeSnapshot(mockSnapshot)).rejects.toThrow('Failed to upload to IPFS');
    });

    it('should handle Axios error with response data', async () => {
      const mockSnapshot: IPFSSnapshot = {
        project: 'test-project',
        user: '0x1234567890123456789012345678901234567890',
        milestones: [],
        final_score: 0,
        attestation_tx: null
      };

      const axiosError = {
        isAxiosError: true,
        response: {
          data: { error: 'Invalid API key' }
        }
      } as any;
      mockedAxios.post.mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(ipfsService.uploadCodeSnapshot(mockSnapshot)).rejects.toThrow();
    });
  });

  describe('uploadJSON', () => {
    it('should upload JSON data with verification', async () => {
      const mockData = { test: 'data', milestone: 3 };
      
      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmJSONHash123', PinSize: 512, Timestamp: Date.now() }
      });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const hash = await ipfsService.uploadJSON(mockData, 'test.json');

      expect(hash).toBe('QmJSONHash123');
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(mockedAxios.head).toHaveBeenCalledWith(
        'https://gateway.pinata.cloud/ipfs/QmJSONHash123',
        expect.anything()
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      const mockData = { test: 'data' };
      
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({
          data: { IpfsHash: 'QmRetryHash', PinSize: 256, Timestamp: Date.now() }
        });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const hash = await ipfsService.uploadJSON(mockData);

      expect(hash).toBe('QmRetryHash');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const mockData = { test: 'data' };
      
      mockedAxios.post.mockRejectedValue(new Error('Persistent failure'));

      await expect(ipfsService.uploadJSON(mockData)).rejects.toThrow('Max retries exceeded');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('uploadFile', () => {
    it('should upload file content with verification', async () => {
      const content = 'contract Test {}';
      const filename = 'Test.sol';
      
      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmFileHash', PinSize: 128, Timestamp: Date.now() }
      });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const hash = await ipfsService.uploadFile(content, filename);

      expect(hash).toBe('QmFileHash');
    });

    it('should retry on file upload failure', async () => {
      const content = 'test content';
      
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValue({
          data: { IpfsHash: 'QmRetryFileHash', PinSize: 64, Timestamp: Date.now() }
        });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const hash = await ipfsService.uploadFile(content, 'test.txt');

      expect(hash).toBe('QmRetryFileHash');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadCompressed', () => {
    it('should upload compressed data', async () => {
      const largeData = { data: 'x'.repeat(1000000) };
      
      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmCompressedHash', PinSize: 50000, Timestamp: Date.now() }
      });

      const hash = await ipfsService.uploadCompressed(largeData, 'large.json');

      expect(hash).toBe('QmCompressedHash');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pinataMetadata: expect.objectContaining({
            name: 'large.json.gz',
            keyvalues: expect.objectContaining({
              compressed: true
            })
          })
        }),
        expect.anything()
      );
    });
  });

  describe('downloadAndDecompress', () => {
    it('should decompress compressed data', async () => {
      const testData = { test: 'value', nested: { key: 'data' } };
      const compressed = await gzip(Buffer.from(JSON.stringify(testData)));
      const compressedContent = compressed.toString('base64');
      
      const compressedData = {
        content: compressedContent,
        compressed: true
      };

      mockedAxios.get.mockResolvedValue({ data: compressedData });

      const result = await ipfsService.downloadAndDecompress('QmCompressedHash');

      expect(result).toEqual(testData);
    });

    it('should return data as-is if not compressed', async () => {
      const uncompressedData = { test: 'value', compressed: false };
      
      mockedAxios.get.mockResolvedValue({ data: uncompressedData });

      const result = await ipfsService.downloadAndDecompress('QmHash');

      expect(result).toEqual(uncompressedData);
    });
  });

  describe('getFile', () => {
    it('should retrieve file from IPFS', async () => {
      const mockData = { content: 'test' };
      
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await ipfsService.getFile('QmTestHash');

      expect(result).toEqual(mockData);
    });

    it('should throw on 404', async () => {
      mockedAxios.get.mockResolvedValue({ status: 404 });

      await expect(ipfsService.getFile('QmInvalidHash')).rejects.toThrow('IPFS hash not found');
    });
  });

  describe('verifyUpload', () => {
    it('should return true for valid hash', async () => {
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const result = await ipfsService.verifyUpload('QmValidHash');

      expect(result).toBe(true);
    });

    it('should return false for invalid hash', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Not found'));

      const result = await ipfsService.verifyUpload('QmInvalidHash');

      expect(result).toBe(false);
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple files', async () => {
      const files = [
        { path: 'file1.sol', content: 'contract A {}' },
        { path: 'file2.sol', content: 'contract B {}' }
      ];

      mockedAxios.post
        .mockResolvedValueOnce({ data: { IpfsHash: 'QmHash1', PinSize: 100, Timestamp: Date.now() } })
        .mockResolvedValueOnce({ data: { IpfsHash: 'QmHash2', PinSize: 100, Timestamp: Date.now() } });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const result = await ipfsService.uploadBatch(files);

      expect(result.ipfsHashes).toHaveLength(2);
      expect(result.ipfsHashes).toEqual(['QmHash1', 'QmHash2']);
      expect(result.totalSize).toBe(26);
    });

    it('should fail if any file upload fails', async () => {
      const files = [
        { path: 'file1.sol', content: 'contract A {}' },
        { path: 'file2.sol', content: 'contract B {}' }
      ];

      mockedAxios.post
        .mockResolvedValue({ data: { IpfsHash: 'QmHash1' } })
        .mockRejectedValue(new Error('Upload failed'));

      await expect(ipfsService.uploadBatch(files)).rejects.toThrow('Max retries exceeded');
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA256 checksum', () => {
      const content = 'test content';
      const checksum = ipfsService.calculateChecksum(content);

      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent checksums', () => {
      const content = 'test content';
      const checksum1 = ipfsService.calculateChecksum(content);
      const checksum2 = ipfsService.calculateChecksum(content);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate file hash', () => {
      const content = 'contract Test {}';
      const hash = ipfsService.calculateFileHash(content);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('getGatewayUrl', () => {
    it('should return correct gateway URL for hash', () => {
      const url = IPFSService.getGatewayUrl('QmTestHash123');
      expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmTestHash123');
    });

    it('should handle different hash formats', () => {
      const hash1 = 'QmXxx';
      const hash2 = 'bafybeixxx';

      expect(IPFSService.getGatewayUrl(hash1)).toBe('https://gateway.pinata.cloud/ipfs/QmXxx');
      expect(IPFSService.getGatewayUrl(hash2)).toBe('https://gateway.pinata.cloud/ipfs/bafybeixxx');
    });
  });

  describe('getAlternativeGatewayUrls', () => {
    it('should return multiple gateway URLs', () => {
      const urls = IPFSService.getAlternativeGatewayUrls('QmTestHash');

      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://ipfs.io/ipfs/QmTestHash');
      expect(urls).toContain('https://cloudflare-ipfs.com/ipfs/QmTestHash');
      expect(urls).toContain('https://dweb.link/ipfs/QmTestHash');
    });
  });

  describe('retrieveSnapshot', () => {
    it('should retrieve snapshot from IPFS gateway', async () => {
      const mockSnapshot: IPFSSnapshot = {
        project: 'test-project',
        user: '0x1234567890123456789012345678901234567890',
        milestones: [],
        final_score: 85,
        attestation_tx: '0xtx123'
      };

      mockedAxios.get.mockResolvedValue({
        data: mockSnapshot
      });

      const result = await ipfsService.retrieveSnapshot('QmTestHash123');

      expect(result).toEqual(mockSnapshot);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://gateway.pinata.cloud/ipfs/QmTestHash123',
        expect.objectContaining({ timeout: 15000 })
      );
    });

    it('should return null when retrieval fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await ipfsService.retrieveSnapshot('QmTestHash123');

      expect(result).toBeNull();
    });
  });

  describe('uploadFile', () => {
    it('should upload file content', async () => {
      const content = 'function test() { return "hello"; }';
      const filename = 'test.sol';

      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmFileHash789' }
      });
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const ipfsHash = await ipfsService.uploadFile(content, filename);

      expect(ipfsHash).toBe('QmFileHash789');
    });

    it('should throw error when file upload fails', async () => {
      const content = 'test content';
      const filename = 'test.txt';

      mockedAxios.post.mockRejectedValue(new Error('Upload failed'));

      await expect(ipfsService.uploadFile(content, filename)).rejects.toThrow('Max retries exceeded');
    });
  });

  describe('createIPFSService', () => {
    it('should create IPFSService instance', async () => {
      const service = await createIPFSService(mockCredentials);
      expect(service).toBeInstanceOf(IPFSService);
    });

    it('should pass credentials to constructor', async () => {
      const customCredentials: IPFSCredentials = {
        apiKey: 'custom-api-key',
        secretApiKey: 'custom-secret-key',
        jwt: 'custom-jwt'
      };

      const service = await createIPFSService(customCredentials);
      expect(service).toBeInstanceOf(IPFSService);
    });
  });
});
