const request = require('supertest');
const { app } = require('../server');

describe('Healthiet server smoke tests', () => {
  test('health endpoint reports degraded without a database connection', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body.service).toBe('healthiet');
    expect(response.body.database).toBe('disconnected');
  });

  test('profile route requires authentication', async () => {
    const response = await request(app).get('/api/auth/profile');
    expect(response.status).toBe(401);
  });

  test('admin user creation requires authentication', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'user@example.com', password: 'password123' });
    expect(response.status).toBe(401);
  });
});
