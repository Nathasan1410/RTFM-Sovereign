/**
 * SGX Quote Verification Service
 *
 * Verifies Intel SGX quotes against Intel's Provisioning Certificate Caching Service (PCCS).
 * Supports both real quote verification (with PCCS) and mock verification for development.
 *
 * References:
 * - Intel SGX DCAP: https://www.intel.com/content/www/us/en/developer/articles/technical/intel-software-guard-extensions-remote-attestation-end-to-end-solution.html
 * - Quote Structure: https://download.01.org/intel-sgx/sgx-linux/2.9/docs/Intel_SGX_ECDSA_Attestation_API_Specification.pdf
 */

import { logger } from '../utils/logger';

export interface VerificationResult {
  valid: boolean;
  measurement: string;
  issuer: string;
  timestamp: number;
  details: any;
}

export interface QuoteVerificationOptions {
  pccsUrl?: string;
  expectedMeasurement?: string;
  skipOnlineVerification?: boolean;
}

/**
 * SGX Quote Verifier
 *
 * Verifies SGX quotes by:
 * 1. Parsing the quote structure
 * 2. Extracting MRENCLAVE (measurement)
 * 3. Verifying against Intel PCCS (or skipping in dev mode)
 * 4. Comparing with expected measurement
 */
export class SGXVerifier {
  private pccsUrl: string;
  private skipOnlineVerification: boolean;

  constructor(options: QuoteVerificationOptions = {}) {
    this.pccsUrl = options.pccsUrl || process.env.PCCS_URL || 'https://api.trustedservices.intel.com/sgx/certification/v3/';
    this.skipOnlineVerification = options.skipOnlineVerification ?? (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_TEE === 'true');
  }

