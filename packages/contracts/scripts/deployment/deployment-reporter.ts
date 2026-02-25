import { DeploymentReport, DeploymentState, VerificationResult, TestResult } from './types';
import fs from 'fs';
import path from 'path';

export class DeploymentReporter {
  private reportsDir: string;

  constructor(reportsDir: string = './deployment-reports') {
    this.reportsDir = reportsDir;
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  public generateReport(state: DeploymentState, verificationResults: VerificationResult[], testResults: TestResult[]): DeploymentReport {
    const report: DeploymentReport = {
      summary: {
        startTime: new Date(state.startTime).toISOString(),
        endTime: state.endTime ? new Date(state.endTime).toISOString() : 'N/A',
        duration: state.totalDuration ? `${(state.totalDuration / 1000).toFixed(2)}s` : 'In progress',
        network: state.network,
        deployer: state.deployerAddress,
        success: state.success
      },
      chunks: state.chunks,
      contracts: state.contracts,
      gasUsage: this.calculateGasUsage(state),
      verification: verificationResults,
      tests: testResults,
      errors: this.collectErrors(state, verificationResults, testResults)
    };

    return report;
  }

  public async saveReport(report: DeploymentReport, filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = filename || `deployment-report-${report.summary.network}-${timestamp}.md`;
    const reportPath = path.join(this.reportsDir, reportFilename);

    const markdown = this.formatAsMarkdown(report);
    fs.writeFileSync(reportPath, markdown);

    const jsonPath = reportPath.replace('.md', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    console.log(`\n[Reporter] Report saved to: ${reportPath}`);
    console.log(`[Reporter] JSON report saved to: ${jsonPath}`);

    return reportPath;
  }

  private formatAsMarkdown(report: DeploymentReport): string {
    const lines: string[] = [];

    lines.push('# Smart Contract Deployment Report');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Network:** ${report.summary.network}`);
    lines.push(`**Deployer:** ${report.summary.deployer}`);
    lines.push(`**Status:** ${report.summary.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    lines.push(`**Duration:** ${report.summary.duration}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|--------|`);
    lines.push(`| Start Time | ${report.summary.startTime} |`);
    lines.push(`| End Time | ${report.summary.endTime} |`);
    lines.push(`| Network | ${report.summary.network} |`);
    lines.push(`| Deployer | \`${report.summary.deployer}\` |`);
    lines.push(`| Status | ${report.summary.success ? '✅ Success' : '❌ Failed'} |`);
    lines.push('');

    lines.push('## Deployed Contracts');
    lines.push('');

    if (report.contracts.attestation) {
      lines.push('### SkillAttestation');
      lines.push('');
      lines.push(`- **Address:** \`${report.contracts.attestation.address}\``);
      lines.push(`- **Transaction Hash:** \`${report.contracts.attestation.transactionHash}\``);
      lines.push(`- **Deployed At:** ${new Date(report.contracts.attestation.deployedAt).toISOString()}`);
      if (report.contracts.attestation.constructorArgs) {
        lines.push(`- **Constructor Args:** \`${JSON.stringify(report.contracts.attestation.constructorArgs)}\``);
      }
      lines.push('');
    }

    if (report.contracts.staking) {
      lines.push('### SkillStaking');
      lines.push('');
      lines.push(`- **Address:** \`${report.contracts.staking.address}\``);
      lines.push(`- **Transaction Hash:** \`${report.contracts.staking.transactionHash}\``);
      lines.push(`- **Deployed At:** ${new Date(report.contracts.staking.deployedAt).toISOString()}`);
      if (report.contracts.staking.constructorArgs) {
        lines.push(`- **Constructor Args:** \`${JSON.stringify(report.contracts.staking.constructorArgs)}\``);
      }
      lines.push('');
    }

    lines.push('## Gas Usage');
    lines.push('');
    lines.push(`| Contract | Gas Used |`);
    lines.push(`|----------|-----------|`);

    if (report.gasUsage.attestation) {
      lines.push(`| Attestation | ${report.gasUsage.attestation.toLocaleString()} |`);
    }
    if (report.gasUsage.staking) {
      lines.push(`| Staking | ${report.gasUsage.staking.toLocaleString()} |`);
    }
    if (report.gasUsage.total) {
      lines.push(`| **Total** | **${report.gasUsage.total.toLocaleString()}** |`);
    }
    if (report.gasUsage.cost) {
      lines.push(`| **Estimated Cost** | **${report.gasUsage.cost}** |`);
    }
    lines.push('');

    lines.push('## Chunk Execution Status');
    lines.push('');
    lines.push(`| Chunk | Status | Duration | Retries | Gas Used |`);
    lines.push(`|-------|--------|----------|----------|-----------|`);

    for (const chunk of report.chunks) {
      const statusEmoji = this.getStatusEmoji(chunk.status);
      const duration = chunk.duration ? `${(chunk.duration / 1000).toFixed(2)}s` : '-';
      const gas = chunk.gasUsed ? chunk.gasUsed.toLocaleString() : '-';
      lines.push(`| ${chunk.id} - ${chunk.name} | ${statusEmoji} ${chunk.status} | ${duration} | ${chunk.retryCount}/${chunk.maxRetries} | ${gas} |`);
    }
    lines.push('');

    if (report.verification.length > 0) {
      lines.push('## Contract Verification Results');
      lines.push('');
      lines.push(`| Contract | Address | Verified | Functions | Events |`);
      lines.push(`|----------|---------|----------|-----------|--------|`);

      for (const result of report.verification) {
        const status = result.verified ? '✅ Yes' : '❌ No';
        const workingFunctions = result.functions.filter(f => f.working).length;
        const workingEvents = result.events.filter(e => e.working).length;
        lines.push(`| ${result.contract} | \`${result.address}\` | ${status} | ${workingFunctions}/${result.functions.length} | ${workingEvents}/${result.events.length} |`);

        if (result.errors.length > 0) {
          lines.push(`<details><summary>Errors (${result.errors.length})</summary>`);
          for (const error of result.errors) {
            lines.push(`- ${error}`);
          }
          lines.push(`</details>`);
        }
      }
      lines.push('');
    }

    if (report.tests.length > 0) {
      lines.push('## Contract Test Results');
      lines.push('');
      lines.push(`| Contract | Function | Passed | Transaction Hash |`);
      lines.push(`|----------|----------|--------|----------------|`);

      for (const test of report.tests) {
        const status = test.passed ? '✅' : '❌';
        const txHash = test.transactionHash ? `\`${test.transactionHash}\`` : '-';
        lines.push(`| ${test.contract} | ${test.function} | ${status} | ${txHash} |`);

        if (test.error) {
          lines.push(`<details><summary>Error</summary>`);
          lines.push(`\`\`\``);
          lines.push(test.error);
          lines.push(`\`\`\``);
          lines.push(`</details>`);
        }
      }
      lines.push('');
    }

    if (report.errors.length > 0) {
      lines.push('## Errors Encountered');
      lines.push('');
      for (const error of report.errors) {
        lines.push(`- ❌ ${error}`);
      }
      lines.push('');
    }

    lines.push('## Next Steps');
    lines.push('');
    if (report.summary.success) {
      lines.push('1. ✅ Deployment completed successfully');
      lines.push('2. Update environment variables in `.env` files');
      lines.push('3. Update TEE server configuration');
      lines.push('4. Verify contracts on block explorer (if auto-verify not used)');
      lines.push('5. Run integration tests');
    } else {
      lines.push('1. ❌ Deployment failed');
      lines.push('2. Review errors above');
      lines.push('3. Fix issues and retry deployment');
      lines.push('4. Check deployment logs for details');
    }
    lines.push('');

    lines.push('## Environment Configuration');
    lines.push('');
    lines.push('Add these variables to your `.env` file:');
    lines.push('');
    lines.push('```bash');
    lines.push('# TEE Server Configuration');
    if (report.contracts.attestation) {
      lines.push(`CONTRACT_ATTESTATION=${report.contracts.attestation.address}`);
    }
    if (report.contracts.staking) {
      lines.push(`CONTRACT_STAKING=${report.contracts.staking.address}`);
    }
    lines.push('');
    lines.push('# Web App Configuration');
    lines.push(`NEXT_PUBLIC_CHAIN_ID=${report.summary.network === 'sepolia' ? '11155111' : '1'}`);
    if (report.contracts.attestation) {
      lines.push(`NEXT_PUBLIC_ATTESTATION_CONTRACT=${report.contracts.attestation.address}`);
    }
    if (report.contracts.staking) {
      lines.push(`NEXT_PUBLIC_STAKING_CONTRACT=${report.contracts.staking.address}`);
    }
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'in_progress':
        return '🔄';
      case 'skipped':
        return '⏭️';
      default:
        return '⏳';
    }
  }

  private calculateGasUsage(state: DeploymentState) {
    const usage: any = {};

    for (const chunk of state.chunks) {
      if (chunk.id === 3 && chunk.gasUsed) {
        usage.attestation = chunk.gasUsed;
      }
      if (chunk.id === 5 && chunk.gasUsed) {
        usage.staking = chunk.gasUsed;
      }
    }

    if (usage.attestation && usage.staking) {
      usage.total = usage.attestation + usage.staking;
      usage.cost = '~0.001 ETH';
    }

    return usage;
  }

  private collectErrors(state: DeploymentState, verificationResults: VerificationResult[], testResults: TestResult[]): string[] {
    const errors: string[] = [];

    for (const chunk of state.chunks) {
      if (chunk.status === 'failed' && chunk.error) {
        errors.push(`Chunk ${chunk.id} (${chunk.name}): ${chunk.error}`);
      }
    }

    for (const verification of verificationResults) {
      for (const error of verification.errors) {
        errors.push(`Verification (${verification.contract}): ${error}`);
      }
    }

    for (const test of testResults) {
      if (!test.passed && test.error) {
        errors.push(`Test (${test.contract}.${test.function}): ${test.error}`);
      }
    }

    return errors;
  }
}
