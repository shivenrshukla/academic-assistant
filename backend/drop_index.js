import 'dotenv/config';
import mongoose from 'mongoose';

async function dropIndex() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.some(c => c.name === 'documents')) {
      const collection = db.collection('documents');
      const indexes = await collection.indexes();
      
      const targetIndex = indexes.find(idx => idx.name === 'qdrantCollection_1' || idx.key.qdrantCollection);
      
      if (targetIndex) {
        await collection.dropIndex(targetIndex.name);
        console.log(`✅ Successfully dropped unique index: ${targetIndex.name}!`);
      } else {
        console.log(`ℹ️ Unique index on qdrantCollection not found. It might have already been dropped.`);
      }
    } else {
      console.log(`ℹ️ Collection 'documents' does not exist yet.`);
    }
  } catch (error) {
    console.error('❌ Error dropping index:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

dropIndex();
