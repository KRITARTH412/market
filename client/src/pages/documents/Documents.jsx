import { useEffect, useState } from 'react';
import { Upload, FileText, Filter, Download, Trash2, Eye } from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatFileSize } from '../../lib/utils';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import SearchBar from '../../components/SearchBar';
import Card from '../../components/Card';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Select from '../../components/Select';
import Pagination from '../../components/Pagination';
import UploadDocument from './UploadDocument';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, document: null });
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data.documents);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const handleUploadSuccess = (newDocuments) => {
    setDocuments([...newDocuments, ...documents]);
    setShowUploadModal(false);
    toast.success(`${newDocuments.length} document(s) uploaded successfully`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteDialog.document._id}`);
      setDocuments(documents.filter(doc => doc._id !== deleteDialog.document._id));
      toast.success('Document deleted successfully');
      setDeleteDialog({ isOpen: false, document: null });
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await api.get(`/documents/${document._id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(search.toLowerCase());
    const matchesProject = selectedProject === 'all' || doc.projectId?._id === selectedProject;
    const matchesStatus = selectedStatus === 'all' || doc.vectorizationStatus === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your project documents and knowledge base</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} icon={<Upload className="w-5 h-5" />}>
          Upload Documents
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search documents..."
          />
          
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            options={[
              { value: 'all', label: 'All Projects' },
              ...projects.map(p => ({ value: p._id, label: p.name })),
            ]}
          />
          
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
      </Card>

      {/* Documents Table */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No documents found"
          description="Upload documents to build your AI knowledge base"
          action={() => setShowUploadModal(true)}
          actionLabel="Upload Documents"
        />
      ) : (
        <Card padding={false}>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>File Name</Table.Header>
                <Table.Header>Project</Table.Header>
                <Table.Header>Type</Table.Header>
                <Table.Header>Size</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header>Uploaded</Table.Header>
                <Table.Header>Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {paginatedDocuments.map((document) => (
                <Table.Row key={document._id}>
                  <Table.Cell>
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{document.fileName}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    {document.projectId?.name || 'N/A'}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-gray-600 uppercase text-xs">
                      {document.fileType}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {formatFileSize(document.fileSize)}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={document.vectorizationStatus} />
                  </Table.Cell>
                  <Table.Cell>
                    {formatDate(document.uploadedAt)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(document)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, document })}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* Upload Modal */}
      <UploadDocument
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        projects={projects}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, document: null })}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDialog.document?.fileName}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
