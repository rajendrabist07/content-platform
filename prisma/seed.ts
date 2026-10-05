import { PrismaClient, UserRole, TrustLevel, UserStatus, PostStatus, ReportTarget, ReportReason, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Chronicle...');

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
    update: { trustLevel: TrustLevel.TRUSTED, status: UserStatus.ACTIVE },
    create: {
      email: 'owner@acme.com',
      name: 'Alice Owner',
      passwordHash,
      role: UserRole.OWNER,
      trustLevel: TrustLevel.TRUSTED,
      status: UserStatus.ACTIVE,
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
    update: { trustLevel: TrustLevel.TRUSTED, status: UserStatus.ACTIVE },
    create: {
      email: 'admin@acme.com',
      name: 'Bob Admin',
      passwordHash,
      role: UserRole.ADMIN,
      trustLevel: TrustLevel.TRUSTED,
      status: UserStatus.ACTIVE,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Platform Lead & Trust / Moderation Officer.',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        },
      },
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: { trustLevel: TrustLevel.MEMBER, status: UserStatus.ACTIVE },
    create: {
      email: 'member@acme.com',
      name: 'Charlie Member',
      passwordHash,
      role: UserRole.MEMBER,
      trustLevel: TrustLevel.MEMBER,
      status: UserStatus.ACTIVE,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Fullstack TypeScript Developer & Technical Writer.',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
        },
      },
    },
  });

  const newUser = await prisma.user.upsert({
    where: { email: 'newbie@acme.com' },
    update: { trustLevel: TrustLevel.NEW, status: UserStatus.ACTIVE },
    create: {
      email: 'newbie@acme.com',
      name: 'Nathan Newbie',
      passwordHash,
      role: UserRole.MEMBER,
      trustLevel: TrustLevel.NEW,
      status: UserStatus.ACTIVE,
      organizationId: acmeOrg.id,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          bio: 'Aspiring systems programmer.',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        },
      },
    },
  });

  console.log('✅ Users seeded with trust levels: Alice (TRUSTED), Bob (ADMIN), Charlie (MEMBER), Nathan (NEW)');

  // 3. Tags (Canonical)
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

  const tagMap = new Map(tags.map((t) => [t.name, t.id]));
  console.log('✅ Tags seeded:', tags.map((t) => t.name).join(', '));

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

  const pendingPost = await prisma.post.upsert({
    where: {
      organizationId_slug: {
        organizationId: acmeOrg.id,
        slug: 'concurrency-control-in-modern-distributed-databases',
      },
    },
    update: {},
    create: {
      title: 'Concurrency Control in Modern Distributed Databases',
      slug: 'concurrency-control-in-modern-distributed-databases',
      content: `A deep dive into 2PL vs MVCC and snapshot isolation anomalies in modern distributed architectures.`,
      status: PostStatus.PENDING_REVIEW,
      authorId: newUser.id,
      organizationId: acmeOrg.id,
      tags: {
        create: [{ tagId: tagMap.get('database')! }],
      },
    },
  });

  console.log('✅ Posts created:', post1.title, post2.title, pendingPost.title);

  // 5. Comprehension Layer (Quiz & Attempts)
  const quiz1 = await prisma.quiz.upsert({
    where: { postId: post1.id },
    update: {},
    create: {
      postId: post1.id,
      questions: [
        {
          id: 'q1',
          question: 'What is the responsibility of the Service layer in Clean Architecture?',
          options: [
            'Parsing raw HTTP headers',
            'Executing pure domain and business logic',
            'Directly building SQL string queries',
            'Managing frontend DOM mutations',
          ],
          correctIndex: 1,
          explanation: 'The service layer is decoupled from HTTP and database drivers, isolating business rules.',
          sourceEvidence: 'Service layer executes pure business logic',
        },
        {
          id: 'q2',
          question: 'Which component encapsulates Prisma ORM database interactions?',
          options: ['Route handler', 'Controller', 'Repository', 'Validator'],
          correctIndex: 2,
          explanation: 'Repositories encapsulate database queries and persistence details.',
          sourceEvidence: 'Repository encapsulates database queries and Prisma ORM',
        },
      ] as any,
    },
  });

  await prisma.quizAttempt.createMany({
    data: [
      {
        quizId: quiz1.id,
        userId: memberUser.id,
        score: 2,
        totalQuestions: 2,
        answers: [1, 2] as any,
      },
      {
        quizId: quiz1.id,
        userId: newUser.id,
        score: 1,
        totalQuestions: 2,
        answers: [1, 0] as any,
      },
    ],
  });

  console.log('✅ Comprehension Quiz & Attempts seeded for Post 1');

  // 6. Reports & Moderation
  await prisma.report.upsert({
    where: {
      reporterId_targetType_targetId: {
        reporterId: memberUser.id,
        targetType: ReportTarget.POST,
        targetId: post2.id,
      },
    },
    update: {},
    create: {
      reporterId: memberUser.id,
      targetType: ReportTarget.POST,
      targetId: post2.id,
      reason: ReportReason.SPAM,
      details: 'Automated test report for moderation verification.',
      status: ReportStatus.OPEN,
    },
  });

  console.log('✅ Moderation Report seeded');

  // 7. Background Jobs Queue
  await prisma.backgroundJob.create({
    data: {
      name: 'article:digest_notification',
      payload: { orgId: acmeOrg.id, date: new Date().toISOString() } as any,
      status: 'COMPLETED',
      attempts: 1,
    },
  });

  console.log('✅ Background Jobs seeded');
  console.log('🎉 Seed finished successfully! Chronicle is ready for production. 🚀');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
