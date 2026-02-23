import axios from 'axios';
import { IPFSService, IPFSCredentials, IPFSSnapshot, createIPFSService } from '../../services/ipfs';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should return null when retrieval fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await ipfsService.retrieveSnapshot('QmTestHash123');

      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const result = await ipfsService.retrieveSnapshot('QmTestHash123');

      expect(result).toBeNull();
    });
  });

  describe('uploadSingleFile', () => {
    it('should upload single file to IPFS', async () => {
      const content = 'function test() { return "hello"; }';
      const filename = 'test.sol';

      mockedAxios.post.mockResolvedValue({
        data: { IpfsHash: 'QmFileHash789' }
      });

      const ipfsHash = await ipfsService.uploadSingleFile(content, filename);

      expect(ipfsHash).toBe('QmFileHash789');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'pinata_api_key': 'test-api-key',
            'pinata_secret_api_key': 'test-secret-key'
          }),
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        })
      );
    });

    it('should throw error when file upload fails', async () => {
      const content = 'test content';
      const filename = 'test.txt';

      mockedAxios.post.mockRejectedValue(new Error('Upload failed'));

      await expect(ipfsService.uploadSingleFile(content, filename)).rejects.toThrow('Failed to upload file to IPFS');
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
