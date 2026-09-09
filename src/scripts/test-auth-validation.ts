import { registerSchema } from '../modules/auth/auth.validation';

const result = registerSchema.safeParse({
  email: 'test@test.com',
  password: '123',
  name: 'R',
  organizationId: 'abc',
});

if (!result.success) {
  console.log('❌ Validation failed:');
  console.log(result.error.issues);
} else {
  console.log('✅ Validation passed:', result.data);
}