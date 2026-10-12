import { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';
import { useAsyncData } from '../hooks/useAsyncData';
import { DataState } from './DataState';
import { useToast } from '../contexts/toast';

export function BusinessSettings() {
  const { toast } = useToast();
  const { data, loading, error, refetch } = useAsyncData(async () => {
    const [loss, overtime, rawOpen] = await Promise.all([
      settingsService.getLossWarning(),
      settingsService.getOvertimeMultiplier(),
      settingsService.getRawOpeningStock(),
    ]);
    return { loss, overtime, rawOpen };
  }, []);
  const [rawOpen, setRawOpen] = useState('');
  const [loss, setLoss] = useState('');
  const [overtime, setOvertime] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) {
      setRawOpen(String(data.rawOpen));
      setLoss(String(data.loss));
      setOvertime(String(data.overtime));
    }
  }, [data]);
  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-bold text-sm">Cấu hình hao hụt và tăng ca</h2>
      <DataState loading={loading} error={error} onRetry={refetch}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            setSaving(true);
            try {
              await settingsService.setBusinessSettings(Number(loss), Number(overtime), Number(rawOpen));
              toast.success('Đã lưu cấu hình nghiệp vụ');
              void refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Không lưu được cấu hình');
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="text-xs space-y-1">
            Ngưỡng cảnh báo hao hụt xay (%)
            <input
              aria-label="Ngưỡng hao hụt"
              className="input-field"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
            />
          </label>
          <label className="text-xs space-y-1">
            Hệ số tăng ca mặc định
            <input
              aria-label="Hệ số tăng ca mặc định"
              className="input-field"
              type="number"
              min="1"
              max="5"
              step="0.01"
              required
              value={overtime}
              onChange={(e) => setOvertime(e.target.value)}
            />
          </label>
          <label className="text-xs space-y-1 sm:col-span-2">
            Tồn nguyên liệu đầu kỳ (kg)
            <input
              aria-label="Tồn nguyên liệu đầu kỳ"
              className="input-field"
              type="number"
              min="0"
              step="0.01"
              required
              value={rawOpen}
              onChange={(e) => setRawOpen(e.target.value)}
            />
          </label>
          <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
            Hệ số 1,5 tương ứng 150%. Chỉ dùng mặc định cho lượt chấm công mới; hệ số đã lưu trên mỗi lượt
            công được giữ nguyên.
          </p>
          <button className="btn-primary" disabled={saving || !data}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </form>
      </DataState>
    </section>
  );
}
