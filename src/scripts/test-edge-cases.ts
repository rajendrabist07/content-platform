import { createPostSchema } from '../modules/posts/post.validation';


const caseA = createPostSchema.safeParse({ title: 'Valid Title' });
console.log('Case A (missing content):', caseA.success ? 'PASSED' : (caseA.error.issues[0]?.message ?? 'unknown error'));


const caseB = createPostSchema.safeParse({ title: 'Valid Title', content: '' });
console.log('Case B (empty string content):', caseB.success ? 'PASSED' : (caseB.error.issues[0]?.message ?? 'unknown error'));