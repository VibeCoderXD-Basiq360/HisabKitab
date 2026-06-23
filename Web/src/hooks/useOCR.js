import { useState } from 'react';
import api from '../lib/api';

export function useOCR() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  async function scan(file) {
    setIsScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/ocr/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Receipt scan failed. Try again.';
      setError(msg);
      return null;
    } finally {
      setIsScanning(false);
    }
  }

  return { scan, isScanning, error, clearError: () => setError(null) };
}
