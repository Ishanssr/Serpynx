const { PrismaClient } = require('@prisma/client');

async function testModels() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    console.log('Testing model access...');
    
    // Test WorkSubmission
    try {
      const workSubmissionCount = await prisma.workSubmission.count();
      console.log('✓ WorkSubmission model accessible, count:', workSubmissionCount);
    } catch (error) {
      console.log('✗ WorkSubmission model not accessible:', error.message);
    }
    
    // Test ProjectMessage
    try {
      const projectMessageCount = await prisma.projectMessage.count();
      console.log('✓ ProjectMessage model accessible, count:', projectMessageCount);
    } catch (error) {
      console.log('✗ ProjectMessage model not accessible:', error.message);
    }
    
    // Test ActivityLog
    try {
      const activityLogCount = await prisma.activityLog.count();
      console.log('✓ ActivityLog model accessible, count:', activityLogCount);
    } catch (error) {
      console.log('✗ ActivityLog model not accessible:', error.message);
    }
    
    // List all available models
    const models = Object.keys(prisma).filter(key => 
      key[0] === key[0].toUpperCase() && 
      key !== 'PrismaClient' && 
      typeof prisma[key] === 'object'
    );
    console.log('Available models:', models);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModels();
