import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  File,
  RefreshCw,
  Wifi,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";


export default function FileSharing() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      setConnected(response.ok);
      if (response.ok) setError(null);
      return response.ok;
    } catch (err) {
      setConnected(false);
      setError('Cannot connect to server. Make sure backend is running.');
      return false;
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/files`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (await checkConnection()) fetchFiles();
    };
    init();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          showSuccess(`"${file.name}" uploaded!`);
          fetchFiles();
          setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
          }, 1000);
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error');
      });

      xhr.open('POST', `${API_URL}/upload`);
      xhr.send(formData);
    } catch (err) {
      setError('Failed to upload file');
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (filename, originalname) => {
    try {
      const response = await fetch(`${API_URL}/download/${filename}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalname;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Downloading "${originalname}"`);
    } catch (err) {
      setError('Failed to download');
    }
  };

  const handleDelete = async (filename, originalname) => {
    if (!confirm(`Delete "${originalname}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/files/${filename}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      showSuccess(`"${originalname}" deleted!`);
      fetchFiles();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 60000);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Wifi className="w-5 h-5" />
            Local Network File Share
          </CardTitle>
          <CardDescription>
            Share files with colleagues on the same network
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <CheckCircle className="text-green-500 w-5 h-5" />
            ) : (
              <AlertCircle className="text-red-500 w-5 h-5" />
            )}
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="bg-green-100 text-green-700 p-2 rounded-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {successMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-2 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Upload Section */}
          <div className="flex gap-2">
            <input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              disabled={uploading || !connected}
              className="flex-1"
              size="lg"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Select & Upload'}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                checkConnection();
                fetchFiles();
              }}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div>Uploading... {uploadProgress}%</div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Files Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Shared Files ({files.length})
            </h3>

            {loading ? (
              <p>Loading...</p>
            ) : files.length === 0 ? (
              <p className="text-gray-500">No files yet. Upload to get started.</p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center justify-between border p-3 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{file.originalname}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {formatDate(file.uploadDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(file.filename, file.originalname)
                        }
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleDelete(file.filename, file.originalname)
                        }
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-400 text-center mt-4">
            Share: <span className="text-blue-500">{window.location.href}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
