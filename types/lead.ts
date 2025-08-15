export interface Lead {
  /** Client name */
  name: string;
  /** Phone number in international format */
  phone: string;
  /** Email address (optional) */
  email?: string;
  /** Preferred communication channel */
  preferred_channel: 'whatsapp' | 'email' | 'phone';
  /** Preferred callback window */
  callback_window?: 'morning' | 'day' | 'evening';
  /** Lead language */
  lang: 'pl' | 'en' | 'ua';
  /** Postal code */
  postal_code?: string;
  /** Whether the location is serviceable */
  serviceable: boolean;
  /** Answers from qualification quiz */
  quiz_answers: Record<string, any>;
  /** Estimated cost and duration */
  estimate: {
    low: number;
    high: number;
    days_min: number;
    days_max: number;
  };
  /** Marketing attribution parameters */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  /** Client consent flag */
  consent: boolean;
  /** Consent version */
  consent_v?: string;
  /** Consent timestamp */
  consent_ts?: string;
  /** Hash of client IP */
  ip_hash?: string;
  /** GA4 client identifier */
  ga_client_id?: string;
  /** Generated WhatsApp deeplink */
  whatsapp_deeplink?: string;
}
