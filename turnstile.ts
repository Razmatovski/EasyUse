export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: secret || "", response: token })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.success;
}
