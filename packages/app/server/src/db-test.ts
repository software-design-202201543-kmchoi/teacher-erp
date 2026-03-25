import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { StudentModel } from '@teacher-erp/shared-db';

async function runTest() {
  console.log('Starting in-memory MongoDB server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  console.log(`Connecting to mongoose at ${uri}...`);
  await mongoose.connect(uri);

  console.log('Creating a test student using the shared model...');
  const student = new StudentModel({
    name: '김철수',
    grade: 1,
    classGroup: 3,
    studentNumber: 15,
    specialNotes: 'Shared model test record'
  });

  const savedStudent = await student.save();
  console.log('Successfully saved student:', savedStudent.toJSON());

  console.log('Retrieving student from DB...');
  const retrievedStudent = await StudentModel.findById(savedStudent._id);
  console.log('Retrieved student:', retrievedStudent?.toJSON());

  console.log('Cleaning up...');
  await mongoose.disconnect();
  await mongod.stop();
  console.log('Test completed successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
