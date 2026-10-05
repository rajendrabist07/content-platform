/**
 * Disposable Email Domains Blocklist
 *
 * Prevents automated bot registrations and spam accounts using throwaway email services.
 */

export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minmail.com',
  '20minutemail.com',
  'anonbox.net',
  'armyspy.com',
  'binkmail.com',
  'bobmail.info',
  'chacuo.net',
  'crazymailing.com',
  'cuvox.de',
  'dayrep.com',
  'discard.email',
  'discardmail.com',
  'disposablemail.com',
  'dispostable.com',
  'drdrb.net',
  'einrot.com',
  'emailfake.com',
  'emailsensei.com',
  'emkei.cz',
  'eyepaste.com',
  'fakemailgenerator.com',
  'fleckens.hu',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'gustr.com',
  'harakirimail.com',
  'inboxkitten.com',
  'incognitomail.org',
  'jourrapide.com',
  'mail-temporaire.fr',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'mailnesia.com',
  'mailnull.com',
  'mohmal.com',
  'mytrashmail.com',
  'nada.ltd',
  'nada.onl',
  'nada.vet',
  'nightlymail.com',
  'nowmymail.com',
  'oneoffmail.com',
  'owlpic.com',
  'pokemail.net',
  'postacin.com',
  'rhyta.com',
  'safetymail.info',
  'sharklasers.com',
  'spambog.com',
  'spamgourmet.com',
  'superrito.com',
  'teleworm.us',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmail.net',
  'tempmailaddress.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'urhen.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'zippymail.info',
]);

export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2 || !parts[1]) {
    return false;
  }

  const domain = parts[1];
  return DISPOSABLE_DOMAINS.has(domain);
}
