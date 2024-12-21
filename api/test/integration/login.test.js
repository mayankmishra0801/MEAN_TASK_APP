const request = require('supertest');
const app = require('../../app'); // Ensure this path is correct
const User = require('../../db/models/user.model'); // Ensure this path is correct
const mongoose = require('mongoose');

let dbUri = 'mongodb://localhost:27017/testdb'; // Use a test database

beforeAll(async () => {
    
    // Connect to the test database once
    await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Create a test user
    await User.create({
        email: 'test@example.com',
        password: 'password123', // Ensure password is hashed if your User schema does that
    });
});

afterAll(async () => {
    // Clean up after all tests
    await User.deleteMany({}); // Make sure User model is imported correctly
    await mongoose.disconnect();
});

describe('POST /users/login', () => {
    test('should login a user and return a token', async () => {
        const response = await request(app)
            .post('/users/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            })
            .expect(200);

        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.headers['x-access-token']).toBeDefined();
    });

    test('should return 404 for non-existing user', async () => {
        const response = await request(app)
            .post('/users/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            })
            .expect(404);

        expect(response.body.message).toBe('User not found');
    });

    test('should return 400 for wrong password', async () => {
        const response = await request(app)
            .post('/users/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword',
            })
            .expect(400);

        expect(response.body.message).toBe('Invalid password'); // Adjust according to your actual response
    });
});
