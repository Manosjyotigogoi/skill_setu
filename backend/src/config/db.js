const mongoose = require('mongoose');

let universityConn = null;
let governmentConn = null;

async function connectDB() {
  const mainUri = process.env.MONGO_URI || process.env.UNIVERSITY_MONGO_URI || process.env.GOVERNMENT_MONGO_URI;

  if (!mainUri) {
    throw new Error('No MongoDB URI found in environment. Set MONGO_URI, UNIVERSITY_MONGO_URI, and GOVERNMENT_MONGO_URI.');
  }

  mongoose.set('strictQuery', true);

  // 1. Primary default Mongoose connection (for default models and backward compatibility)
  const defaultConn = await mongoose.connect(mainUri);
  console.log(`Default MongoDB connected: ${defaultConn.connection.host}/${defaultConn.connection.name}`);

  // 2. University Cluster connection
  if (process.env.UNIVERSITY_MONGO_URI && process.env.UNIVERSITY_MONGO_URI !== mainUri) {
    universityConn = mongoose.createConnection(process.env.UNIVERSITY_MONGO_URI);
    await universityConn.asPromise();
    console.log(`University MongoDB cluster connected: ${universityConn.host}/${universityConn.name}`);
  } else {
    universityConn = defaultConn.connection;
  }

  // 3. Government Cluster connection
  if (process.env.GOVERNMENT_MONGO_URI && process.env.GOVERNMENT_MONGO_URI !== mainUri) {
    governmentConn = mongoose.createConnection(process.env.GOVERNMENT_MONGO_URI);
    await governmentConn.asPromise();
    console.log(`Government MongoDB cluster connected: ${governmentConn.host}/${governmentConn.name}`);
  } else {
    governmentConn = defaultConn.connection;
  }

  return { defaultConn, universityConn, governmentConn };
}

function getUniversityConnection() {
  return universityConn || mongoose.connection;
}

function getGovernmentConnection() {
  return governmentConn || mongoose.connection;
}

module.exports = connectDB;
module.exports.getUniversityConnection = getUniversityConnection;
module.exports.getGovernmentConnection = getGovernmentConnection;
