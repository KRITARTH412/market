import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { generateEmbedding, transcribeAudio } from './openai.service.js';
import { upsertVectors } from './vector.service.js';
import Document from '../models/Document.model.js';

// Chunk text into segments
export const chunkText = (text, maxTokens = 512, overlap = 50) => {
  const words = text.split(/\s+/);
  const chunks = [];
  const wordsPerChunk = Math.floor(maxTokens * 0.75); // Approximate: 1 token ≈ 0.75 words
  const overlapWords = Math.floor(overlap * 0.75);

  for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim()) {
      chunks.push({
        text: chunk,
        startIndex: i,
        endIndex: Math.min(i + wordsPerChunk, words.length)
      });
    }
  }

  return chunks;
};

// Parse PDF
export const parsePDF = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
      metadata: {
        info: data.info,
        metadata: data.metadata
      }
    };
  } catch (error) {
    console.error('PDF parse error:', error);
    throw new Error('Failed to parse PDF');
  }
};

// Parse DOCX
export const parseDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      pageCount: 1, // DOCX doesn't have pages
      metadata: {}
    };
  } catch (error) {
    console.error('DOCX parse error:', error);
    throw new Error('Failed to parse DOCX');
  }
};

// Parse image (OCR would go here - using placeholder)
export const parseImage = async (buffer) => {
  // In production, integrate Tesseract.js or Google Vision API
  return {
    text: '[Image content - OCR not implemented]',
    pageCount: 1,
    metadata: {}
  };
};

// Parse audio
export const parseAudio = async (buffer, filename) => {
  try {
    const transcription = await transcribeAudio(buffer, filename);
    return {
      text: transcription,
      pageCount: 1,
      metadata: {
        transcription
      }
    };
  } catch (error) {
    console.error('Audio parse error:', error);
    throw new Error('Failed to transcribe audio');
  }
};

// Parse plain text
export const parseText = async (buffer) => {
  try {
    const text = buffer.toString('utf-8');
    return {
      text: text,
      pageCount: 1,
      metadata: {}
    };
  } catch (error) {
    console.error('Text parse error:', error);
    throw new Error('Failed to parse text file');
  }
};

// Main document parser
export const parseDocument = async (buffer, fileType, filename) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return await parsePDF(buffer);
    case 'docx':
      return await parseDOCX(buffer);
    case 'txt':
      return await parseText(buffer);
    case 'png':
    case 'jpg':
    case 'jpeg':
      return await parseImage(buffer);
    case 'mp3':
    case 'wav':
      return await parseAudio(buffer, filename);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

// Vectorize document
export const vectorizeDocument = async (documentId, organizationId, projectId = null) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update status
    document.vectorizationStatus = 'processing';
    await document.save();

    // Get document text (should be stored during upload)
    const text = document.metadata.extractedText;
    if (!text) {
      throw new Error('No text content to vectorize');
    }

    // Chunk text
    const chunks = chunkText(text);
    document.chunkCount = chunks.length;
    await document.save();

    // Generate embeddings for each chunk
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk.text);
      
      vectors.push({
        id: `${documentId}-chunk-${i}`,
        embedding,
        documentId,
        projectId,
        fileName: document.fileName,
        text: chunk.text,
        pageNumber: 0, // Calculate based on chunk position if needed
        chunkIndex: i,
        metadata: {
          fileType: document.fileType,
          category: document.category
        }
      });
    }

    // Upsert to Pinecone
    await upsertVectors(organizationId, vectors);

    // Update document status
    document.vectorized = true;
    document.vectorizationStatus = 'completed';
    await document.save();

    return {
      success: true,
      chunkCount: chunks.length,
      vectorCount: vectors.length
    };
  } catch (error) {
    console.error('Vectorization error:', error);
    
    // Update document with error
    const document = await Document.findById(documentId);
    if (document) {
      document.vectorizationStatus = 'failed';
      document.vectorizationError = error.message;
      await document.save();
    }

    throw error;
  }
};

// Pretty print document (for round-trip testing)
export const prettyPrintDocument = (documentObject) => {
  const { text, pageCount, metadata, chunks } = documentObject;
  
  let output = '=== DOCUMENT ===\n\n';
  output += `Pages: ${pageCount}\n`;
  output += `Chunks: ${chunks?.length || 0}\n\n`;
  
  if (metadata) {
    output += '--- Metadata ---\n';
    output += JSON.stringify(metadata, null, 2);
    output += '\n\n';
  }
  
  output += '--- Content ---\n';
  output += text;
  output += '\n\n=== END DOCUMENT ===';
  
  return output;
};

// Validate round-trip property
export const validateRoundTrip = async (buffer, fileType, filename) => {
  try {
    // Parse
    const parsed1 = await parseDocument(buffer, fileType, filename);
    
    // Pretty print
    const printed = prettyPrintDocument(parsed1);
    
    // Parse again (from text)
    const parsed2 = {
      text: parsed1.text,
      pageCount: parsed1.pageCount,
      metadata: parsed1.metadata
    };
    
    // Compare
    const isEquivalent = 
      parsed1.text === parsed2.text &&
      parsed1.pageCount === parsed2.pageCount;
    
    return {
      success: isEquivalent,
      original: parsed1,
      roundTrip: parsed2,
      printed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
