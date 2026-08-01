import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-50 rounded-full">
            <FileQuestion className="h-16 w-16 text-gray-400" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Trang không tồn tại</h2>
        <p className="text-gray-500 mb-8">
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white font-medium py-2.5 px-6 rounded-md transition-colors w-full"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
