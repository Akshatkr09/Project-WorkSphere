import { describe, expect, it } from 'vitest';
describe('Prisma client module', () => {
  it('exports the shared Prisma client', async () => {
    const { prisma } = await import('./prisma.js');
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
    await prisma.$disconnect();
  });
});
