import { validateEmailServiceConfig } from '../../services/email.service';

describe('validateEmailServiceConfig', () => {
  const productionSendGrid = {
    nodeEnv: 'production',
    emailService: 'sendgrid' as const,
    emailApiKey: 'sendgrid-key',
    emailFrom: 'Humanly <no-reply@writehumanly.net>',
  };

  it('allows console email mode outside production', () => {
    expect(() =>
      validateEmailServiceConfig({
        nodeEnv: 'development',
        emailService: 'console',
        emailFrom: 'dev@humanly.local',
      })
    ).not.toThrow();
  });

  it('allows SendGrid in production when required fields are present', () => {
    expect(() => validateEmailServiceConfig(productionSendGrid)).not.toThrow();
  });

  it('rejects console email mode in production', () => {
    expect(() =>
      validateEmailServiceConfig({
        ...productionSendGrid,
        emailService: 'console',
      })
    ).toThrow(/console is not allowed in production/);
  });

  it('rejects SendGrid in production without an API key', () => {
    expect(() =>
      validateEmailServiceConfig({
        ...productionSendGrid,
        emailApiKey: undefined,
      })
    ).toThrow(/EMAIL_API_KEY/);
  });

  it('allows SMTP in production when a host is configured', () => {
    expect(() =>
      validateEmailServiceConfig({
        nodeEnv: 'production',
        emailService: 'smtp',
        emailFrom: 'Humanly <no-reply@writehumanly.net>',
        emailHost: 'smtp.example.com',
      })
    ).not.toThrow();
  });

  it('rejects SMTP in production without a host', () => {
    expect(() =>
      validateEmailServiceConfig({
        nodeEnv: 'production',
        emailService: 'smtp',
        emailFrom: 'Humanly <no-reply@writehumanly.net>',
      })
    ).toThrow(/EMAIL_HOST/);
  });

  it('rejects the unimplemented SES adapter in production', () => {
    expect(() =>
      validateEmailServiceConfig({
        ...productionSendGrid,
        emailService: 'ses',
      })
    ).toThrow(/not implemented/);
  });
});
