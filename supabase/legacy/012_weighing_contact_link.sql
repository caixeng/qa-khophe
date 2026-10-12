-- =============================================
-- QA KHOPHE — Migration 012: Gắn phiên cân với đối tác
--
-- Chạy sau 011. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: phiên cân hiện là dữ liệu mồ côi — không biết cân của NCC nào
-- (khi nhập) hay cân cho khách nào (khi xuất), nên không đối chiếu được với
-- phiếu nhập/xuất. Cột `exports.weighing_session_id` đã có sẵn nhưng UI chưa
-- bao giờ cho chọn.
-- =============================================

ALTER TABLE weighing_sessions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

COMMENT ON COLUMN weighing_sessions.contact_id IS
  'Đối tác gắn với phiên cân này (NCC khi cân nhập, khách hàng khi cân xuất). NULL = cân vãng lai, chưa rõ đối tác.';

CREATE INDEX IF NOT EXISTS idx_weighing_sessions_contact ON weighing_sessions(contact_id);
