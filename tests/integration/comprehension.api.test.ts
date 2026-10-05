import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import * as geminiClient from '../../src/modules/ai/gemini.client';

const app = createApp();

describe('Comprehension Layer API - Integration', () => {
  const testOrgId = 'test-org-comprehension-integration';
  let authorToken: string;
  let authorId: string;
  let otherUserToken: string;
  let postId: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { id: testOrgId, name: 'Comprehension Org', slug: 'comprehension-org' },
    });
  });

  afterAll(async () => {
    await prisma.articleQnA.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.articleQnA.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

    // 1. Author user
    const authorRes = await request(app).post('/api/v1/auth/register').send({
      email: `author-${Date.now()}@chronicle-comp.com`,
      password: 'Password123!',
      name: 'Author Comp',
      organizationId: testOrgId,
    });
    authorToken = authorRes.body.data.accessToken;
    authorId = authorRes.body.data.user.id;
    await prisma.user.update({
      where: { id: authorId },
      data: { trustLevel: 'MEMBER', emailVerifiedAt: new Date() },
    });

    // 2. Other reader
    const readerRes = await request(app).post('/api/v1/auth/register').send({
      email: `reader-${Date.now()}@chronicle-comp.com`,
      password: 'Password123!',
      name: 'Reader Comp',
      organizationId: testOrgId,
    });
    otherUserToken = readerRes.body.data.accessToken;

    // 3. Create a test post
    const post = await prisma.post.create({
      data: {
        title: 'Architecting Resilient PostgreSQL Job Queues',
        slug: `pg-job-queues-${Date.now()}`,
        content: `
          PostgreSQL offers powerful row-level locking capabilities with FOR UPDATE SKIP LOCKED.
          This pattern allows multiple workers to poll jobs concurrently without table-wide lock contention.
          Advisory locks should be released promptly in finally blocks to prevent connection pool exhaustion.
        `,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId,
        organizationId: testOrgId,
      },
    });
    postId = post.id;
  });

  describe('Quiz Generation & Retrieval', () => {
    it('should generate a grounded comprehension quiz when called by author', async () => {
      const mockQuizJson = JSON.stringify({
        questions: [
          {
            id: 'q1',
            question: 'Which PostgreSQL clause prevents lock contention among concurrent workers?',
            options: ['LOCK TABLE', 'FOR UPDATE SKIP LOCKED', 'SELECT FOR SHARE', 'EXCLUDE USING'],
            correctIndex: 1,
            explanation: 'FOR UPDATE SKIP LOCKED lets concurrent workers skip already locked rows.',
            sourceEvidence: 'locking capabilities with FOR UPDATE SKIP LOCKED',
          },
          {
            id: 'q2',
            question: 'Why must advisory locks be released promptly?',
            options: ['To avoid disk corruption', 'To avoid connection pool exhaustion', 'To reduce CPU clock rate', 'To free RAM index cache'],
            correctIndex: 1,
            explanation: 'Unreleased locks keep connections tied up and lead to pool exhaustion.',
            sourceEvidence: 'prevent connection pool exhaustion',
          },
        ],
      });

      vi.spyOn(geminiClient, 'generateJson').mockResolvedValue(mockQuizJson);

      const genRes = await request(app)
        .post(`/api/v1/posts/${postId}/quiz/generate`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ questionCount: 2 });

      expect(genRes.status).toBe(201);
      expect(genRes.body.success).toBe(true);
      expect(genRes.body.data.questionCount).toBe(2);
      expect(genRes.body.data.questions).toHaveLength(2);
      // Verify correctIndex is NOT exposed in the public questions array
      expect(genRes.body.data.questions[0].correctIndex).toBeUndefined();

      // Retrieve public quiz
      const getRes = await request(app).get(`/api/v1/posts/${postId}/quiz`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.questions).toHaveLength(2);
      expect(getRes.body.data.questions[0].options).toHaveLength(4);
    });

    it('should reject non-author non-admin from generating a quiz with 403 Forbidden', async () => {
      const genRes = await request(app)
        .post(`/api/v1/posts/${postId}/quiz/generate`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ questionCount: 2 });

      expect(genRes.status).toBe(403);
    });
  });

  describe('Quiz Attempt & Evaluation', () => {
    beforeEach(async () => {
      // Seed a stored quiz directly
      await prisma.quiz.create({
        data: {
          postId,
          questions: [
            {
              id: 'q1',
              question: 'Which PostgreSQL clause prevents lock contention among concurrent workers?',
              options: ['LOCK TABLE', 'FOR UPDATE SKIP LOCKED', 'SELECT FOR SHARE', 'EXCLUDE USING'],
              correctIndex: 1,
              explanation: 'FOR UPDATE SKIP LOCKED lets concurrent workers skip already locked rows.',
              sourceEvidence: 'FOR UPDATE SKIP LOCKED',
            },
            {
              id: 'q2',
              question: 'Why must advisory locks be released promptly?',
              options: ['To avoid disk corruption', 'To avoid connection pool exhaustion', 'To reduce CPU clock rate', 'To free RAM cache'],
              correctIndex: 1,
              explanation: 'Unreleased locks lead to connection pool exhaustion.',
              sourceEvidence: 'prevent connection pool exhaustion',
            },
          ] as any,
        },
      });
    });

    it('should evaluate a perfect quiz attempt and return 100% score with feedback', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${postId}/quiz/attempt`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ answers: [1, 1] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(2);
      expect(res.body.data.totalQuestions).toBe(2);
      expect(res.body.data.percentage).toBe(100);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.feedback).toHaveLength(2);
      expect(res.body.data.feedback[0].isCorrect).toBe(true);
      expect(res.body.data.feedback[0].sourceEvidence).toBe('FOR UPDATE SKIP LOCKED');
    });

    it('should evaluate a partially incorrect attempt accurately', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${postId}/quiz/attempt`)
        .send({ answers: [1, 0] }); // Answer 2 wrong

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(1);
      expect(res.body.data.percentage).toBe(50);
      expect(res.body.data.passed).toBe(false);
      expect(res.body.data.feedback[1].isCorrect).toBe(false);
      expect(res.body.data.feedback[1].correctAnswer).toBe(1);
    });
  });

  describe('Grounded "Ask This Article" Q&A Engine', () => {
    it('should answer question and verify verbatim quotes against article content', async () => {
      const mockQnaResponse = JSON.stringify({
        answer: 'PostgreSQL provides concurrent polling via FOR UPDATE SKIP LOCKED to prevent lock contention.',
        quotes: ['locking capabilities with FOR UPDATE SKIP LOCKED', 'poll jobs concurrently without table-wide lock contention'],
      });

      vi.spyOn(geminiClient, 'generateJson').mockResolvedValue(mockQnaResponse);

      const res = await request(app)
        .post(`/api/v1/posts/${postId}/ask`)
        .send({ question: 'How do workers avoid locking each other?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('FOR UPDATE SKIP LOCKED');
      expect(res.body.data.groundedQuotes).toHaveLength(2);
      expect(res.body.data.isGrounded).toBe(true);
    });
  });

  describe('Author Comprehension Analytics', () => {
    beforeEach(async () => {
      const quiz = await prisma.quiz.create({
        data: {
          postId,
          questions: [
            {
              id: 'q1',
              question: 'Question One',
              options: ['A', 'B', 'C', 'D'],
              correctIndex: 1,
              explanation: 'B is right',
              sourceEvidence: 'Evidence 1',
            },
          ] as any,
        },
      });

      // Submit two attempts (1 passed, 1 failed)
      await prisma.quizAttempt.createMany({
        data: [
          { quizId: quiz.id, score: 1, totalQuestions: 1, answers: [1] as any },
          { quizId: quiz.id, score: 0, totalQuestions: 1, answers: [0] as any },
        ],
      });
    });

    it('should aggregate quiz performance and highlight confusing options for author', async () => {
      const res = await request(app)
        .get(`/api/v1/posts/${postId}/analytics/comprehension`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAttempts).toBe(2);
      expect(res.body.data.passRate).toBe(50);
      expect(res.body.data.questionStats).toHaveLength(1);
      expect(res.body.data.questionStats[0].accuracyRate).toBe(50);
      expect(res.body.data.questionStats[0].confusingOptions).toHaveLength(1);
      expect(res.body.data.questionStats[0].confusingOptions[0].optionIndex).toBe(0);
    });
  });
});
