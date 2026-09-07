import { prisma } from '../lib/prisma';
import { postService } from '../modules/posts/post.service';

async function main() {
  const org = await prisma.organization.create({
    data: { name: 'Service Test Org', slug: 'service-test-org' },
  });
  const user = await prisma.user.create({
    data: { email: 'service-test@example.com', passwordHash: 'x', name: 'Service Tester', organizationId: org.id },
  });


  const post = await postService.createPost(
    { title: 'Hello World', content: 'This is my content here.', status: 'DRAFT' },
    user.id,
    org.id
  );
  console.log('Post created:', post.slug, post.status);


  try {
    await postService.createPost(
      { title: 'Hello World', content: 'Different content.', status: 'DRAFT' },
      user.id,
      org.id
    );
  } catch (err: any) {
    console.log('Test 2 (expected error):', err.message);
  }


  const published = await postService.publishPost(post.id, user.id);
  console.log('Published:', published.status, published.publishedAt);


  try {
    await postService.publishPost(post.id, user.id);
  } catch (err: any) {
    console.log('Test 4 (expected error):', err.message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);