import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CertificateData {
  skillName: string;
  holderAddress: string;
  score: number;
  timestamp: number;
  transactionHash: string;
  ipfsHash: string;
  verifyUrl: string;
}

export async function generateCertificate(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 20;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'F');

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#FFD700';
    if (score >= 70) return '#4CAF50';
    return '#FF5722';
  };

  const scoreColor = getScoreColor(data.score);

  doc.setFontSize(32);
  doc.setTextColor(15, 23, 42);
  doc.text('RTFM-Sovereign Skill Credential', pageWidth / 2, 40, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);

  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  doc.text(data.skillName, pageWidth / 2, 70, { align: 'center', maxWidth: 150 });

  const truncatedAddress = `${data.holderAddress.substring(0, 8)}...${data.holderAddress.substring(data.holderAddress.length - 6)}`;
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(`Holder: ${truncatedAddress}`, pageWidth / 2, 95, { align: 'center' });

  doc.setFontSize(48);
  doc.setTextColor(scoreColor);
  doc.text(`${data.score}/100`, pageWidth / 2, 115, { align: 'center' });

  doc.setDrawColor(scoreColor);
  doc.setFillColor(scoreColor);
  doc.circle(pageWidth / 2, 145, 15, 'FD');

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const date = new Date(data.timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Verified on: ${date}`, pageWidth / 2, 175, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Transaction: ${data.transactionHash || 'N/A'}`, pageWidth / 2, 190, { align: 'center', maxWidth: 200 });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const shortIpfs = data.ipfsHash.substring(0, 16) + '...';
  doc.text(`IPFS: ${shortIpfs}`, pageWidth / 2, 200, { align: 'center' });

  try {
    const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: 'M'
    });

    doc.addImage(qrDataUrl, pageWidth - margin - 35, pageHeight - margin - 35, 30, 30);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Scan to verify', pageWidth - margin - 20, pageHeight - margin + 5, { align: 'center' });
  } catch (error) {
    console.error('[PDF] QR code generation failed:', error);
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This credential is cryptographically signed and permanently stored on IPFS & Blockchain.',
    pageWidth / 2,
    pageHeight - margin - 10,
    { align: 'center', maxWidth: 180 }
  );

  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
