import bcrypt from 'bcrypt';

export async function hashPassword(password: string, saltRounds: number = 12): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSalt(rounds: number = 12): string {
  return bcrypt.genSaltSync(rounds);
}