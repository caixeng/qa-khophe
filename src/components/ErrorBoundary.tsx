import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logError } from '../lib/errorLog';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Cập nhật state để lần render tiếp theo sẽ hiển thị fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dòng đầu của componentStack là component gần nhất đã ném lỗi — đủ để
    // biết bắt đầu tìm từ đâu mà không phải lưu cả cây stack.
    const culprit = errorInfo.componentStack?.trim().split('\n')[0]?.trim();
    logError(error, `render: ${culprit || 'không rõ component'}`);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="screen-min-height safe-screen-padding bg-[var(--bg-app)] flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-gray-100">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Đã xảy ra lỗi</h1>
            <p className="text-gray-500 mb-6">
              Chúng tôi rất tiếc, đã có sự cố không mong muốn xảy ra. Vui lòng tải lại trang để thử lại.
            </p>
            <button
              onClick={this.handleReload}
              className="bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white font-medium py-2.5 px-6 rounded-md transition-colors w-full"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