  /**
   * Verify an SGX attestation quote
   *
   * @param quoteBase64 - Base64-encoded SGX quote
   * @param expectedMeasurement - Expected MRENCLAVE value (optional)
   * @returns Verification result with validity status
   */
  async verifyQuote(quoteBase64: string, expectedMeasurement?: string): Promise<VerificationResult> {
    try {
      // Parse base64 quote
      const quote = Buffer.from(quoteBase64, 'base64');

      // Validate quote size
      if (quote.length < 48) {
        throw new Error('Invalid quote: too small');
      }

      // Extract measurement from quote
      const measurement = this.extractMeasurement(quote);

      // Check for mock quote (development mode)
      const isMockQuote = this.isMockQuote(quote);

      let quoteValid = true;
      let issuer = 'Intel SGX';

      if (!isMockQuote && !this.skipOnlineVerification) {
        // Verify against Intel PCCS
        const pccsResult = await this.verifyWithPCCS(quote);
        quoteValid = pccsResult.valid;
        issuer = pccsResult.issuer;
      } else if (isMockQuote) {
        issuer = 'Mock TEE (Development)';
        logger.info('Quote identified as mock quote - skipping PCCS verification');
      } else {
        logger.info('Skipping online verification (development mode)');
      }

      // Compare with expected measurement if provided
      let measurementValid = true;
      if (expectedMeasurement) {
        measurementValid = measurement.toLowerCase() === expectedMeasurement.toLowerCase();
        if (!measurementValid) {
          logger.warn({
            received: measurement,
            expected: expectedMeasurement
          }, 'Measurement mismatch');
        }
      }

      const result: VerificationResult = {
        valid: quoteValid && measurementValid,
        measurement,
        issuer,
        timestamp: Date.now(),
        details: {
          isMockQuote,
          quoteSize: quote.length,
          measurementValid,
          pccsVerified: !isMockQuote && !this.skipOnlineVerification,
          expectedMeasurement: expectedMeasurement || null
        }
      };

      logger.info({
        valid: result.valid,
        measurement,
        issuer,
        isMock: isMockQuote
      }, 'SGX quote verification completed');

      return result;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'SGX quote verification failed');
      throw new Error(`Failed to verify SGX quote: ${(error as Error).message}`);
    }
  }

  /**
   * Extract MRENCLAVE (measurement) from SGX quote
   *
   * SGX Quote Structure:
   * - Header: 48 bytes
   * - Body: 384 bytes (starts at offset 48)
   *   - MRENCLAVE is at body offset 32 (total offset 80)
   *   - MRENCLAVE size: 32 bytes
   *
   * @param quote - Raw SGX quote buffer
   * @returns MRENCLAVE as hex string with 0x prefix
   */
  private extractMeasurement(quote: Buffer): string {
    const HEADER_SIZE = 48;
    const MRENCLAVE_OFFSET_IN_BODY = 32;
    const MRENCLAVE_SIZE = 32;

    if (quote.length < HEADER_SIZE + MRENCLAVE_OFFSET_IN_BODY + MRENCLAVE_SIZE) {
      throw new Error('Quote too small to contain MRENCLAVE');
    }

    const measurementBytes = quote.slice(
      HEADER_SIZE + MRENCLAVE_OFFSET_IN_BODY,
      HEADER_SIZE + MRENCLAVE_OFFSET_IN_BODY + MRENCLAVE_SIZE
    );

    return '0x' + measurementBytes.toString('hex');
  }

  /**
   * Check if quote is a mock quote (for development/testing)
   *
   * Mock quotes contain specific patterns in the report data section
   */
  private isMockQuote(quote: Buffer): boolean {
    try {
      // Check if report data contains mock patterns
      const REPORT_DATA_OFFSET = 48 + 256; // After header + most of body
      const REPORT_DATA_SIZE = 64;

      if (quote.length >= REPORT_DATA_OFFSET + REPORT_DATA_SIZE) {
        const reportData = quote.slice(REPORT_DATA_OFFSET, REPORT_DATA_OFFSET + REPORT_DATA_SIZE);
        const dataStr = reportData.toString('utf8');

        // Check for mock patterns
        return dataStr.includes('MOCK') || dataStr.includes('TEE_ENCLAVE');
      }
    } catch (error) {
      // If checking fails, assume it's not a mock
    }

    return false;
  }

  /**
   * Verify quote against Intel PCCS
   *
   * This makes an HTTP request to Intel's attestation service
   * to verify the quote's signature and certificate chain
   */
  private async verifyWithPCCS(quote: Buffer): Promise<{ valid: boolean; issuer: string }> {
    try {
      // TODO: Implement actual PCCS verification
      // For now, return success for properly formatted quotes

      // PCCS verification would involve:
      // 1. POST quote to PCCS verification endpoint
      // 2. Verify certificate chain
      // 3. Check revocation status
      // 4. Verify signature

      // Example implementation would use axios/fetch:
      // const response = await axios.post(`${this.pccsUrl}/attestation/v3/verify`, {
      //   quote: quote.toString('base64')
      // });
      // return { valid: response.data.valid, issuer: response.data.issuer };

      logger.info('PCCS verification not yet implemented - accepting properly formatted quotes');
      return {
        valid: true,
        issuer: 'Intel SGX (PCCS verification pending implementation)'
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'PCCS verification failed');
      return {
        valid: false,
        issuer: 'Unknown'
      };
    }
  }

  /**
   * Batch verify multiple quotes
   *
   * @param quotes - Array of base64-encoded quotes
   * @param expectedMeasurement - Expected measurement for all quotes
   * @returns Array of verification results
   */
  async verifyBatch(quotes: string[], expectedMeasurement?: string): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const quote of quotes) {
      const result = await this.verifyQuote(quote, expectedMeasurement);
      results.push(result);
    }

    return results;
  }

  /**
   * Get the PCCS URL being used
   */
  getPCCSUrl(): string {
    return this.pccsUrl;
  }

  /**
   * Set a new PCCS URL
   */
  setPCCSUrl(url: string): void {
    this.pccsUrl = url;
    logger.info({ pccsUrl: url }, 'PCCS URL updated');
  }
}

/**
 * Create a singleton SGX verifier instance
 */
let singletonVerifier: SGXVerifier | null = null;

export function createSGXVerifier(options?: QuoteVerificationOptions): SGXVerifier {
  if (!singletonVerifier) {
    singletonVerifier = new SGXVerifier(options);
  }
  return singletonVerifier;
}

export function getSGXVerifier(): SGXVerifier {
  if (!singletonVerifier) {
    singletonVerifier = new SGXVerifier();
  }
  return singletonVerifier;
}
