import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  return base || 'post';
}

export async function backfillSlugs() {
  console.log('🔄 Starting post slug backfill...');

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      organizationId: true,
    },
  });

  console.log(`Found ${posts.length} total posts to inspect.`);
  let updatedCount = 0;

  for (const post of posts) {
    if (!post.slug || post.slug.trim() === '') {
      const baseSlug = slugify(post.title);
      const uniqueSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

      await prisma.post.update({
        where: { id: post.id },
        data: { slug: uniqueSlug },
      });

      console.log(`Updated post "${post.title}" (${post.id}) -> slug: "${uniqueSlug}"`);
      updatedCount++;
    }
  }

  console.log(`✅ Backfill complete. Updated ${updatedCount} posts.`);
}

import { fileURLToPath } from 'url';

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  backfillSlugs()
    .catch((err) => {
      console.error('❌ Backfill failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
