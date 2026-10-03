import { PrismaClient, UserRole, PostStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Organizations
  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });

  const techOrg = await prisma.organization.upsert({
    where: { slug: 'tech-start' },
    update: {},
    create: {
      name: 'TechStart AI',
      slug: 'tech-start',
    },
  });

  console.log('✅ Organizations created:', acmeOrg.name, techOrg.name);

  // 2. Users
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@acme.com' },
    update: {},
    create: {
      email: 'owner@acme.com',
      name: 'Alice Owner',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Founder and Principal Architect at Acme Corp.',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        },
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      name: 'Bob Admin',
      passwordHash,
      role: UserRole.ADMIN,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Platform Lead & DevOps Engineer.',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        },
      },
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: {},
    create: {
      email: 'member@acme.com',
      name: 'Charlie Member',
      passwordHash,
      role: UserRole.MEMBER,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Fullstack TypeScript Developer.',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
        },
      },
    },
  });

  const techUser = await prisma.user.upsert({
    where: { email: 'writer@techstart.io' },
    update: {},
    create: {
      email: 'writer@techstart.io',
      name: 'Diana Writer',
      passwordHash,
      role: UserRole.MEMBER,
      organizationId: techOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'AI & Data Science Writer.',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        },
      },
    },
  });

  console.log('✅ Users seeded: Alice (OWNER), Bob (ADMIN), Charlie (MEMBER), Diana (MEMBER)');

  // 3. Tags
  const tagNames = ['typescript', 'architecture', 'postgresql', 'database', 'ai', 'security'];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log('✅ Tags seeded:', tags.map((t) => t.name).join(', '));

  const tagMap = new Map(tags.map((t) => [t.name, t.id]));

  // 4. Posts
  const post1 = await prisma.post.upsert({
    where: {
      organizationId_slug: {
        organizationId: acmeOrg.id,
        slug: 'building-production-clean-architecture-apis-with-nodejs',
      },
    },
    update: {},
    create: {
      title: 'Building Production Clean Architecture APIs with Node.js',
      slug: 'building-production-clean-architecture-apis-with-nodejs',
      content: `# Clean Architecture in Node.js & TypeScript\n\nSeparation of concerns is the cornerstone of maintainable enterprise backends.\n\n## Core Principles\n- Route layer handles HTTP semantics\n- Controller coordinates parsing & DTO formatting\n- Service layer executes pure business logic\n- Repository encapsulates database queries and Prisma ORM\n\n## Result\nTestable, decoupled, and robust codebases ready for enterprise scale.`,
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: ownerUser.id,
      organizationId: acmeOrg.id,
      tags: {
        create: [
          { tagId: tagMap.get('typescript')! },
          { tagId: tagMap.get('architecture')! },
        ],
      },
    },
  });

  const post2 = await prisma.post.upsert({
    where: {
      organizationId_slug: {
        organizationId: acmeOrg.id,
        slug: 'optimizing-postgresql-queries-with-b-tree-indexes',
      },
    },
    update: {},
    create: {
      title: 'Optimizing PostgreSQL Queries with B-Tree Indexes',
      slug: 'optimizing-postgresql-queries-with-b-tree-indexes',
      content: `# High-Performance PostgreSQL\n\nComposite indexes and partial indexes drastically reduce query execution time.\n\n\`\`\`sql\nCREATE INDEX idx_posts_status_published_at ON posts(status, published_at DESC);\n\`\`\`\n\nAlways analyze execution plans using EXPLAIN ANALYZE before optimizing.`,
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
      authorId: memberUser.id,
      organizationId: acmeOrg.id,
      tags: {
        create: [
          { tagId: tagMap.get('postgresql')! },
          { tagId: tagMap.get('database')! },
        ],
      },
    },
  });

  const draftPost = await prisma.post.upsert({
    where: {
      organizationId_slug: {
        organizationId: acmeOrg.id,
        slug: 'draft-zero-trust-security-in-modern-apis',
      },
    },
    update: {},
    create: {
      title: 'Draft: Zero-Trust Security in Modern APIs',
      slug: 'draft-zero-trust-security-in-modern-apis',
      content: `Work in progress draft on token rotation and rate limiting.`,
      status: PostStatus.DRAFT,
      authorId: adminUser.id,
      organizationId: acmeOrg.id,
      tags: {
        create: [{ tagId: tagMap.get('security')! }],
      },
    },
  });

  console.log('✅ Posts created:', post1.title, post2.title, draftPost.title);

  // 5. Comments & Threaded Replies
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: memberUser.id,
      content: 'Fantastic article! Clean architecture makes testing services with mock repositories so straightforward.',
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: ownerUser.id,
      parentId: comment1.id,
      content: 'Glad you found it helpful Charlie! Unit tests run in milliseconds when decoupled from the database.',
    },
  });

  console.log('✅ Threaded comments seeded');

  // 6. Likes and Bookmarks
  await prisma.postLike.upsert({
    where: { postId_userId: { postId: post1.id, userId: memberUser.id } },
    update: {},
    create: { postId: post1.id, userId: memberUser.id },
  });

  await prisma.bookmark.upsert({
    where: { postId_userId: { postId: post1.id, userId: memberUser.id } },
    update: {},
    create: { postId: post1.id, userId: memberUser.id },
  });

  console.log('✅ Likes and Bookmarks seeded');

  // 7. Audit Log Seed
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: acmeOrg.id,
        userId: ownerUser.id,
        action: 'AUTH_REGISTER',
        resource: 'User',
        resourceId: ownerUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        metadata: { email: ownerUser.email, role: 'OWNER' },
      },
      {
        organizationId: acmeOrg.id,
        userId: ownerUser.id,
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'User',
        resourceId: ownerUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    ],
  });

  console.log('✅ Seed finished successfully! 🚀');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
