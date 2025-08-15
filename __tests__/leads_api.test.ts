import handler from '../api/leads';
import { sendClientEmail } from '../mail';

jest.mock('../wa', () => ({
  buildWhatsAppLink: jest.fn().mockReturnValue('wa_link')
}));
jest.mock('../notify', () => ({
  notifyTelegram: jest.fn().mockResolvedValue(true)
}));
jest.mock('../mail', () => ({
  sendClientEmail: jest.fn().mockResolvedValue(true),
  sendAdminEmail: jest.fn()
}));
jest.mock('../storage', () => ({
  saveLead: jest.fn().mockResolvedValue('lead123')
}));
jest.mock('../turnstile', () => ({
  verifyTurnstile: jest.fn().mockResolvedValue(true)
}));
jest.mock('../ga4', () => ({
  sendServerEvent: jest.fn()
}));

describe('/api/leads handler', () => {
  const mockedSendClientEmail = sendClientEmail as jest.MockedFunction<typeof sendClientEmail>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUSINESS_WHATSAPP_PHONE = '123456789';
  });

  const baseBody = {
    name: 'Ivan',
    phone: '+12345678901',
    preferred_channel: 'email' as const,
    lang: 'pl' as const,
    quiz_answers: {},
    estimate: { low: 1, high: 2, days_min: 3, days_max: 4 },
    consent: true
  };

  it('sends email when email provided', async () => {
    const req: any = {
      method: 'POST',
      headers: { 'cf-turnstile-token': 'token' },
      body: { ...baseBody, email: 'test@example.com' }
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };

    await handler(req, res);

    expect(mockedSendClientEmail).toHaveBeenCalledWith(
      'pl',
      'test@example.com',
      { low: 1, high: 2, days_min: 3, days_max: 4 }
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      lead_id: 'lead123',
      whatsapp_deeplink: 'wa_link',
      email_sent: true
    });
  });

  it('does not send email when email missing', async () => {
    const req: any = {
      method: 'POST',
      headers: { 'cf-turnstile-token': 'token' },
      body: { ...baseBody, email: '' }
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res: any = { status };

    await handler(req, res);

    expect(mockedSendClientEmail).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      lead_id: 'lead123',
      whatsapp_deeplink: 'wa_link',
      email_sent: false
    });
  });
});

