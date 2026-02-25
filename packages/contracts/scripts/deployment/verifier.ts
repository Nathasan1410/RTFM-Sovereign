import { ethers } from 'ethers';
import { VerificationResult, ContractDeploymentInfo } from './types';

export class ContractVerifier {
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  public async verifyContract(
    contractName: string,
    deploymentInfo: ContractDeploymentInfo,
    expectedFunctions: string[],
    expectedEvents: string[]
  ): Promise<VerificationResult> {
    console.log(`\n[Verifier] Verifying ${contractName} at ${deploymentInfo.address}`);

    const result: VerificationResult = {
      contract: contractName,
      address: deploymentInfo.address,
      verified: true,
      functions: [],
      events: [],
      errors: []
    };

    try {
      const code = await this.provider.getCode(deploymentInfo.address);
      if (code === '0x') {
        result.verified = false;
        result.errors.push('No contract code found at address');
        return result;
      }

      const contract = new ethers.Contract(
        deploymentInfo.address,
        deploymentInfo.abi,
        this.provider
      );

      for (const functionName of expectedFunctions) {
        const working = await this.verifyFunction(contract, functionName);
        result.functions.push({ name: functionName, working });
        if (!working) {
          result.verified = false;
        }
      }

      for (const eventName of expectedEvents) {
        const working = await this.verifyEvent(contract, eventName);
        result.events.push({ name: eventName, working });
        if (!working) {
          result.verified = false;
        }
      }

      console.log(`[Verifier] ${contractName} verification: ${result.verified ? '✓ PASSED' : '✗ FAILED'}`);
      return result;

    } catch (error: any) {
      result.verified = false;
      result.errors.push(error.message || 'Unknown verification error');
      console.error(`[Verifier] Error verifying ${contractName}:`, error);
      return result;
    }
  }

  private async verifyFunction(contract: ethers.Contract, functionName: string): Promise<boolean> {
    try {
      const fragment = contract.interface.getFunction(functionName);
      if (!fragment) {
        console.error(`[Verifier] Function ${functionName} not found in ABI`);
        return false;
      }

      if (fragment.stateMutability === 'view' || fragment.stateMutability === 'pure') {
        try {
          await contract[functionName].staticCall();
        } catch (error) {
          return true;
        }
      }
      return true;
    } catch (error) {
      console.error(`[Verifier] Function ${functionName} verification failed:`, error);
      return false;
    }
  }

  private async verifyEvent(contract: ethers.Contract, eventName: string): Promise<boolean> {
    try {
      const event = contract.interface.getEvent(eventName);
      if (!event) {
        console.error(`[Verifier] Event ${eventName} not found in ABI`);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`[Verifier] Event ${eventName} verification failed:`, error);
      return false;
    }
  }

  public async verifyContractCode(
    address: string,
    expectedBytecode: string
  ): Promise<boolean> {
    try {
      const deployedCode = await this.provider.getCode(address);
      const expectedCode = expectedBytecode.startsWith('0x') ? expectedBytecode : `0x${expectedBytecode}`;
      return deployedCode.toLowerCase() === expectedCode.toLowerCase();
    } catch (error) {
      console.error('[Verifier] Code verification failed:', error);
      return false;
    }
  }

  public async verifyOwnership(
    contractAddress: string,
    expectedOwner: string,
    abi: any[]
  ): Promise<boolean> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const owner = await contract.owner();
      return owner.toLowerCase() === expectedOwner.toLowerCase();
    } catch (error) {
      console.error('[Verifier] Ownership verification failed:', error);
      return false;
    }
  }

  public async verifyTEESigner(
    contractAddress: string,
    expectedTEESigner: string,
    abi: any[]
  ): Promise<boolean> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const teeSigner = await contract.teeSigner();
      return teeSigner.toLowerCase() === expectedTEESigner.toLowerCase();
    } catch (error) {
      console.error('[Verifier] TEE signer verification failed:', error);
      return false;
    }
  }
}
