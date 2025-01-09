import { promises as fs } from 'fs';

export const getFileAsString = async (filePath: string) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');

    return data;
  } catch (error) {
    throw error;
  }
}
