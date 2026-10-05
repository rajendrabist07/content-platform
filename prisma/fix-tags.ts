import { PrismaClient } from '@prisma/client';
import { normalizeTag } from '../src/modules/tags/tag.normalizer';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

export async function fixTags(applyChanges = false) {
  console.log('=====================================================');
  console.log(`🏷️  Running Tag Cleanup & Normalization (${applyChanges ? 'APPLY MODE' : 'DRY RUN MODE'})`);
  console.log('=====================================================');

  const allTags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Inspecting ${allTags.length} total tag(s) in database...\n`);

  let renamedCount = 0;
  let mergedCount = 0;
  let deletedCount = 0;
  let untouchedCount = 0;

  for (const tag of allTags) {
    const canonicalName = normalizeTag(tag.name);

    if (canonicalName === tag.name) {
      untouchedCount++;
      continue;
    }

    if (!canonicalName) {
      console.log(`[DELETE JUNK] "${tag.name}" (id: ${tag.id}, posts: ${tag._count.posts}) -> cannot be normalized`);
      if (applyChanges) {
        await prisma.$transaction([
          prisma.tagsOnPosts.deleteMany({ where: { tagId: tag.id } }),
          prisma.tag.delete({ where: { id: tag.id } }),
        ]);
      }
      deletedCount++;
      continue;
    }

    // Check if canonical tag already exists
    const existingCanonicalTag = await prisma.tag.findUnique({
      where: { name: canonicalName },
    });

    if (existingCanonicalTag && existingCanonicalTag.id !== tag.id) {
      console.log(
        `[MERGE] "${tag.name}" -> merge into existing "${canonicalName}" (id: ${existingCanonicalTag.id})`
      );
      if (applyChanges) {
        // Re-link posts
        const tagPosts = await prisma.tagsOnPosts.findMany({
          where: { tagId: tag.id },
        });

        for (const tp of tagPosts) {
          await prisma.tagsOnPosts.upsert({
            where: {
              postId_tagId: {
                postId: tp.postId,
                tagId: existingCanonicalTag.id,
              },
            },
            create: {
              postId: tp.postId,
              tagId: existingCanonicalTag.id,
            },
            update: {},
          });
        }

        await prisma.tagsOnPosts.deleteMany({ where: { tagId: tag.id } });
        await prisma.tag.delete({ where: { id: tag.id } });
      }
      mergedCount++;
    } else {
      console.log(`[RENAME] "${tag.name}" -> "${canonicalName}"`);
      if (applyChanges) {
        await prisma.tag.update({
          where: { id: tag.id },
          data: { name: canonicalName },
        });
      }
      renamedCount++;
    }
  }

  console.log('\n-----------------------------------------------------');
  console.log(`📊 Summary:`);
  console.log(`- Untouched (Already valid): ${untouchedCount}`);
  console.log(`- Renamed:                  ${renamedCount}`);
  console.log(`- Merged into existing:     ${mergedCount}`);
  console.log(`- Deleted (Junk fragments): ${deletedCount}`);
  console.log('-----------------------------------------------------');

  if (!applyChanges) {
    console.log('ℹ️  This was a DRY RUN. No database modifications were written.');
    console.log('   To apply these changes, run: npm run db:fix-tags -- --apply\n');
  } else {
    console.log('✅ Changes successfully applied to the database.\n');
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const isApply = process.argv.includes('--apply');
  fixTags(isApply)
    .catch((err) => {
      console.error('❌ Tag fix failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
