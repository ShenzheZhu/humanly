import {
  CertificateSealInput,
  CertificateSealService,
  canonicalJSONString,
} from '../../services/certificate-seal.service';

const SECRET = 'test-certificate-seal-secret';

function makeSealInput(overrides: Partial<CertificateSealInput> = {}): CertificateSealInput {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    submissionId: null,
    documentId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
    certificateType: 'full_authorship',
    title: 'Certificate Test',
    documentSnapshot: {
      root: {
        children: [
          {
            children: [{ text: 'Humanly certificate text' }],
            type: 'paragraph',
          },
        ],
      },
    },
    plainTextSnapshot: 'Humanly certificate text',
    totalEvents: 12,
    typingEvents: 10,
    pasteEvents: 2,
    totalCharacters: 25,
    typedCharacters: 20,
    pastedCharacters: 5,
    editingTimeSeconds: 120,
    verificationToken: 'verification-token',
    signerName: 'Test Writer',
    includeFullText: true,
    includeEditHistory: true,
    isProtected: false,
    generatedAt: '2026-06-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('CertificateSealService', () => {
  it('canonicalizes object keys deterministically', () => {
    expect(canonicalJSONString({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalJSONString({ a: { c: 3, d: 4 }, b: 2 })
    );
  });

  it('creates a versioned seal that verifies against the same certificate payload', () => {
    const input = makeSealInput();
    const seal = CertificateSealService.createSeal(input, SECRET);

    expect(seal.version).toBe('hly-seal-v1');
    expect(seal.algorithm).toBe('HMAC-SHA256');
    expect(seal.signature).toMatch(/^hly-seal-v1\./);

    const verification = CertificateSealService.verifySeal(input, SECRET, seal.signature);

    expect(verification.valid).toBe(true);
    expect(verification.sealStatus).toBe('valid');
    expect(verification.seal?.payloadHash).toBe(seal.payloadHash);
  });

  it('fails verification when protected metrics are changed', () => {
    const input = makeSealInput();
    const seal = CertificateSealService.createSeal(input, SECRET);
    const tampered = makeSealInput({ typedCharacters: 21 });

    const verification = CertificateSealService.verifySeal(tampered, SECRET, seal.signature);

    expect(verification.valid).toBe(false);
    expect(verification.sealStatus).toBe('invalid');
  });

  it('fails verification when protected text content is changed', () => {
    const input = makeSealInput();
    const seal = CertificateSealService.createSeal(input, SECRET);
    const tampered = makeSealInput({ plainTextSnapshot: 'Changed certificate text' });

    const verification = CertificateSealService.verifySeal(tampered, SECRET, seal.signature);

    expect(verification.valid).toBe(false);
    expect(verification.sealStatus).toBe('invalid');
  });
});
