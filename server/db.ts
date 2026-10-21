import type { StoredUser } from './auth.ts';
import { hashPassword } from './auth.ts';
import type {
  User,
  VaultDocument,
  DocumentPermissionGrant,
  CertificateCategory,
  VerificationStatus,
} from '../src/types/index.ts';

// Central in-memory database store
export const users = new Map<string, StoredUser>();
export const usernameIndex = new Map<string, string>(); // normalized username -> userId

export const documents = new Map<string, VaultDocument>();
export const permissions = new Map<string, DocumentPermissionGrant>();
export const fileStore = new Map<string, { buffer: Buffer; mimeType: string; originalName: string }>();

export const customCategories = new Set<string>([
  'GOVERNMENT',
  'EDUCATIONAL',
  'PROFESSIONAL',
  'COURSES_TRAINING',
]);

/**
 * Generate a standard SVG representation of a secure certificate converted to Buffer
 */
function createSampleCertificateSvg(
  title: string,
  category: string,
  issuer: string,
  issueDate: string,
  serialNo: string,
  ownerName: string
): Buffer {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#142b4d"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect x="20" y="20" width="760" height="510" rx="16" fill="url(#bg)" stroke="url(#borderGrad)" stroke-width="4"/>
  <rect x="35" y="35" width="730" height="480" rx="10" fill="none" stroke="#dce6f5" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Corner Ornamental Accents -->
  <path d="M 45 65 L 45 45 L 65 45" fill="none" stroke="#2563eb" stroke-width="3"/>
  <path d="M 755 65 L 755 45 L 735 45" fill="none" stroke="#2563eb" stroke-width="3"/>
  <path d="M 45 485 L 45 505 L 65 505" fill="none" stroke="#2563eb" stroke-width="3"/>
  <path d="M 755 485 L 755 505 L 735 505" fill="none" stroke="#2563eb" stroke-width="3"/>

  <!-- Certibank Trust Seal -->
  <g transform="translate(680, 430)">
    <circle cx="0" cy="0" r="38" fill="url(#gold)" opacity="0.15"/>
    <circle cx="0" cy="0" r="34" fill="none" stroke="url(#gold)" stroke-width="2"/>
    <polygon points="0,-22 6,-8 21,-8 9,2 14,16 0,8 -14,16 -9,2 -21,-8 -6,-8" fill="#d97706"/>
    <text x="0" y="28" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#92400e" text-anchor="middle">CERTIFIED</text>
  </g>

  <!-- Watermark Pattern -->
  <text x="400" y="320" font-family="Inter, sans-serif" font-size="64" font-weight="800" fill="#e2e8f0" opacity="0.35" text-anchor="middle" transform="rotate(-15 400 320)">CERTIBANK VAULT</text>

  <!-- Header -->
  <g transform="translate(400, 85)">
    <rect x="-180" y="-20" width="360" height="34" rx="17" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
    <text x="0" y="2" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle" letter-spacing="2">OFFICIAL TRUST VERIFICATION</text>
  </g>

  <!-- Certificate Title -->
  <text x="400" y="150" font-family="Inter, sans-serif" font-size="26" font-weight="800" fill="#142b4d" text-anchor="middle">${title}</text>
  <text x="400" y="180" font-family="Inter, sans-serif" font-size="13" font-weight="500" fill="#64748b" text-anchor="middle">Category: ${category} | Authenticated Identity Record</text>

  <!-- Body Text -->
  <text x="400" y="235" font-family="Inter, sans-serif" font-size="13" font-weight="400" fill="#64748b" text-anchor="middle">This is to officially certify that the designated credential has been deposited to the Trust Vault for:</text>
  <text x="400" y="275" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#1e3a8a" text-anchor="middle">${ownerName}</text>
  <line x1="220" y1="290" x2="580" y2="290" stroke="#cbd5e1" stroke-width="1"/>

  <!-- Details Grid -->
  <g transform="translate(140, 330)">
    <text x="0" y="0" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#64748b">ISSUING AUTHORITY:</text>
    <text x="0" y="22" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#142b4d">${issuer}</text>

    <text x="320" y="0" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#64748b">ISSUE DATE:</text>
    <text x="320" y="22" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#142b4d">${issueDate}</text>

    <text x="0" y="65" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#64748b">DOCUMENT SERIAL ID:</text>
    <text x="0" y="87" font-family="monospace" font-size="13" font-weight="600" fill="#2563eb">${serialNo}</text>

    <text x="320" y="65" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#64748b">VAULT SECURITY STATUS:</text>
    <text x="320" y="87" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#059669">CRYPTOGRAPHICALLY SEALED</text>
  </g>

  <!-- Footer -->
  <g transform="translate(400, 485)">
    <text x="0" y="0" font-family="Inter, sans-serif" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">Certibank — A Trust Vault • Zero-Trust Permission Protected • Protected by Server Authorization</text>
  </g>
</svg>
`.trim();
  return Buffer.from(svg, 'utf-8');
}

/**
 * Seed initial users and demo certificates securely
 */
export function seedDatabase() {
  if (users.size > 0) return;

  const now = new Date().toISOString();

  // 1. OWNER ACCOUNT: nujahath / --nujhath5--
  const ownerId = 'usr_owner_nujahath';
  const ownerAuth = hashPassword('--nujhath5--');
  const ownerUser: StoredUser = {
    id: ownerId,
    username: 'nujahath',
    displayName: 'Nujahath (Vault Owner)',
    email: 'nujahath@certibank.internal',
    role: 'OWNER',
    status: 'ACTIVE',
    passwordHash: ownerAuth.hash,
    salt: ownerAuth.salt,
    createdAt: now,
    updatedAt: now,
  };
  users.set(ownerId, ownerUser);
  usernameIndex.set('nujahath', ownerId);

  // 2. VIEWER ACCOUNT: viewer_auditor / --viewerPass9--
  const viewerId = 'usr_viewer_auditor';
  const viewerAuth = hashPassword('--viewerPass9--');
  const viewerUser: StoredUser = {
    id: viewerId,
    username: 'viewer_auditor',
    displayName: 'External Auditor (Viewer)',
    email: 'auditor@certibank.internal',
    role: 'VIEWER',
    status: 'ACTIVE',
    passwordHash: viewerAuth.hash,
    salt: viewerAuth.salt,
    createdAt: now,
    updatedAt: now,
  };
  users.set(viewerId, viewerUser);
  usernameIndex.set('viewer_auditor', viewerId);

  // 3. ADMIN ACCOUNT: certi_admin / --adminVault7--
  const adminId = 'usr_admin_vault';
  const adminAuth = hashPassword('--adminVault7--');
  const adminUser: StoredUser = {
    id: adminId,
    username: 'certi_admin',
    displayName: 'Security Administrator',
    email: 'admin@certibank.internal',
    role: 'ADMIN',
    status: 'ACTIVE',
    passwordHash: adminAuth.hash,
    salt: adminAuth.salt,
    createdAt: now,
    updatedAt: now,
  };
  users.set(adminId, adminUser);
  usernameIndex.set('certi_admin', adminId);

  // Seed Realistic Certificates for Nujahath
  const sampleDocs = [
    {
      id: 'doc_gov_birth',
      title: 'Date of Birth Registration Certificate',
      category: 'GOVERNMENT',
      subCategory: 'Birth registration certificate',
      issuer: 'Municipal Civil Registration Authority',
      issueDate: '2001-08-14',
      verificationStatus: 'VERIFIED_ISSUER' as VerificationStatus,
      serialNo: 'GOV-BIRTH-2001-99841',
      mimeType: 'image/svg+xml',
      fileName: 'birth_registration_certificate.svg',
      description: 'Official government certified birth certificate registered under Civil Registration Division.',
      tags: ['Civil', 'Government', 'Identity', 'DOB'],
    },
    {
      id: 'doc_edu_btech',
      title: 'Bachelor of Technology in Computer Science & Engineering Degree',
      category: 'EDUCATIONAL',
      subCategory: 'University degrees',
      issuer: 'National Institute of Technology & Sciences',
      issueDate: '2023-06-20',
      verificationStatus: 'VERIFIED_ISSUER' as VerificationStatus,
      serialNo: 'DEG-BTECH-2023-4109',
      mimeType: 'image/svg+xml',
      fileName: 'btech_computer_science_degree.svg',
      description: 'First Class with Distinction graduation parchment and transcript index.',
      tags: ['Degree', 'B.Tech', 'Computer Science', 'Undergraduate'],
    },
    {
      id: 'doc_edu_sslc',
      title: 'Secondary School Completion Certificate & Mark Sheet',
      category: 'EDUCATIONAL',
      subCategory: 'Secondary school certificates',
      issuer: 'Central Board of Secondary Education',
      issueDate: '2017-05-25',
      verificationStatus: 'VERIFIED_ISSUER' as VerificationStatus,
      serialNo: 'CBSE-SEC-2017-88129',
      mimeType: 'image/svg+xml',
      fileName: 'secondary_school_certificate.svg',
      description: 'Secondary educational credential with consolidated mark statements and grades.',
      tags: ['Secondary', 'School', 'HighSchool', 'CBSE'],
    },
    {
      id: 'doc_pro_cissp',
      title: 'Certified Information Systems Security Professional (CISSP)',
      category: 'PROFESSIONAL',
      subCategory: 'Industry certifications',
      issuer: 'International Information System Security Certification Consortium (ISC)²',
      issueDate: '2025-01-15',
      expiryDate: '2028-01-15',
      verificationStatus: 'VERIFIED_ISSUER' as VerificationStatus,
      serialNo: 'ISC2-CISSP-2025-0994',
      mimeType: 'image/svg+xml',
      fileName: 'cissp_security_certification.svg',
      description: 'Advanced cybersecurity architecture, access control, and threat modeling credential.',
      tags: ['Security', 'CISSP', 'ISC2', 'Cybersecurity'],
    },
    {
      id: 'doc_course_zt',
      title: 'Advanced Zero Trust Cloud Architecture & ABAC Masterclass',
      category: 'COURSES_TRAINING',
      subCategory: 'Course completion certificates',
      issuer: 'Cloud Security Alliance Professional Institute',
      issueDate: '2025-09-10',
      verificationStatus: 'VERIFIED_ISSUER' as VerificationStatus,
      serialNo: 'CSA-ZT-2025-3312',
      mimeType: 'image/svg+xml',
      fileName: 'zero_trust_architecture_masterclass.svg',
      description: 'Hands-on zero-trust principles, cryptographic audit logging, and authorization models.',
      tags: ['Zero Trust', 'Cloud Security', 'Training', 'ABAC'],
    },
  ];

  for (const item of sampleDocs) {
    const storageKey = `storage_${crypto.randomUUID()}`;
    const fileBuffer = createSampleCertificateSvg(
      item.title,
      item.category,
      item.issuer,
      item.issueDate,
      item.serialNo,
      'Nujahath'
    );

    // Save file buffer
    fileStore.set(storageKey, {
      buffer: fileBuffer,
      mimeType: item.mimeType,
      originalName: item.fileName,
    });

    const docRecord: VaultDocument = {
      id: item.id,
      ownerId,
      ownerUsername: 'nujahath',
      title: item.title,
      normalizedTitle: item.title.trim().toLowerCase(),
      category: item.category,
      subCategory: item.subCategory,
      issuer: item.issuer,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
      verificationStatus: item.verificationStatus,
      storageKey,
      mimeType: item.mimeType,
      fileSize: fileBuffer.length,
      originalFileName: item.fileName,
      description: item.description,
      tags: item.tags,
      createdAt: now,
      updatedAt: now,
      isLocked: true,
    };

    documents.set(item.id, docRecord);
  }

  // Pre-seed an active grant to the viewer for the CISSP certificate to test VIEW & DOWNLOAD
  const sampleGrantId = 'grant_seed_01';
  permissions.set(sampleGrantId, {
    id: sampleGrantId,
    documentId: 'doc_pro_cissp',
    documentTitle: 'Certified Information Systems Security Professional (CISSP)',
    recipientId: viewerId,
    recipientUsername: 'viewer_auditor',
    grantedBy: ownerId,
    permissions: ['VIEW', 'DOWNLOAD'],
    grantedAt: now,
    status: 'ACTIVE',
  });
}
