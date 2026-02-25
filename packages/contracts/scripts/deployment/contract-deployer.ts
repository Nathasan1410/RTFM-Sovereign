import { ethers } from 'ethers';
import { ContractDeploymentInfo, NetworkConfig } from './types';

export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig, privateKey: string) {
    this.networkConfig = networkConfig;
    this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  public getWalletAddress(): string {
    return this.wallet.address;
  }

  public async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  public async deployContract(
    contractName: string,
    bytecode: string,
    abi: any[],
    constructorArgs: any[] = []
  ): Promise<ContractDeploymentInfo> {
    console.log(`\n[${contractName}] Deploying contract...`);
    console.log(`[${contractName}] Deployer: ${this.wallet.address}`);
    console.log(`[${contractName}] Network: ${this.networkConfig.name} (${this.networkConfig.chainId})`);

    const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`[${contractName}] Transaction submitted: ${contract.deploymentTransaction()?.hash}`);
    
    const receipt = await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`[${contractName}] Deployed to: ${address}`);
    console.log(`[${contractName}] Block: ${receipt.blockNumber}`);
    console.log(`[${contractName}] Gas used: ${receipt.gasUsed.toString()}`);

    const deploymentInfo: ContractDeploymentInfo = {
      address,
      abi,
      transactionHash: receipt.hash,
      deployedAt: Date.now(),
      constructorArgs,
      bytecode
    };

    return deploymentInfo;
  }

  public async estimateDeploymentGas(
    bytecode: string,
    abi: any[],
    constructorArgs: any[] = []
  ): Promise<{ gasEstimate: bigint; estimatedCost: string }> {
    const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
    
    const deployTransaction = await factory.getDeployTransaction(...constructorArgs);
    const gasEstimate = await this.provider.estimateGas(deployTransaction);
    
    const gasPrice = this.networkConfig.gasPrice 
      ? ethers.parseUnits(this.networkConfig.gasPrice, 'gwei')
      : await this.provider.getFeeData();
    
    const estimatedCost = gasEstimate * (gasPrice.gasPrice || gasPrice.maxFeePerGas || 0n);
    
    return {
      gasEstimate,
      estimatedCost: ethers.formatEther(estimatedCost)
    };
  }

  public async verifyContractDeployment(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error(`[Verification] Failed to verify contract at ${address}:`, error);
      return false;
    }
  }

  public async getNetworkInfo(): Promise<{ chainId: number; blockNumber: bigint }> {
    const chainId = (await this.provider.getNetwork()).chainId;
    const blockNumber = await this.provider.getBlockNumber();
    return { chainId: Number(chainId), blockNumber };
  }
}
