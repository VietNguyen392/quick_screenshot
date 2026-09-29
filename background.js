// ===== Context menu =====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "qs-capture",
      title: "📸 Take a screenshot",
      contexts: ["all"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "qs-capture") startCapture(tab);
});

// Click icon trên toolbar hoặc phím tắt Alt+Shift+S cũng mở được
chrome.action.onClicked.addListener((tab) => startCapture(tab));
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "take-screenshot") return;
  const target = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  startCapture(target);
});

// ===== Take screenshot and open selection interface =====
async function startCapture(tab) {
  if (!tab?.id) return;
  try {
    // 1. Chụp trước, để overlay không lọt vào ảnh
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    // 2. Inject giao diện chọn vùng / chỉnh sửa (content.js tự chống inject trùng)
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    // 3. Gửi ảnh sang
    await chrome.tabs.sendMessage(tab.id, { type: "QS_START", dataUrl });
  } catch (err) {
    console.error("[Quick Screenshot] Cannot capture this page:", err);
  }
}

// ===== Download image when user clicks "Download" =====
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "QS_DOWNLOAD") return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  chrome.downloads.download({
    url: msg.dataUrl,
    filename: `screenshots/screenshot-${stamp}.png`,
    saveAs: false
  });
});
