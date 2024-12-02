document.getElementById("saveBtn").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  if (apiKey) {
    // APIキーをChromeのストレージに保存
    chrome.storage.sync.set({ apiKey: apiKey }, () => {
      alert("APIキーが保存されました！");
    });
  } else {
    alert("有効なAPIキーを入力してください。");
  }
});

// ページ読み込み時に保存されたAPIキーを取得して表示
window.onload = () => {
  chrome.storage.sync.get("apiKey", (data) => {
    if (data.apiKey) {
      document.getElementById("apiKey").value = data.apiKey;
    }
  });
};
