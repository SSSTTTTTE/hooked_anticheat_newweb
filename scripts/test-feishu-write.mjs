const endpoint = process.env.RESERVATION_API_URL || "http://localhost:5173/api/reservations";

const payload = {
  time: formatToday(),
  wechatName: `Codex写入测试-${Date.now()}`,
  wechatId: "codex_feishu_write_test",
  storeName: "自动化测试",
  isEmployed: "否",
  note: "预约服务弹窗接入测试记录，可按需删除。",
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const body = await response.json().catch(() => ({}));

if (!response.ok || !body.ok) {
  console.error("Feishu write test failed:", {
    status: response.status,
    body,
  });
  process.exit(1);
}

console.log("Feishu write test passed:", {
  recordId: body.recordId,
  wechatName: payload.wechatName,
});

function formatToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}
