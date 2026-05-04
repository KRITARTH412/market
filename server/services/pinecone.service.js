import { Pinecone } from '@pinecone-database/pinecone';

// Lazy-load the Pinecone client to ensure env vars are loaded first
let pinecone = null;

const getPineconeClient = () => {
  if (!pinecone) {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT) {
      throw new Error('Missing Pinecone environment variables');
    }

    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });
  }
  return pinecone;
};

const indexName = process.env.PINECONE_INDEX_NAME || 'quickstart';

// Get index
const getIndex = () => {
  const client = getPineconeClient();
  return client.index(indexName);
};

// Upsert vectors
export const upsertVectors = async (organizationId, vectors) => {
  try {
    const index = getIndex();
    const namespace = organizationId.toString();

    // Format vectors for Pinecone
    const formattedVectors = vectors.map((vector, idx) => ({
      id: vector.id || `${organizationId}-${Date.now()}-${idx}`,
      values: vector.embedding,
      metadata: {
        organizationId: organizationId.toString(),
        documentId: vector.documentId?.toString(),
        projectId: vector.projectId?.toString() || null,
        fileName: vector.fileName,
        text: vector.text,
        pageNumber: vector.pageNumber || 0,
        chunkIndex: vector.chunkIndex || idx,
        ...vector.metadata
      }
    }));

    await index.namespace(namespace).upsert(formattedVectors);

    return { success: true, count: formattedVectors.length };
  } catch (error) {
    console.error('Pinecone upsert error:', error);
    throw new Error('Failed to store vectors');
  }
};

// Query vectors
export const queryVectors = async (organizationId, queryEmbedding, topK = 5, filter = {}) => {
  try {
    const index = getIndex();
    const namespace = organizationId.toString();

    const queryFilter = {
      organizationId: organizationId.toString(),
      ...filter
    };

    const queryResponse = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: queryFilter
    });

    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata.documentId,
      projectId: match.metadata.projectId,
      fileName: match.metadata.fileName,
      text: match.metadata.text,
      pageNumber: match.metadata.pageNumber,
      chunkIndex: match.metadata.chunkIndex,
      metadata: match.metadata
    }));
  } catch (error) {
    console.error('Pinecone query error:', error);
    console.error('Index name:', indexName);
    console.error('Organization ID:', organizationId);
    console.error('API Key (first 10 chars):', process.env.PINECONE_API_KEY?.substring(0, 10));
    throw new Error('Failed to query vectors');
  }
};

// Delete vectors by document
export const deleteVectorsByDocument = async (organizationId, documentId) => {
  try {
    const index = getIndex();
    const namespace = organizationId.toString();

    await index.namespace(namespace).deleteMany({
      documentId: documentId.toString()
    });

    return { success: true };
  } catch (error) {
    console.error('Pinecone delete error:', error);
    throw new Error('Failed to delete vectors');
  }
};

// Delete all vectors for organization (use with caution)
export const deleteNamespace = async (organizationId) => {
  try {
    const index = getIndex();
    const namespace = organizationId.toString();

    await index.namespace(namespace).deleteAll();

    return { success: true };
  } catch (error) {
    console.error('Pinecone namespace delete error:', error);
    throw new Error('Failed to delete namespace');
  }
};

// Get namespace stats
export const getNamespaceStats = async (organizationId) => {
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    
    const namespace = organizationId.toString();
    const namespaceStats = stats.namespaces?.[namespace];

    return {
      vectorCount: namespaceStats?.vectorCount || 0,
      dimension: stats.dimension
    };
  } catch (error) {
    console.error('Pinecone stats error:', error);
    return { vectorCount: 0, dimension: 0 };
  }
};
