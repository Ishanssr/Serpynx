-- Create test freelancer user
INSERT INTO "User" (id, "email", "name", "role", "password", "createdAt", "updatedAt")
VALUES (
  'test-freelancer-2',
  'freelancer2@serpynx.com',
  'Test Freelancer 2',
  'FREELANCER',
  'dummy-password',
  NOW(),
  NOW()
);

-- Create test task
INSERT INTO "Task" (id, "title", "description", "budget", "requiredSkills", "status", "clientId", "createdAt", "updatedAt")
VALUES (
  'test-task-2',
  'Test Task for Bids',
  'Test task description',
  200,
  ARRAY['JavaScript', 'Node.js'],
  'OPEN',
  'test-client-id',
  NOW(),
  NOW()
);

-- Create test bids
INSERT INTO "Bid" (id, "amount", "coverLetter", "estimatedDays", "status", "freelancerId", "taskId", "createdAt", "updatedAt")
VALUES 
  ('bid-1', 150, 'Test bid 1', 5, 'PENDING', 'test-freelancer-2', 'test-task-2', NOW(), NOW()),
  ('bid-2', 180, 'Test bid 2', 7, 'PENDING', 'test-freelancer-2', 'test-task-2', NOW(), NOW());
