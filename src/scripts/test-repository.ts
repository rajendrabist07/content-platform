import { prisma } from '../lib/prisma';
import { postRepository } from '../modules/posts/post.repository';

async function main() {

  const org = await prisma.organization.create({
    data: { name: 'Test Org', slug: 'test-org' },
  });

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: 'dummy-hash',
      name: 'Test User',
      organizationId: org.id,
    },
  });

  console.log('Created Org:', org.id, '| User:', user.id);


  const post = await postRepository.create({
    title: 'My First Post',
    slug: 'my-first-post',
    content: 'This is a test post created via repository pattern.',
    author: { connect: { id: user.id } },
    organization: { connect: { id: org.id } },
  });

  console.log('Created Post:', post);


  const found = await postRepository.findById(post.id);
  console.log('Found by ID:', found?.title);


  await postRepository.softDelete(post.id);
  const afterDelete = await postRepository.findById(post.id);
  console.log('After soft delete, findById returns:', afterDelete); 

  await prisma.$disconnect();
}

main().catch(console.error);