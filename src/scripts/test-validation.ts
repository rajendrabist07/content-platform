import { createPostSchema } from '../modules/posts/post.validation';


const valid = createPostSchema.safeParse({
  title: 'My First Post',
  content: 'This is the content of my post.',
});

if (valid.success) {
  console.log('Test 1 (Valid): SUCCESS', valid.data);
} else {
  console.log('Test 1 (Valid): FAILED', valid.error.issues);
}


const invalid = createPostSchema.safeParse({ title: 'Hi' });

if (invalid.success) {
  console.log('Test 2 (Invalid): unexpectedly succeeded');
} else {
  console.log('Test 2 (Invalid): FAILED as expected');
  console.log(invalid.error.issues);
}