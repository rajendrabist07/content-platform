import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { fixTags } from '../../prisma/fix-tags';

describe('Tag Cleanup Script (fixTags) - Integration Tests', () => {
  beforeEach(async () => {
    // Clear tags and junction rows
    await prisma.tagsOnPosts.deleteMany();
    await prisma.tag.deleteMany();
  });

  afterAll(async () => {
    await prisma.tagsOnPosts.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.$disconnect();
  });

  it('should not modify anything in dry-run mode', async () => {
    await prisma.tag.createMany({
      data: [
        { name: '#and backend.' },
        { name: 'TypeScript' },
        { name: 'node.js' },
      ],
    });

    await fixTags(false); // Dry run

    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    expect(tags.length).toBe(3);
    expect(tags.map((t) => t.name)).toEqual(expect.arrayContaining(['#and backend.', 'TypeScript', 'node.js']));
  });

  it('should clean and merge junk tags into canonical names in apply mode', async () => {
    // Create clean canonical tag
    const cleanTag = await prisma.tag.create({ data: { name: 'backend' } });
    // Create junk tag that normalizes to "backend"
    const junkTag = await prisma.tag.create({ data: { name: '#and backend.' } });
    // Create un-normalized tag "TypeScript"
    const tsTag = await prisma.tag.create({ data: { name: 'TypeScript' } });
    // Create invalid phrase that should be deleted
    const invalidTag = await prisma.tag.create({ data: { name: 'this is a whole paragraph' } });

    await fixTags(true); // Apply mode

    const remainingTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const tagNames = remainingTags.map((t) => t.name);

    expect(tagNames).toContain('backend');
    expect(tagNames).toContain('typescript');
    expect(tagNames).not.toContain('#and backend.');
    expect(tagNames).not.toContain('TypeScript');
    expect(tagNames).not.toContain('this is a whole paragraph');
  });
});
