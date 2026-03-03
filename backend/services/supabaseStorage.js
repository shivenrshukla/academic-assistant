// services/supabaseStorage.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
// Use the service_role key for backend admin operations to bypass Row Level Security (RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

const BUCKET_NAME = 'filesstorage'; // ⚠️ Change this to your actual Supabase bucket name

export const uploadToSupabase = async (file) => {
  // 1. Create a safe, unique filename
  const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 2. Upload the file buffer to Supabase
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // 3. Get the public URL for the file
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  // 4. Return the exact structure your controller expects
  return {
    url: publicUrlData.publicUrl,
    path: data.path, // This is what you'll pass to deleteFromSupabase
  };
};

export const deleteFromSupabase = async (filePath) => {
  if (!filePath) {
    throw new Error('File path is required for deletion.');
  }

  // Supabase remove() expects an array of paths
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw new Error(`Supabase deletion failed: ${error.message}`);
  }

  return true;
};